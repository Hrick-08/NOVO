"""
Payment and Razorpay routes.
"""

import os
import hmac
import hashlib
import uuid
from fastapi import APIRouter, HTTPException, Header, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import User, PaymentLog
from schemas import (
    PaymentLogRequest,
    VerifyRequest,
    StatusUpdateRequest,
    CreateOrderRequest,
    VerifyRazorpayRequest,
)
from utils import get_streak_multiplier
import razorpay
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

router = APIRouter(prefix="/payments", tags=["payments"])

razorpay_client = razorpay.Client(auth=(
    os.getenv("RAZORPAY_KEY_ID", "rzp_test_placeholder"),
    os.getenv("RAZORPAY_KEY_SECRET", "placeholder_secret"),
))


# ============================================================================
# Razorpay Payment Flow
# ============================================================================

@router.post("/create-order")
def create_order(
    request: CreateOrderRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Create a Razorpay order for payment."""
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


@router.post("/verify-razorpay")
def verify_razorpay(
    request: VerifyRazorpayRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Verify Razorpay payment and award coins."""
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
        multiplier = get_streak_multiplier(x_user_id, db)
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


# ============================================================================
# Legacy Payment Endpoints (backward compatibility)
# ============================================================================

@router.post("/log")
def log_payment(
    request: PaymentLogRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Log a payment transaction."""
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


@router.post("/verify")
def verify_payment(
    request: VerifyRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Verify a payment transaction."""
    payment = db.query(PaymentLog).filter(PaymentLog.txn_ref == request.txn_ref).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.status = "completed"
    payment.upi_txn_id = request.txn_id
    db.commit()
    return {"verified": True}


@router.patch("/status/{txn_ref}")
def update_status(
    txn_ref: str,
    request: StatusUpdateRequest,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Update payment status."""
    payment = db.query(PaymentLog).filter(PaymentLog.txn_ref == txn_ref).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.status = request.status
    db.commit()
    return {"status": payment.status}


@router.get("/status/{txn_ref}")
def get_status(
    txn_ref: str,
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db),
):
    """Get payment status."""
    payment = db.query(PaymentLog).filter(PaymentLog.txn_ref == txn_ref).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {"status": payment.status}


@router.get("/history")
def get_history(
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Get payment history for user."""
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


@router.get("/summary")
def get_summary(
    x_user_id: int = Header(alias="X-User-Id"),
    db: Session = Depends(get_db)
):
    """Get payment summary (monthly stats and recent merchants)."""
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
