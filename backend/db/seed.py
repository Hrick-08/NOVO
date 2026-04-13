"""
Database seeding with demo data.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from models import MerchItem, AmazonCoupon, FlipkartCoupon


def seed_demo_data(db: Session):
    """Seed database with demo data on startup."""
    # Seed merch items
    if db.query(MerchItem).count() == 0:
        demo_merch = [
            MerchItem(
                name="Nova T-Shirt",
                description="Premium cotton tee with the Nova logo. Available in S/M/L/XL.",
                image_url="https://placehold.co/400x400?text=Nova+Tshirt",
                coin_price=500,
                stock=100,
                category="apparel",
            ),
            MerchItem(
                name="Nova Cap",
                description="Embroidered snapback cap in black.",
                image_url="https://placehold.co/400x400?text=Nova+Cap",
                coin_price=300,
                stock=50,
                category="accessories",
            ),
            MerchItem(
                name="Nova Tote Bag",
                description="Eco-friendly canvas tote with Nova branding.",
                image_url="https://placehold.co/400x400?text=Nova+Tote",
                coin_price=200,
                stock=75,
                category="accessories",
            ),
            MerchItem(
                name="Nova Hoodie",
                description="Unisex fleece hoodie — stay cozy and branded.",
                image_url="https://placehold.co/400x400?text=Nova+Hoodie",
                coin_price=800,
                stock=30,
                category="apparel",
            ),
            MerchItem(
                name="Nova Sticker Pack",
                description="Set of 10 high-quality vinyl stickers.",
                image_url="https://placehold.co/400x400?text=Nova+Stickers",
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
                image_url="https://placehold.co/400x400?text=Amazon+100",
                coin_price=150,
                face_value=100.0,
                stock=200,
                expires_at=datetime(2025, 12, 31),
            ),
            AmazonCoupon(
                title="₹250 Amazon Gift Card",
                description="Redeemable on Amazon.in for any product.",
                image_url="https://placehold.co/400x400?text=Amazon+250",
                coin_price=350,
                face_value=250.0,
                stock=100,
                expires_at=datetime(2025, 12, 31),
            ),
            AmazonCoupon(
                title="₹500 Amazon Gift Card",
                description="Great for shopping electronics, books, and more.",
                image_url="https://placehold.co/400x400?text=Amazon+500",
                coin_price=650,
                face_value=500.0,
                stock=50,
                expires_at=datetime(2025, 12, 31),
            ),
            AmazonCoupon(
                title="₹1000 Amazon Gift Card",
                description="Maximum value gift card for big purchases.",
                image_url="https://placehold.co/400x400?text=Amazon+1000",
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
                image_url="https://placehold.co/400x400?text=Flipkart+100",
                coin_price=140,
                face_value=100.0,
                stock=200,
                expires_at=datetime(2025, 12, 31),
            ),
            FlipkartCoupon(
                title="₹250 Flipkart Gift Card",
                description="Shop fashion, electronics, and more.",
                image_url="https://placehold.co/400x400?text=Flipkart+250",
                coin_price=330,
                face_value=250.0,
                stock=100,
                expires_at=datetime(2025, 12, 31),
            ),
            FlipkartCoupon(
                title="₹500 Flipkart Gift Card",
                description="Perfect for your next big Flipkart order.",
                image_url="https://placehold.co/400x400?text=Flipkart+500",
                coin_price=620,
                face_value=500.0,
                stock=50,
                expires_at=datetime(2025, 12, 31),
            ),
            FlipkartCoupon(
                title="Flipkart Plus 10% Off Coupon",
                description="Flat 10% off on your next Flipkart purchase (max ₹200 off).",
                image_url="https://placehold.co/400x400?text=FK+10pct",
                coin_price=100,
                face_value=200.0,
                stock=500,
                expires_at=datetime(2025, 9, 30),
            ),
        ]
        db.add_all(demo_flipkart)

    db.commit()
