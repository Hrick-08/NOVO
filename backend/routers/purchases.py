"""
Purchase/redemption routes.
"""

import uuid
from fastapi import APIRouter, HTTPException, Header, Depends
from datetime import datetime
from sqlalchemy.orm import Session
from db import get_db
from models import User, Purchase, MerchItem, AmazonCoupon, FlipkartCoupon
from schemas import PurchaseRequest

router = APIRouter(prefix="/purchase", tags=["purchases"])


@router.post("")
def purchase_item(
    request: PurchaseRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Redeem Nova Coins for merch, Amazon coupons, or Flipkart coupons."""
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    item_type = request.item_type.lower()
    if item_type not in ("merch", "amazon", "flipkart"):
        raise HTTPException(status_code=400, detail="item_type must be 'merch', 'amazon', or 'flipkart'")

    # Resolve the item
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

    # Check balance
    if user.nova_coins < coin_price:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient Nova Coins. You have {user.nova_coins}, need {coin_price}.",
        )

    # Deduct coins
    user.nova_coins -= coin_price

    # Record purchase
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


@router.get("/history")
def purchase_history(
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Get all purchases made by the user."""
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


@router.get("/{purchase_id}")
def get_purchase(
    purchase_id: int,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Get a single purchase by ID."""
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
