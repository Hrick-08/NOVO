"""
User profile routes.
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import User, PaymentLog, Purchase
from schemas import UpdateProfileRequest, UpdateSafeModeRequest

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("")
def get_profile(x_user_id: int = Header(alias="X-User-Id"), db: Session = Depends(get_db)):
    """Get full user profile with stats and recent redemptions."""
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
        "safe_mode": {
            "enabled": user.safe_mode_enabled,
            "limit": user.safe_limit,
        },
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


@router.patch("")
def update_profile(
    request: UpdateProfileRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Update user profile (name, phone, avatar_url)."""
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


@router.patch("/safe-mode")
def update_safe_mode(
    request: UpdateSafeModeRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Update safe mode settings."""
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if request.enabled is not None:
        user.safe_mode_enabled = request.enabled
    if request.limit is not None:
        user.safe_limit = request.limit

    db.commit()
    db.refresh(user)
    return {
        "enabled": user.safe_mode_enabled,
        "limit": user.safe_limit,
    }
