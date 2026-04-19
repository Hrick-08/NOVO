"""
Safe Mode utilities for risk evaluation.
"""

from sqlalchemy.orm import Session
from models import User, PaymentLog
from typing import Dict, Any


def evaluate_risk(txn: Dict[str, Any], user: User, db: Session) -> Dict[str, Any]:
    """
    Evaluate risk for a transaction.
    
    Args:
        txn: Transaction data with 'amount' and 'receiver_id' (merchant_upi)
        user: User object
        db: Database session
    
    Returns:
        Dict with 'risk_score' (0-100) and 'risk_level' ('low', 'medium', 'high')
    """
    amount = txn['amount']
    receiver_id = txn['receiver_id']
    
    risk_score = 0
    reasons = []
    
    # Rule 1: Amount > safe limit
    if amount > user.safe_limit:
        risk_score += 40
        reasons.append(f"Amount ₹{amount} exceeds safe limit ₹{user.safe_limit}")
    
    # Rule 2: New receiver (not in previous receivers)
    previous_receivers = get_previous_receivers(user.id, db)
    if receiver_id not in previous_receivers:
        risk_score += 30
        reasons.append("New receiver not previously transacted with")
    
    # Rule 3: Amount > 5x average transaction
    avg_txn = get_average_transaction_amount(user.id, db)
    if avg_txn > 0 and amount > 5 * avg_txn:
        risk_score += 30
        reasons.append(f"Amount ₹{amount} is >5x average transaction ₹{avg_txn:.2f}")
    
    # Determine risk level
    if risk_score >= 70:
        risk_level = "high"
    elif risk_score >= 40:
        risk_level = "medium"
    else:
        risk_level = "low"
    
    return {
        "risk_score": min(risk_score, 100),
        "risk_level": risk_level,
        "reasons": reasons
    }


def get_previous_receivers(user_id: int, db: Session) -> set:
    """Get set of unique merchant_upi that user has transacted with."""
    payments = db.query(PaymentLog.merchant_upi).filter(
        PaymentLog.user_id == user_id,
        PaymentLog.status == "completed"
    ).distinct().all()
    return {p.merchant_upi for p in payments}


def get_average_transaction_amount(user_id: int, db: Session) -> float:
    """Calculate average transaction amount for user."""
    from sqlalchemy import func
    result = db.query(func.avg(PaymentLog.amount)).filter(
        PaymentLog.user_id == user_id,
        PaymentLog.status == "completed"
    ).scalar()
    return result or 0.0