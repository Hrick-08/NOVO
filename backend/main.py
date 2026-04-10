from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "sqlite:///./payscan.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class PaymentLog(Base):
    __tablename__ = "payment_logs"
    txn_ref = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    merchant_upi = Column(String, nullable=False)
    merchant_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    upi_txn_id = Column(String, nullable=True)
    status = Column(String, default="pending")
    verified_manually = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


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


# class QRParseRequest(BaseModel):
#     image: str


# class QRParseRequest(BaseModel):
#     image: str


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