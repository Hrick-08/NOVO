"""
SQLAlchemy database models.
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey, Text
from datetime import datetime
from db import Base


class User(Base):
    """User account model."""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)  # Optional for backward compatibility
    nova_coins = Column(Integer, default=0)
    phone = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Safe Mode settings
    safe_mode_enabled = Column(Boolean, default=False)
    safe_limit = Column(Float, default=1000.0)  # Default safe limit ₹1000


class PaymentLog(Base):
    """Payment transaction log."""
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


class MerchItem(Base):
    """Merchandise items redeemable with Nova Coins."""
    __tablename__ = "merch_items"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    coin_price = Column(Integer, nullable=False)
    stock = Column(Integer, default=0)  # -1 = unlimited
    category = Column(String, nullable=True)  # e.g. "apparel", "accessories"
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AmazonCoupon(Base):
    """Amazon gift cards redeemable with Nova Coins."""
    __tablename__ = "amazon_coupons"
    
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


class FlipkartCoupon(Base):
    """Flipkart gift cards redeemable with Nova Coins."""
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
    """Purchase/redemption records."""
    __tablename__ = "purchases"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item_type = Column(String, nullable=False)  # "merch" | "amazon" | "flipkart"
    item_id = Column(Integer, nullable=False)
    item_name = Column(String, nullable=False)
    coins_spent = Column(Integer, nullable=False)
    status = Column(String, default="confirmed")  # confirmed | shipped | delivered | cancelled
    delivery_address = Column(Text, nullable=True)
    coupon_code_issued = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Event(Base):
    """Community event model."""
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    event_type = Column(String, nullable=False)  # "saving" | "quiz" | "marathon" | "prediction"
    coins_reward = Column(Integer, default=100)  # Base reward for completion
    target_amount = Column(Float, nullable=True)  # For saving challenges
    category_color = Column(String, nullable=True)  # For UI: blue, purple, green, orange
    starts_at = Column(DateTime, nullable=False)
    ends_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class EventParticipant(Base):
    """Tracks user participation in events."""
    __tablename__ = "event_participants"
    
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    score = Column(Float, default=0.0)  # Points scored in this event
    is_completed = Column(Boolean, default=False)
    coins_earned = Column(Integer, default=0)
    joined_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)


class Squad(Base):
    """Squad/group model for social features."""
    __tablename__ = "squads"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    max_members = Column(Integer, default=10)
    created_at = Column(DateTime, default=datetime.utcnow)


class SquadMember(Base):
    """Squad membership model."""
    __tablename__ = "squad_members"
    
    id = Column(Integer, primary_key=True, index=True)
    squad_id = Column(Integer, ForeignKey("squads.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)


class Badge(Base):
    """Achievement badges."""
    __tablename__ = "badges"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserBadge(Base):
    """User badge awards."""
    __tablename__ = "user_badges"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_id = Column(Integer, ForeignKey("badges.id"), nullable=False)
    earned_at = Column(DateTime, default=datetime.utcnow)
