"""
Database seeding with demo data.
"""

from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import (
    MerchItem, AmazonCoupon, FlipkartCoupon, Event, Badge, 
    EventParticipant, User
)
from routers import pwd_context


def seed_demo_data(db: Session):
    """Seed database with demo data on startup."""
    # Seed test users first (needed for events and leaderboard)
    if db.query(User).count() == 0:
        test_users = [
            User(
                name="Hrick",
                email="hrick@gmail.com",
                password_hash=pwd_context.hash("password123"),
                nova_coins=5000,
            ),
            User(
                name="test",
                email="test@gmail.com",
                password_hash=pwd_context.hash("1234"),
                nova_coins=5000,
            ),
        ]
        db.add_all(test_users)
        db.commit()
    
    # Clear and reseed merch items to ensure correct image URLs
    db.query(MerchItem).delete()
    demo_merch = [
        MerchItem(
            name="Novo T-Shirt",
            description="Premium cotton tee with the Nova logo. Available in S/M/L/XL.",
            image_url="/static/images/merch/NOVO-tshirt.png",
            coin_price=500,
            stock=100,
            category="apparel",
        ),
        MerchItem(
            name="Novo Cap",
            description="Embroidered snapback cap in black.",
            image_url="/static/images/merch/NOVO-cap.png",
            coin_price=300,
            stock=50,
            category="accessories",
        ),
        MerchItem(
            name="Novo Tote Bag",
            description="Eco-friendly canvas tote with Novo branding.",
            image_url="/static/images/merch/NOVO-tote_bag.png",
            coin_price=200,
            stock=75,
            category="accessories",
        ),
        MerchItem(
            name="Novo Hoodie",
            description="Unisex fleece hoodie — stay cozy and branded.",
            image_url="/static/images/merch/NOVO-hoodie.png",
            coin_price=800,
            stock=30,
            category="apparel",
        ),
        MerchItem(
            name="Novo Sticker Pack",
            description="Set of 10 high-quality vinyl stickers.",
            image_url="/static/images/merch/NOVO-sticker_pack.png",
            coin_price=50,
            stock=-1,   # unlimited
            category="accessories",
        ),
    ]
    db.add_all(demo_merch)

    # Seed Amazon coupons
    if db.query(AmazonCoupon).count() == 0:
        demo_amazon = [
            AmazonCoupon(
                title="₹100 Amazon Gift Card",
                description="Redeemable on Amazon.in for any product.",
                image_url="/static/images/vouchers/amazon.jpeg",
                coin_price=150,
                face_value=100.0,
                stock=200,
                expires_at=datetime(2025, 12, 31),
            ),
            AmazonCoupon(
                title="₹250 Amazon Gift Card",
                description="Redeemable on Amazon.in for any product.",
                image_url="/static/images/vouchers/amazon.jpeg",
                coin_price=350,
                face_value=250.0,
                stock=100,
                expires_at=datetime(2025, 12, 31),
            ),
            AmazonCoupon(
                title="₹500 Amazon Gift Card",
                description="Great for shopping electronics, books, and more.",
                image_url="/static/images/vouchers/amazon.jpeg",
                coin_price=650,
                face_value=500.0,
                stock=50,
                expires_at=datetime(2025, 12, 31),
            ),
            AmazonCoupon(
                title="₹1000 Amazon Gift Card",
                description="Maximum value gift card for big purchases.",
                image_url="/static/images/vouchers/amazon.jpeg",
                coin_price=1200,
                face_value=1000.0,
                stock=20,
                expires_at=datetime(2025, 12, 31),
            ),
        ]
        db.add_all(demo_amazon)

    # Seed Flipkart coupons
    if db.query(FlipkartCoupon).count() == 0:
        demo_flipkart = [
            FlipkartCoupon(
                title="₹100 Flipkart Gift Card",
                description="Redeemable on Flipkart for any category.",
                image_url="/static/images/vouchers/flipkart.webp",
                coin_price=140,
                face_value=100.0,
                stock=200,
                expires_at=datetime(2025, 12, 31),
            ),
            FlipkartCoupon(
                title="₹250 Flipkart Gift Card",
                description="Shop fashion, electronics, and more.",
                image_url="/static/images/vouchers/flipkart.webp",
                coin_price=330,
                face_value=250.0,
                stock=100,
                expires_at=datetime(2025, 12, 31),
            ),
            FlipkartCoupon(
                title="₹500 Flipkart Gift Card",
                description="Perfect for your next big Flipkart order.",
                image_url="/static/images/vouchers/flipkart.webp",
                coin_price=620,
                face_value=500.0,
                stock=50,
                expires_at=datetime(2025, 12, 31),
            ),
        ]
        db.add_all(demo_flipkart)

    # Seed badges
    if db.query(Badge).count() == 0:
        demo_badges = [
            Badge(
                name="First Event Hero",
                description="Joined your first community event",
                image_url="https://placehold.co/100x100?text=Hero+Badge",
            ),
            Badge(
                name="Quiz Master",
                description="Won a financial quiz challenge",
                image_url="https://placehold.co/100x100?text=Quiz+Badge",
            ),
            Badge(
                name="Saving Champion",
                description="Completed a saving challenge",
                image_url="https://placehold.co/100x100?text=Save+Badge",
            ),
            Badge(
                name="Leaderboard Topper",
                description="Ranked #1 in weekly leaderboard",
                image_url="https://placehold.co/100x100?text=Top+Badge",
            ),
            Badge(
                name="Squad Captain",
                description="Created and led a squad",
                image_url="https://placehold.co/100x100?text=Captain+Badge",
            ),
        ]
        db.add_all(demo_badges)
        db.commit()

    # Seed events
    if db.query(Event).count() == 0:
        now = datetime.utcnow()
        next_sunday = now + timedelta(days=(6 - now.weekday()))
        
        demo_events = [
            Event(
                title="Save ₹500 This Week",
                description="Save at least ₹500 this week and earn 100 Nova Coins. Complete by Sunday!",
                event_type="saving",
                coins_reward=100,
                target_amount=500.0,
                category_color="blue",
                starts_at=now,
                ends_at=next_sunday,
                is_active=True,
            ),
            Event(
                title="Financial IQ Quiz",
                description="Answer 5 questions about personal finance and investing. Get 3+ right to win!",
                event_type="quiz",
                coins_reward=100,
                target_amount=None,
                category_color="purple",
                starts_at=now,
                ends_at=next_sunday,
                is_active=True,
            ),
            Event(
                title="10,000 Steps Marathon",
                description="Walk or run 10,000 steps this week. Earn coins for staying active!",
                event_type="marathon",
                coins_reward=80,
                target_amount=None,
                category_color="green",
                starts_at=now,
                ends_at=next_sunday,
                is_active=True,
            ),
            Event(
                title="Stock Prediction Bet",
                description="Bet coins: which stock will rise more this week — HDFC or INFY? Winners split the pool!",
                event_type="prediction",
                coins_reward=200,
                target_amount=None,
                category_color="orange",
                starts_at=now,
                ends_at=next_sunday,
                is_active=True,
            ),
        ]
        db.add_all(demo_events)
        db.commit()
        
        # Add some mock participants to make leaderboard look active
        events = db.query(Event).all()
        test_users = db.query(User).limit(5).all()
        
        for event in events:
            for i, user in enumerate(test_users[:3], 1):
                # Check if participant already exists
                existing = db.query(EventParticipant).filter(
                    EventParticipant.event_id == event.id,
                    EventParticipant.user_id == user.id
                ).first()
                
                if not existing:
                    participant = EventParticipant(
                        event_id=event.id,
                        user_id=user.id,
                        score=float(100 - (i * 20)),
                        coins_earned=event.coins_reward - (i * 20),
                        is_completed=True,
                        joined_at=now - timedelta(days=1),
                        completed_at=now,
                    )
                    db.add(participant)
        
        db.commit()

