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


# ============================================================================
# Community Schemas
# ============================================================================

class EventResponse(BaseModel):
    """Event response."""
    id: int
    title: str
    description: Optional[str]
    event_type: str  # "saving" | "quiz" | "marathon" | "prediction"
    coins_reward: int
    target_amount: Optional[float]
    category_color: Optional[str]
    starts_at: str
    ends_at: str
    is_active: bool
    participant_count: int = 0
    user_joined: bool = False


class EventDetailResponse(EventResponse):
    """Detailed event response."""
    created_at: str


class LeaderboardEntryResponse(BaseModel):
    """Leaderboard entry."""
    rank: int
    user_id: int
    user_name: str
    user_avatar: Optional[str]
    coins: int
    score: float
    rank_change: Optional[int] = 0  # ↑ or ↓ indicator


class EventLeaderboardResponse(BaseModel):
    """Event leaderboard response."""
    event_id: int
    event_title: str
    entries: List[LeaderboardEntryResponse]


class WeeklyLeaderboardResponse(BaseModel):
    """Weekly global leaderboard."""
    week_ending: str
    entries: List[LeaderboardEntryResponse]


class MonthlyLeaderboardResponse(BaseModel):
    """Monthly global leaderboard."""
    month: str
    entries: List[LeaderboardEntryResponse]


class JoinEventRequest(BaseModel):
    """Join event request."""
    pass


class JoinEventResponse(BaseModel):
    """Join event response."""
    success: bool
    message: str
    coins_earned: int = 0


class SquadResponse(BaseModel):
    """Squad response."""
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    owner_name: str
    member_count: int
    max_members: int
    created_at: str


class CreateSquadRequest(BaseModel):
    """Create squad request."""
    name: str
    description: Optional[str] = None


class InviteSquadRequest(BaseModel):
    """Invite user to squad."""
    user_id: int


class BadgeResponse(BaseModel):
    """Badge response."""
    id: int
    name: str
    description: Optional[str]
    image_url: Optional[str]


class UserBadgeResponse(BadgeResponse):
    """User badge with earned date."""
    earned_at: str
