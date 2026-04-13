"""
Collections routes (merch, Amazon, Flipkart).
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import MerchItem, AmazonCoupon, FlipkartCoupon

router = APIRouter(prefix="/collections", tags=["collections"])


# ============================================================================
# Merch Items
# ============================================================================

@router.get("/merch")
def list_merch(db: Session = Depends(get_db)):
    """List all active merchandise items."""
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


@router.get("/merch/{item_id}")
def get_merch_item(item_id: int, db: Session = Depends(get_db)):
    """Get a specific merchandise item."""
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


# ============================================================================
# Amazon Coupons
# ============================================================================

@router.get("/amazon")
def list_amazon_coupons(db: Session = Depends(get_db)):
    """List all active Amazon coupons."""
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


@router.get("/amazon/{item_id}")
def get_amazon_coupon(item_id: int, db: Session = Depends(get_db)):
    """Get a specific Amazon coupon."""
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


# ============================================================================
# Flipkart Coupons
# ============================================================================

@router.get("/flipkart")
def list_flipkart_coupons(db: Session = Depends(get_db)):
    """List all active Flipkart coupons."""
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


@router.get("/flipkart/{item_id}")
def get_flipkart_coupon(item_id: int, db: Session = Depends(get_db)):
    """Get a specific Flipkart coupon."""
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
