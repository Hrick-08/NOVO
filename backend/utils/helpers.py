"""
Utility helper functions.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import PaymentLog


def get_streak_multiplier(user_id: int, db: Session) -> float:
    """Calculate coins earning multiplier based on user's payment streak."""
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
