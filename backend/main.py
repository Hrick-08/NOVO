from fastapi import FastAPI, HTTPException, Header, Depends, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    ForeignKey,
    Text,
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
import razorpay
import hmac
import hashlib
import os
import uuid
import io
from PIL import Image
from pyzbar.pyzbar import decode
from dotenv import load_dotenv

from sqlalchemy.pool import StaticPool
load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "sqlite:///./payscan.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={
        "check_same_thread": False,
        "timeout": 30,
    },
    poolclass=StaticPool,
)

def _fk_pragma_on_connect(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")
    cursor.execute("PRAGMA cache_size=10000;")
    cursor.execute("PRAGMA temp_store=MEMORY;")
    cursor.close()

from sqlalchemy import event
event.listen(engine, "connect", _fk_pragma_on_connect)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, expire_on_commit=False)
Base = declarative_base()


# ---------------------------------------------------------------------------
# Test endpoints
# ---------------------------------------------------------------------------
@app.get("/test")
def test():
    print("[DEBUG] Test endpoint called")
    return {"status": "ok", "message": "Backend is running"}


@app.post("/test-post")
def test_post():
    print("[DEBUG] Test POST endpoint called")
    return {"status": "ok", "message": "POST is working"}

razorpay_client = razorpay.Client(auth=(
    os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder"),
    os.getenv("RAZORPAY_KEY_SECRET", "placeholder_secret"),
))


# ---------------------------------------------------------------------------
# DB Models
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    nova_coins = Column(Integer, default=0)
    phone = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class PaymentLog(Base):
    __tablename__ = "payment_logs"
    txn_ref = Column(String, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    merchant_upi = Column(String, nullable=False)
    merchant_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    upi_txn_id = Column(String, nullable=True)
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    status = Column(String, default="pending")
    coins_earned = Column(Integer, default=0)
    verified_manually = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# New: Collections Models
# ---------------------------------------------------------------------------

class MerchItem(Base):
    """Our own merchandise redeemable with Nova Coins."""
    __tablename__ = "merch_items"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    coin_price = Column(Integer, nullable=False)          # coins needed to redeem
    stock = Column(Integer, default=0)                   # -1 = unlimited
    category = Column(String, nullable=True)             # e.g. "apparel", "accessories"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AmazonCoupon(Base):
    """Amazon coupons / gift cards redeemable with Nova Coins."""
    __tablename__ = "amazon_coupons"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)               # e.g. "₹100 Amazon Gift Card"
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    coin_price = Column(Integer, nullable=False)
    face_value = Column(Float, nullable=False)           # INR value of the coupon
    coupon_code = Column(String, nullable=True)          # pre-loaded code (for static ones)
    stock = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class FlipkartCoupon(Base):
    """Flipkart coupons / gift cards redeemable with Nova Coins."""
    __tablename__ = "flipkart_coupons"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    coin_price = Column(Integer, nullable=False)
    face_value = Column(Float, nullable=False)
    coupon_code = Column(String, nullable=True)
    stock = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Purchase(Base):
    """Records every redemption — what was bought, by whom, coins deducted."""
    __tablename__ = "purchases"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item_type = Column(String, nullable=False)           # "merch" | "amazon" | "flipkart"
    item_id = Column(Integer, nullable=False)
    item_name = Column(String, nullable=False)           # snapshot of name at purchase time
    coins_spent = Column(Integer, nullable=False)
    status = Column(String, default="confirmed")         # confirmed | shipped | delivered | cancelled
    delivery_address = Column(Text, nullable=True)       # for merch items
    coupon_code_issued = Column(String, nullable=True)   # for coupons
    created_at = Column(DateTime, default=datetime.utcnow)


Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Seed demo data (runs once on startup)
# ---------------------------------------------------------------------------

def _seed_demo_data(db: Session):
    # Only seed if tables are empty
    if db.query(MerchItem).count() == 0:
        demo_merch = [
            MerchItem(
                name="Nova T-Shirt",
                description="Premium cotton tee with the Nova logo. Available in S/M/L/XL.",
                image_url="https://placehold.co/400x400?text=Nova+Tshirt",
                coin_price=500,
                stock=100,
                category="apparel",
            ),
            MerchItem(
                name="Nova Cap",
                description="Embroidered snapback cap in black.",
                image_url="https://placehold.co/400x400?text=Nova+Cap",
                coin_price=300,
                stock=50,
                category="accessories",
            ),
            MerchItem(
                name="Nova Tote Bag",
                description="Eco-friendly canvas tote with Nova branding.",
                image_url="https://placehold.co/400x400?text=Nova+Tote",
                coin_price=200,
                stock=75,
                category="accessories",
            ),
            MerchItem(
                name="Nova Hoodie",
                description="Unisex fleece hoodie — stay cozy and branded.",
                image_url="https://placehold.co/400x400?text=Nova+Hoodie",
                coin_price=800,
                stock=30,
                category="apparel",
            ),
            MerchItem(
                name="Nova Sticker Pack",
                description="Set of 10 high-quality vinyl stickers.",
                image_url="https://placehold.co/400x400?text=Nova+Stickers",
                coin_price=50,
                stock=-1,   # unlimited
                category="accessories",
            ),
        ]
        db.add_all(demo_merch)

    if db.query(AmazonCoupon).count() == 0:
        demo_amazon = [
            AmazonCoupon(
                title="₹100 Amazon Gift Card",
                description="Redeemable on Amazon.in for any product.",
                image_url="https://placehold.co/400x400?text=Amazon+100",
                coin_price=150,
                face_value=100.0,
                stock=200,
                expires_at=datetime(2025, 12, 31),
            ),
            AmazonCoupon(
                title="₹250 Amazon Gift Card",
                description="Redeemable on Amazon.in for any product.",
                image_url="https://placehold.co/400x400?text=Amazon+250",
                coin_price=350,
                face_value=250.0,
                stock=100,
                expires_at=datetime(2025, 12, 31),
            ),
            AmazonCoupon(
                title="₹500 Amazon Gift Card",
                description="Great for shopping electronics, books, and more.",
                image_url="https://placehold.co/400x400?text=Amazon+500",
                coin_price=650,
                face_value=500.0,
                stock=50,
                expires_at=datetime(2025, 12, 31),
            ),
            AmazonCoupon(
                title="₹1000 Amazon Gift Card",
                description="Maximum value gift card for big purchases.",
                image_url="https://placehold.co/400x400?text=Amazon+1000",
                coin_price=1200,
                face_value=1000.0,
                stock=20,
                expires_at=datetime(2025, 12, 31),
            ),
        ]
        db.add_all(demo_amazon)

    if db.query(FlipkartCoupon).count() == 0:
        demo_flipkart = [
            FlipkartCoupon(
                title="₹100 Flipkart Gift Card",
                description="Redeemable on Flipkart for any category.",
                image_url="https://placehold.co/400x400?text=Flipkart+100",
                coin_price=140,
                face_value=100.0,
                stock=200,
                expires_at=datetime(2025, 12, 31),
            ),
            FlipkartCoupon(
                title="₹250 Flipkart Gift Card",
                description="Shop fashion, electronics, and more.",
                image_url="https://placehold.co/400x400?text=Flipkart+250",
                coin_price=330,
                face_value=250.0,
                stock=100,
                expires_at=datetime(2025, 12, 31),
            ),
            FlipkartCoupon(
                title="₹500 Flipkart Gift Card",
                description="Perfect for your next big Flipkart order.",
                image_url="https://placehold.co/400x400?text=Flipkart+500",
                coin_price=620,
                face_value=500.0,
                stock=50,
                expires_at=datetime(2025, 12, 31),
            ),
            FlipkartCoupon(
                title="Flipkart Plus 10% Off Coupon",
                description="Flat 10% off on your next Flipkart purchase (max ₹200 off).",
                image_url="https://placehold.co/400x400?text=FK+10pct",
                coin_price=100,
                face_value=200.0,
                stock=500,
                expires_at=datetime(2025, 9, 30),
            ),
        ]
        db.add_all(demo_flipkart)

    db.commit()


# Seed on startup
with SessionLocal() as _seed_session:
    _seed_demo_data(_seed_session)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    name: str
    email: str

class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None

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

class CreateOrderRequest(BaseModel):
    amount: float
    merchant_name: str
    merchant_upi: str

class VerifyRazorpayRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    txn_ref: str
    test_mode: bool = False

class PurchaseRequest(BaseModel):
    item_type: str          # "merch" | "amazon" | "flipkart"
    item_id: int
    delivery_address: Optional[str] = None   # required for merch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_streak_multiplier(user_id: int, db: Session) -> float:
    cutoff = datetime.utcnow() - timedelta(days=30)
    count = (
        db.query(PaymentLog)
        .filter(
            PaymentLog.user_id == user_id,
            PaymentLog.status == "completed",
            PaymentLog.created_at >= cutoff,
        )
        .count()
    )
    if count >= 20:
        return 2.0
    elif count >= 10:
        return 1.5
    return 1.0


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

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


@app.post("/auth/logout")
def logout():
    return {"message": "Logged out successfully"}


@app.get("/auth/me")
def get_me(x_user_id: int = Header(alias="X-User-Id"), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "nova_coins": user.nova_coins,
        "created_at": user.created_at,
    }


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@app.get("/profile")
def get_profile(x_user_id: int = Header(alias="X-User-Id"), db: Session = Depends(get_db)):
    """Full profile with stats: coins, total spent, total transactions."""
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    completed_payments = (
        db.query(PaymentLog)
        .filter(PaymentLog.user_id == x_user_id, PaymentLog.status == "completed")
        .all()
    )
    total_spent = sum(p.amount for p in completed_payments)
    total_coins_earned = sum(p.coins_earned for p in completed_payments)
    total_txns = len(completed_payments)

    purchases = (
        db.query(Purchase)
        .filter(Purchase.user_id == x_user_id)
        .order_by(Purchase.created_at.desc())
        .limit(5)
        .all()
    )

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "nova_coins": user.nova_coins,
        "member_since": user.created_at.isoformat(),
        "stats": {
            "total_spent_inr": round(total_spent, 2),
            "total_coins_earned": total_coins_earned,
            "total_transactions": total_txns,
        },
        "recent_redemptions": [
            {
                "id": p.id,
                "item_type": p.item_type,
                "item_name": p.item_name,
                "coins_spent": p.coins_spent,
                "status": p.status,
                "created_at": p.created_at.isoformat(),
            }
            for p in purchases
        ],
    }


@app.patch("/profile")
def update_profile(
    request: UpdateProfileRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Update name, phone, or avatar_url."""
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if request.name is not None:
        user.name = request.name
    if request.phone is not None:
        user.phone = request.phone
    if request.avatar_url is not None:
        user.avatar_url = request.avatar_url

    db.commit()
    db.refresh(user)
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "avatar_url": user.avatar_url,
        "nova_coins": user.nova_coins,
    }


# ---------------------------------------------------------------------------
# Collections — Merch
# ---------------------------------------------------------------------------

@app.get("/collections/merch")
def list_merch(db: Session = Depends(get_db)):
    """List all active merch items."""
    items = db.query(MerchItem).filter(MerchItem.is_active == True).all()
    return [
        {
            "id": item.id,
            "name": item.name,
            "description": item.description,
            "image_url": item.image_url,
            "coin_price": item.coin_price,
            "stock": item.stock,
            "category": item.category,
        }
        for item in items
    ]


@app.get("/collections/merch/{item_id}")
def get_merch_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(MerchItem).filter(MerchItem.id == item_id, MerchItem.is_active == True).first()
    if not item:
        raise HTTPException(status_code=404, detail="Merch item not found")
    return {
        "id": item.id,
        "name": item.name,
        "description": item.description,
        "image_url": item.image_url,
        "coin_price": item.coin_price,
        "stock": item.stock,
        "category": item.category,
        "created_at": item.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Collections — Amazon Coupons
# ---------------------------------------------------------------------------

@app.get("/collections/amazon")
def list_amazon_coupons(db: Session = Depends(get_db)):
    items = db.query(AmazonCoupon).filter(AmazonCoupon.is_active == True).all()
    return [
        {
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "image_url": item.image_url,
            "coin_price": item.coin_price,
            "face_value": item.face_value,
            "stock": item.stock,
            "expires_at": item.expires_at.isoformat() if item.expires_at else None,
        }
        for item in items
    ]


@app.get("/collections/amazon/{item_id}")
def get_amazon_coupon(item_id: int, db: Session = Depends(get_db)):
    item = db.query(AmazonCoupon).filter(AmazonCoupon.id == item_id, AmazonCoupon.is_active == True).first()
    if not item:
        raise HTTPException(status_code=404, detail="Amazon coupon not found")
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "image_url": item.image_url,
        "coin_price": item.coin_price,
        "face_value": item.face_value,
        "stock": item.stock,
        "expires_at": item.expires_at.isoformat() if item.expires_at else None,
    }


# ---------------------------------------------------------------------------
# Collections — Flipkart Coupons
# ---------------------------------------------------------------------------

@app.get("/collections/flipkart")
def list_flipkart_coupons(db: Session = Depends(get_db)):
    items = db.query(FlipkartCoupon).filter(FlipkartCoupon.is_active == True).all()
    return [
        {
            "id": item.id,
            "title": item.title,
            "description": item.description,
            "image_url": item.image_url,
            "coin_price": item.coin_price,
            "face_value": item.face_value,
            "stock": item.stock,
            "expires_at": item.expires_at.isoformat() if item.expires_at else None,
        }
        for item in items
    ]


@app.get("/collections/flipkart/{item_id}")
def get_flipkart_coupon(item_id: int, db: Session = Depends(get_db)):
    item = db.query(FlipkartCoupon).filter(FlipkartCoupon.id == item_id, FlipkartCoupon.is_active == True).first()
    if not item:
        raise HTTPException(status_code=404, detail="Flipkart coupon not found")
    return {
        "id": item.id,
        "title": item.title,
        "description": item.description,
        "image_url": item.image_url,
        "coin_price": item.coin_price,
        "face_value": item.face_value,
        "stock": item.stock,
        "expires_at": item.expires_at.isoformat() if item.expires_at else None,
    }


# ---------------------------------------------------------------------------
# Purchase / Redeem
# ---------------------------------------------------------------------------

@app.post("/purchase")
def purchase_item(
    request: PurchaseRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """
    Redeem Nova Coins for merch, Amazon coupons, or Flipkart coupons.
    Deducts coins from the user's balance and records the purchase.
    """
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    item_type = request.item_type.lower()
    if item_type not in ("merch", "amazon", "flipkart"):
        raise HTTPException(status_code=400, detail="item_type must be 'merch', 'amazon', or 'flipkart'")

    # --- Resolve the item ---
    coin_price = 0
    item_name = ""
    coupon_code_issued = None

    if item_type == "merch":
        item = db.query(MerchItem).filter(MerchItem.id == request.item_id, MerchItem.is_active == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="Merch item not found")
        if item.stock == 0:
            raise HTTPException(status_code=400, detail="Item out of stock")
        if request.delivery_address is None:
            raise HTTPException(status_code=400, detail="delivery_address is required for merch items")
        coin_price = item.coin_price
        item_name = item.name
        # Decrement stock (unless unlimited)
        if item.stock > 0:
            item.stock -= 1

    elif item_type == "amazon":
        item = db.query(AmazonCoupon).filter(AmazonCoupon.id == request.item_id, AmazonCoupon.is_active == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="Amazon coupon not found")
        if item.stock == 0:
            raise HTTPException(status_code=400, detail="Coupon out of stock")
        if item.expires_at and item.expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Coupon has expired")
        coin_price = item.coin_price
        item_name = item.title
        coupon_code_issued = item.coupon_code or f"AMZ-{uuid.uuid4().hex[:10].upper()}"
        if item.stock > 0:
            item.stock -= 1

    elif item_type == "flipkart":
        item = db.query(FlipkartCoupon).filter(FlipkartCoupon.id == request.item_id, FlipkartCoupon.is_active == True).first()
        if not item:
            raise HTTPException(status_code=404, detail="Flipkart coupon not found")
        if item.stock == 0:
            raise HTTPException(status_code=400, detail="Coupon out of stock")
        if item.expires_at and item.expires_at < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Coupon has expired")
        coin_price = item.coin_price
        item_name = item.title
        coupon_code_issued = item.coupon_code or f"FK-{uuid.uuid4().hex[:10].upper()}"
        if item.stock > 0:
            item.stock -= 1

    # --- Check balance ---
    if user.nova_coins < coin_price:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient Nova Coins. You have {user.nova_coins}, need {coin_price}.",
        )

    # --- Deduct coins ---
    user.nova_coins -= coin_price

    # --- Record purchase ---
    purchase = Purchase(
        user_id=x_user_id,
        item_type=item_type,
        item_id=request.item_id,
        item_name=item_name,
        coins_spent=coin_price,
        status="confirmed",
        delivery_address=request.delivery_address,
        coupon_code_issued=coupon_code_issued,
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    response = {
        "purchase_id": purchase.id,
        "item_type": item_type,
        "item_name": item_name,
        "coins_spent": coin_price,
        "remaining_coins": user.nova_coins,
        "status": purchase.status,
        "created_at": purchase.created_at.isoformat(),
    }
    if coupon_code_issued:
        response["coupon_code"] = coupon_code_issued

    return response


@app.get("/purchase/history")
def purchase_history(
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """All purchases made by the user, newest first."""
    purchases = (
        db.query(Purchase)
        .filter(Purchase.user_id == x_user_id)
        .order_by(Purchase.created_at.desc())
        .all()
    )
    return [
        {
            "purchase_id": p.id,
            "item_type": p.item_type,
            "item_id": p.item_id,
            "item_name": p.item_name,
            "coins_spent": p.coins_spent,
            "status": p.status,
            "coupon_code": p.coupon_code_issued,
            "delivery_address": p.delivery_address,
            "created_at": p.created_at.isoformat(),
        }
        for p in purchases
    ]


@app.get("/purchase/{purchase_id}")
def get_purchase(
    purchase_id: int,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Get a single purchase by ID (must belong to the requesting user)."""
    purchase = db.query(Purchase).filter(
        Purchase.id == purchase_id,
        Purchase.user_id == x_user_id,
    ).first()
    if not purchase:
        raise HTTPException(status_code=404, detail="Purchase not found")
    return {
        "purchase_id": purchase.id,
        "item_type": purchase.item_type,
        "item_id": purchase.item_id,
        "item_name": purchase.item_name,
        "coins_spent": purchase.coins_spent,
        "status": purchase.status,
        "coupon_code": purchase.coupon_code_issued,
        "delivery_address": purchase.delivery_address,
        "created_at": purchase.created_at.isoformat(),
    }


# ---------------------------------------------------------------------------
# Razorpay Payments
# ---------------------------------------------------------------------------

@app.post("/payments/create-order")
def create_order(
    request: CreateOrderRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    print(f"[DEBUG] Creating order: user_id={x_user_id}, amount={request.amount}")

    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        print(f"[DEBUG] User not found: {x_user_id}")
        raise HTTPException(status_code=404, detail="User not found")

    txn_ref = f"novo_{uuid.uuid4().hex[:12]}"
    print(f"[DEBUG] Generated txn_ref={txn_ref}")

    try:
        order = razorpay_client.order.create({
            "amount": int(request.amount * 100),
            "currency": "INR",
            "receipt": txn_ref,
            "notes": {
                "merchant_upi": request.merchant_upi,
                "merchant_name": request.merchant_name,
                "user_id": str(x_user_id),
            },
        })
        print(f"[DEBUG] Razorpay order created: {order['id']}")
    except Exception as e:
        print(f"[DEBUG] Razorpay error: {str(e)}")
        order = {
            "id": f"order_test_{uuid.uuid4().hex[:12]}",
            "amount": int(request.amount * 100),
        }

    payment = PaymentLog(
        txn_ref=txn_ref,
        user_id=x_user_id,
        merchant_upi=request.merchant_upi,
        merchant_name=request.merchant_name,
        amount=request.amount,
        razorpay_order_id=order["id"],
        status="pending",
    )
    db.add(payment)
    db.commit()
    print(f"[DEBUG] Payment saved to DB: {txn_ref}")

    return {
        "order_id": order["id"],
        "txn_ref": txn_ref,
        "amount": order["amount"],
        "key": os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder"),
    }


@app.post("/payments/verify-razorpay")
def verify_razorpay(
    request: VerifyRazorpayRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    print(f"[DEBUG] ========== VERIFY START ==========")
    print(f"[DEBUG] Verify payment: txn_ref={request.txn_ref}, user_id={x_user_id}, test_mode={request.test_mode}")

    try:
        if not request.test_mode:
            print(f"[DEBUG] Checking signature...")
            message = f"{request.razorpay_order_id}|{request.razorpay_payment_id}"
            generated = hmac.new(
                os.getenv("RAZORPAY_KEY_SECRET", "placeholder_secret").encode(),
                message.encode(),
                hashlib.sha256,
            ).hexdigest()

            if generated != request.razorpay_signature:
                raise HTTPException(status_code=400, detail="Invalid payment signature")
        else:
            print(f"[DEBUG] Skipping signature check (test mode)")

        print(f"[DEBUG] Querying payment from DB...")
        payment = db.query(PaymentLog).filter(PaymentLog.txn_ref == request.txn_ref).first()
        if not payment:
            print(f"[DEBUG] Payment not found for txn_ref={request.txn_ref}")
            raise HTTPException(status_code=404, detail="Transaction not found")

        print(f"[DEBUG] Found payment: status={payment.status}, amount={payment.amount}")

        if payment.status == "completed":
            print(f"[DEBUG] Payment already completed")
            return {
                "verified": True,
                "txn_ref": request.txn_ref,
                "coins_earned": payment.coins_earned,
                "already_verified": True,
            }

        base_coins = int(payment.amount // 10)
        print(f"[DEBUG] Getting streak multiplier for user {x_user_id}")
        multiplier = _get_streak_multiplier(x_user_id, db)
        print(f"[DEBUG] Streak multiplier = {multiplier}")
        coins = int(base_coins * multiplier)

        print(f"[DEBUG] Awarding coins: base={base_coins}, multiplier={multiplier}, total={coins}")

        payment.status = "completed"
        payment.upi_txn_id = request.razorpay_payment_id
        payment.razorpay_payment_id = request.razorpay_payment_id
        payment.coins_earned = coins

        print(f"[DEBUG] Querying user {x_user_id}...")
        user = db.query(User).filter(User.id == x_user_id).first()
        if user:
            user.nova_coins = (user.nova_coins or 0) + coins
            print(f"[DEBUG] User coins updated: {user.nova_coins}")
        else:
            print(f"[DEBUG] User not found for id={x_user_id}")

        print(f"[DEBUG] Committing transaction...")
        db.commit()
        print(f"[DEBUG] Refresh payment and user...")
        db.refresh(payment)
        if user:
            db.refresh(user)
        print(f"[DEBUG] Payment verified and committed to DB")

        result = {
            "verified": True,
            "txn_ref": request.txn_ref,
            "coins_earned": coins,
            "total_coins": user.nova_coins if user else coins,
        }
        print(f"[DEBUG] Returning result: {result}")
        print(f"[DEBUG] ========== VERIFY END ==========")
        return result

    except HTTPException:
        print(f"[DEBUG] HTTPException raised")
        db.rollback()
        raise
    except Exception as e:
        print(f"[DEBUG] EXCEPTION in verify_razorpay: {type(e).__name__}: {str(e)}")
        db.rollback()
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Verification error: {str(e)}")


# ---------------------------------------------------------------------------
# Legacy Payment Endpoints (backward compat)
# ---------------------------------------------------------------------------

@app.post("/payments/log")
def log_payment(
    request: PaymentLogRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    existing = db.query(PaymentLog).filter(PaymentLog.txn_ref == request.txn_ref).first()
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
    print(f"[DEBUG] Getting history for user_id={x_user_id}")
    try:
        payments = (
            db.query(PaymentLog)
            .filter(PaymentLog.user_id == x_user_id)
            .order_by(PaymentLog.created_at.desc())
            .all()
        )
        print(f"[DEBUG] Found {len(payments)} payments")
        return [
            {
                "txn_ref": p.txn_ref,
                "merchant_name": p.merchant_name,
                "merchant_upi": p.merchant_upi,
                "amount": p.amount,
                "status": p.status,
                "coins_earned": p.coins_earned,
                "created_at": p.created_at.isoformat(),
            }
            for p in payments
        ]
    except Exception as e:
        print(f"[DEBUG] Error getting history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


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
    total_coins_this_month = sum(p.coins_earned for p in monthly_payments)

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

    return {
        "total_spent_this_month": total_spent,
        "total_coins_this_month": total_coins_this_month,
        "recent_merchants": list(merchant_map.values()),
    }


# ---------------------------------------------------------------------------
# QR Parse
# ---------------------------------------------------------------------------

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