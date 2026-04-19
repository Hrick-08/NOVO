"""
FastAPI Payment Application with modular structure.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List
from sqlalchemy.orm import Session
from fastapi import Depends, Header, HTTPException
from datetime import datetime
from quiz import score_to_profile
from portfolio import build_portfolio

from db import engine, Base, SessionLocal
from db.seed import seed_demo_data
from models import User, PaymentLog
from routers import (
    auth_router,
    profile_router,
    payments_router,
    collections_router,
    purchases_router,
    qr_router,
)
from routers.community import router as community_router
from routers.test import router as test_router
from agent import InvestingAgent

load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Payment App API",
    description="Nova Coins - Payment and Rewards System",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all database tables
Base.metadata.create_all(bind=engine)

# Seed demo data on startup
with SessionLocal() as seed_session:
    seed_demo_data(seed_session)

# Include routers
app.include_router(test_router)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(payments_router)
app.include_router(collections_router)
app.include_router(purchases_router)
app.include_router(community_router)
# app.include_router(qr_router)

# Serve static files
static_path = os.path.join(os.path.dirname(__file__), 'static')
if os.path.exists(static_path):
    app.mount('/static', StaticFiles(directory=static_path), name='static')

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class RegisterRequest(BaseModel):
    name: str
    email: str


class PaymentLogRequest(BaseModel):
    txn_ref: str
    pa: str
    pn: str
    amount: float
    status: str = "pending"


class VerifyRequest(BaseModel):
    txn_ref: str
    txn_id: str


class StatusUpdateRequest(BaseModel):
    status: str


class PaymentSummary(BaseModel):
    total_spent_this_month: float
    recent_merchants: List[dict]


@app.post("/auth/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        return {"user_id": existing.id, "name": existing.name}
    user = User(name=request.name, email=request.email)
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.id, "name": user.name}


@app.get("/auth/me")
def get_me(x_user_id: int = Header(alias="X-User-Id"), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "created_at": user.created_at,
    }


@app.post("/payments/log")
def log_payment(
    request: PaymentLogRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(PaymentLog).filter(PaymentLog.txn_ref == request.txn_ref).first()
    )
    if existing:
        return {"message": "Payment already logged"}
    payment = PaymentLog(
        txn_ref=request.txn_ref,
        user_id=x_user_id,
        merchant_upi=request.pa,
        merchant_name=request.pn,
        amount=request.amount,
        status=request.status,
    )
    db.add(payment)
    db.commit()
    return {"message": "Payment logged", "txn_ref": request.txn_ref}


@app.post("/payments/verify")
def verify_payment(
    request: VerifyRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    payment = db.query(PaymentLog).filter(PaymentLog.txn_ref == request.txn_ref).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.status = "completed"
    payment.upi_txn_id = request.txn_id
    db.commit()
    return {"verified": True}


@app.patch("/payments/status/{txn_ref}")
def update_status(
    txn_ref: str,
    request: StatusUpdateRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    payment = db.query(PaymentLog).filter(PaymentLog.txn_ref == txn_ref).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.status = request.status
    db.commit()
    return {"status": payment.status}


@app.get("/payments/status/{txn_ref}")
def get_status(
    txn_ref: str,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    payment = db.query(PaymentLog).filter(PaymentLog.txn_ref == txn_ref).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"status": payment.status}


@app.get("/payments/history")
def get_history(
    x_user_id: int = Header(alias="X-User-Id"), db: Session = Depends(get_db)
):
    payments = (
        db.query(PaymentLog)
        .filter(PaymentLog.user_id == x_user_id)
        .order_by(PaymentLog.created_at.desc())
        .all()
    )
    return [
        {
            "txn_ref": p.txn_ref,
            "merchant_name": p.merchant_name,
            "merchant_upi": p.merchant_upi,
            "amount": p.amount,
            "status": p.status,
            "created_at": p.created_at.isoformat(),
        }
        for p in payments
    ]


@app.get("/payments/summary")
def get_summary(
    x_user_id: int = Header(alias="X-User-Id"), db: Session = Depends(get_db)
):
    now = datetime.utcnow()
    start_of_month = datetime(now.year, now.month, 1)

    monthly_payments = (
        db.query(PaymentLog)
        .filter(
            PaymentLog.user_id == x_user_id,
            PaymentLog.created_at >= start_of_month,
            PaymentLog.status == "completed",
        )
        .all()
    )

    total_spent = sum(p.amount for p in monthly_payments)

    recent = (
        db.query(PaymentLog)
        .filter(PaymentLog.user_id == x_user_id)
        .order_by(PaymentLog.created_at.desc())
        .all()
    )

    merchant_map = {}
    for p in recent:
        if p.merchant_upi not in merchant_map:
            merchant_map[p.merchant_upi] = {
                "merchant_name": p.merchant_name,
                "merchant_upi": p.merchant_upi,
                "last_used": p.created_at.isoformat(),
            }
        if len(merchant_map) >= 3:
            break

    recent_merchants = list(merchant_map.values())

    return {"total_spent_this_month": total_spent, "recent_merchants": recent_merchants}


class QRParseRequest(BaseModel):
    image: str


class QRParseRequest(BaseModel):
    image: str


from fastapi import UploadFile, File, HTTPException
import io
from PIL import Image
from pyzbar.pyzbar import decode

@app.post("/qr/parse")
async def parse_qr(file: UploadFile = File(...)):
    image_data = await file.read()

    try:
        image = Image.open(io.BytesIO(image_data))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    decoded_objects = decode(image)

    if not decoded_objects:
        raise HTTPException(status_code=400, detail="No QR code found")

    qr_data = decoded_objects[0].data.decode("utf-8")

    if not qr_data.startswith("upi://"):
        raise HTTPException(status_code=400, detail="Not a valid UPI QR code")

    query = qr_data.split("?", 1)[1] if "?" in qr_data else ""
    params = {}
    for pair in query.split("&"):
        if "=" in pair:
            key, value = pair.split("=", 1)
            params[key] = value

    return {
        "pa": params.get("pa", ""),
        "pn": params.get("pn", ""),
        "am": params.get("am", ""),
        "tn": params.get("tn", ""),
    }

agents: dict[str, InvestingAgent] = {}



class QuizAnswers(BaseModel):
    answers: dict[str, str]   # {"q1": "b", "q2": "a", ...}

class InvestRequest(BaseModel):
    profile_name: str
    total_score:  int
    answers:      dict
    amount:       float
    session_id:   str

class ChatRequest(BaseModel):
    session_id: str
    message:    str

class ResetRequest(BaseModel):
    session_id: str


@app.post("/quiz/score")
def score_quiz(body: QuizAnswers):
    """
    Takes raw quiz answers, returns risk profile.
    Scoring happens server-side — frontend just sends choices.
    """
    from quiz import QUESTIONS

    total = 0
    for q in QUESTIONS:
        q_id   = q["id"]
        choice = body.answers.get(q_id)
        matched = next(
            (score for key, _, score in q["options"] if key == choice),
            None
        )
        if matched is None:
            raise HTTPException(400, f"Invalid answer for {q_id}: '{choice}'")
        total += matched

    profile = score_to_profile(total)
    profile["total_score"] = total
    profile["answers"]     = body.answers
    return profile


@app.post("/portfolio/build")
def build(body: InvestRequest):
    """
    Build portfolio from profile + amount.
    Also initialises the agent for this session with portfolio context.
    """
    profile = {
        "profile":     body.profile_name,
        "total_score": body.total_score,
        "answers":     body.answers,
        **_pct_from_profile(body.profile_name),
    }
    print(profile)

    result = build_portfolio(profile, investment_amount=body.amount)

    # Boot agent with portfolio context for this session
    agents[body.session_id] = InvestingAgent()

    return result


@app.post("/agent/chat")
def chat(body: ChatRequest):
    """Send a message to the agent. Session must exist (call /portfolio/build first)."""
    agent = agents.get(body.session_id)
    if not agent:
        raise HTTPException(
            404,
            "Session not found. Please build a portfolio first."
        )
    reply = agent.chat(body.message)
    return {"reply": reply}


@app.post("/agent/reset")
def reset(body: ResetRequest):
    """Clear conversation history for a session."""
    agent = agents.get(body.session_id)
    if agent:
        agent.reset()
    return {"status": "reset"}


@app.post("/simulate")
def simulate(amount: float, risk_level: str, horizon_days: int = 252):
    """Standalone Monte Carlo endpoint — used by the ₹X simulator."""
    from agent import handle_simulate_investment
    import json
    result = handle_simulate_investment(amount, risk_level, horizon_days)
    return json.loads(result)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _pct_from_profile(name: str) -> dict:
    MAP = {
        "Conservative": {"equity_pct": 20, "debt_pct": 60, "gold_pct": 20},
        "Balanced":     {"equity_pct": 50, "debt_pct": 35, "gold_pct": 15},
        "Growth":       {"equity_pct": 70, "debt_pct": 20, "gold_pct": 10},
        "Aggressive":   {"equity_pct": 90, "debt_pct":  5, "gold_pct":  5},
    }
    return MAP.get(name, MAP["Balanced"])