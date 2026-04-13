"""
Configuration settings.
"""

# Database
DATABASE_URL = "sqlite:///./payscan.db"

# Razorpay
RAZORPAY_KEY_ID = "rzp_test_placeholder"
RAZORPAY_KEY_SECRET = "placeholder_secret"

# Coins
BASE_COINS_DIVISOR = 10  # 1 rupee = 0.1 coin

# Streak multipliers
STREAK_MULTIPLIER_HIGH = 2.0  # 20+ transactions in 30 days
STREAK_MULTIPLIER_MID = 1.5   # 10+ transactions in 30 days
STREAK_MULTIPLIER_DEFAULT = 1.0
STREAK_THRESHOLD_HIGH = 20
STREAK_THRESHOLD_MID = 10
