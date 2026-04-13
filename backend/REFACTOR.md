# Backend Project Structure

This FastAPI application has been refactored into a modular structure for better maintainability and scalability.

## Directory Structure

```
backend/
├── main.py                 # FastAPI app initialization and router registration
├── models/                 # SQLAlchemy database models
│   ├── __init__.py
│   └── models.py          # All database models (User, PaymentLog, etc.)
├── schemas/               # Pydantic request/response schemas
│   ├── __init__.py
│   └── schemas.py         # All request/response schemas
├── routers/               # API route modules
│   ├── __init__.py
│   ├── auth.py           # Authentication endpoints
│   ├── profile.py        # User profile endpoints
│   ├── payments.py       # Payment and Razorpay endpoints
│   ├── collections.py    # Collections endpoints (merch, Amazon, Flipkart)
│   ├── purchases.py      # Purchase/redemption endpoints
│   ├── qr.py            # QR code parsing endpoints
│   └── test.py          # Test endpoints
├── db/                    # Database configuration and seeding
│   ├── __init__.py
│   ├── database.py       # Database connection, session, and Base
│   └── seed.py          # Demo data seeding
├── utils/                 # Utility functions
│   ├── __init__.py
│   └── helpers.py        # Helper functions (e.g., get_streak_multiplier)
├── config/                # Configuration settings
│   ├── __init__.py
│   └── settings.py       # App configuration and constants
├── requirements.txt       # Python dependencies
├── runtime.txt           # Python version
└── routers/              # Keep existing routers folder if used
```

## Architecture

### Models (`models/models.py`)
Contains all SQLAlchemy ORM models:
- `User` - User accounts
- `PaymentLog` - Payment transactions
- `MerchItem` - Merchandise items
- `AmazonCoupon` - Amazon gift cards
- `FlipkartCoupon` - Flipkart gift cards
- `Purchase` - Purchase/redemption records

### Schemas (`schemas/schemas.py`)
Contains all Pydantic request/response schemas organized by feature:
- Auth schemas
- Profile schemas
- Payment schemas
- Collections schemas
- Purchase schemas
- QR schemas

### Routers (`routers/`)
Each file handles API endpoints for a specific feature:
- `auth.py` - `/auth/*` endpoints
- `profile.py` - `/profile` endpoints
- `payments.py` - `/payments/*` endpoints
- `collections.py` - `/collections/*` endpoints
- `purchases.py` - `/purchase*` endpoints
- `qr.py` - `/qr/*` endpoints
- `test.py` - `/test*` endpoints

### Database (`db/`)
- `database.py` - SQLAlchemy engine, session factory, dependency injection
- `seed.py` - Demo data initialization

### Utils (`utils/`)
- `helpers.py` - Reusable functions like `get_streak_multiplier()`

### Config (`config/`)
- `settings.py` - Configuration constants and environment values

## API Endpoints

All endpoints are registered with their respective routers:

### Authentication
- `POST /auth/register`
- `POST /auth/logout`
- `GET /auth/me`

### Profile
- `GET /profile`
- `PATCH /profile`

### Payments
- `POST /payments/create-order`
- `POST /payments/verify-razorpay`
- `POST /payments/log` (legacy)
- `POST /payments/verify` (legacy)
- `GET /payments/history`
- `GET /payments/summary`
- `GET/PATCH /payments/status/{txn_ref}`

### Collections
- `GET /collections/merch`
- `GET /collections/merch/{item_id}`
- `GET /collections/amazon`
- `GET /collections/amazon/{item_id}`
- `GET /collections/flipkart`
- `GET /collections/flipkart/{item_id}`

### Purchases
- `POST /purchase`
- `GET /purchase/history`
- `GET /purchase/{purchase_id}`

### QR
- `POST /qr/parse`

### Test
- `GET /test`
- `POST /test-post`

## Running the Application

```bash
# Activate virtual environment
.\.venv\Scripts\activate.ps1

# Install dependencies (if needed)
pip install -r requirements.txt

# Run the application
uvicorn main:app --reload

# The API will be available at http://localhost:8000
# Interactive API docs at http://localhost:8000/docs
```

## Benefits of This Structure

1. **Modularity** - Each feature has its own router file
2. **Reusability** - Schemas and models are centralized and reusable
3. **Maintainability** - Easy to find and modify specific features
4. **Scalability** - Easy to add new routers and features
5. **Testing** - Each module can be tested independently
6. **Organization** - Clear separation of concerns

## Adding New Features

To add a new feature:

1. Create model(s) in `models/models.py`
2. Create schema(s) in `schemas/schemas.py`
3. Create a new router file in `routers/new_feature.py`
4. Import and register the router in `main.py`
5. Add helper functions to `utils/helpers.py` if needed
6. Add configuration to `config/settings.py` if needed
