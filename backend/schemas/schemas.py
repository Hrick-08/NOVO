"""
Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


# ============================================================================
# Auth Schemas
# ============================================================================

class RegisterRequest(BaseModel):
    """User registration request."""
    name: str
    email: str
    password: Optional[str] = None


class LoginRequest(BaseModel):
    """User login request."""
    email: str
    password: str


# ============================================================================
# Profile Schemas
# ============================================================================

class UpdateProfileRequest(BaseModel):
    """Profile update request."""
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    """User profile response."""
    id: int
    name: str
    email: str
    phone: Optional[str]
    avatar_url: Optional[str]
    nova_coins: int


class RecentRedemption(BaseModel):
    """Recent redemption item."""
    id: int
    item_type: str
    item_name: str
    coins_spent: int
    status: str
    created_at: str


class ProfileStats(BaseModel):
    """Profile statistics."""
    total_spent_inr: float
    total_coins_earned: int
    total_transactions: int


class ProfileResponse(BaseModel):
    """Full profile response."""
    id: int
    name: str
    email: str
    phone: Optional[str]
    avatar_url: Optional[str]
    nova_coins: int
    member_since: str
    stats: ProfileStats
    recent_redemptions: List[RecentRedemption]


# ============================================================================
# Payment Schemas
# ============================================================================

class PaymentLogRequest(BaseModel):
    """Payment log request."""
    txn_ref: str
    pa: str
    pn: str
    amount: float
    status: str = "pending"


class VerifyRequest(BaseModel):
    """Verify payment request."""
    txn_ref: str
    txn_id: str


class StatusUpdateRequest(BaseModel):
    """Status update request."""
    status: str


class CreateOrderRequest(BaseModel):
    """Create Razorpay order request."""
    amount: float
    merchant_name: str
    merchant_upi: str


class VerifyRazorpayRequest(BaseModel):
    """Verify Razorpay payment request."""
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    txn_ref: str
    test_mode: bool = False


class PaymentHistoryItem(BaseModel):
    """Payment history item."""
    txn_ref: str
    merchant_name: str
    merchant_upi: str
    amount: float
    status: str
    coins_earned: int
    created_at: str


class PaymentSummary(BaseModel):
    """Payment summary."""
    total_spent_this_month: float
    total_coins_this_month: int
    recent_merchants: List[dict]


# ============================================================================
# Collections Schemas
# ============================================================================

class MerchItemResponse(BaseModel):
    """Merchandise item response."""
    id: int
    name: str
    description: Optional[str]
    image_url: Optional[str]
    coin_price: int
    stock: int
    category: Optional[str]


class MerchItemDetailResponse(MerchItemResponse):
    """Detailed merchandise item response."""
    created_at: str


class AmazonCouponResponse(BaseModel):
    """Amazon coupon response."""
    id: int
    title: str
    description: Optional[str]
    image_url: Optional[str]
    coin_price: int
    face_value: float
    stock: int
    expires_at: Optional[str]


class FlipkartCouponResponse(BaseModel):
    """Flipkart coupon response."""
    id: int
    title: str
    description: Optional[str]
    image_url: Optional[str]
    coin_price: int
    face_value: float
    stock: int
    expires_at: Optional[str]


# ============================================================================
# Purchase Schemas
# ============================================================================

class PurchaseRequest(BaseModel):
    """Purchase/redeem request."""
    item_type: str  # "merch" | "amazon" | "flipkart"
    item_id: int
    delivery_address: Optional[str] = None


class PurchaseResponse(BaseModel):
    """Purchase response."""
    purchase_id: int
    item_type: str
    item_name: str
    coins_spent: int
    remaining_coins: int
    status: str
    created_at: str
    coupon_code: Optional[str] = None


class PurchaseHistoryItem(BaseModel):
    """Purchase history item."""
    purchase_id: int
    item_type: str
    item_id: int
    item_name: str
    coins_spent: int
    status: str
    coupon_code: Optional[str]
    delivery_address: Optional[str]
    created_at: str


class PurchaseDetailResponse(PurchaseHistoryItem):
    """Detailed purchase response."""
    pass


# ============================================================================
# QR Schemas
# ============================================================================

class QRParseResponse(BaseModel):
    """QR code parse response."""
    pa: str
    pn: str
    am: str
    tn: str
