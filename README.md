<div align="center">

```
███╗   ██╗ ██████╗ ██╗   ██╗ ██████╗ 
████╗  ██║██╔═══██╗██║   ██║██╔═══██╗
██╔██╗ ██║██║   ██║██║   ██║██║   ██║
██║╚██╗██║██║   ██║╚██╗ ██╔╝██║   ██║
██║ ╚████║╚██████╔╝ ╚████╔╝ ╚██████╔╝
╚═╝  ╚═══╝ ╚═════╝   ╚═══╝   ╚═════╝ 
```

# 🪙 Novo — Financial Super App for Gen-Z India

### Payments · Rewards · Community · AI Investing
*Scan. Pay. Earn. Invest. All in one place.*

[![React Native](https://img.shields.io/badge/React_Native-Expo-0EA5E9?style=flat-square&logo=expo&logoColor=white)](#)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](#)
[![TypeScript](https://img.shields.io/badge/Frontend-TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](#)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-072654?style=flat-square)](#)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?style=flat-square&logo=sqlite&logoColor=white)](#)
[![Hackathon](https://img.shields.io/badge/Finvasia_Hackathon-2026-F59E0B?style=flat-square)](#)

---

> **Finvasia Innovation Hackathon 2026** · Open Innovation Track  
> Chitkara University Punjab · Department of CSE (AI & ML)

</div>

---

## What is Novo?

Novo is a financial super app built for Gen-Z India. It combines UPI payments, a gamified coin reward system, community events, and an AI-powered investing agent into a single platform — making money management feel social, intuitive, and rewarding rather than intimidating.

---

## Features

- **UPI Payments** — scan any merchant QR and pay instantly
- **Nova Coins** — earn 1 coin per ₹10 spent, with streak multipliers (1x / 1.5x / 2x)
- **Coin Store** — redeem coins for vouchers and cashback
- **Community Events** — weekly challenges, marathons, and leaderboards
- **AI Investing Agent** — conversational agent that explains, simulates, and guides investments
- **Portfolio Builder** — RAG-powered personalized investment allocation
- **Financial Personality** — money archetype quiz, Broke-to-Bougie roadmap, weekly spending roast

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (Expo) · TypeScript · Tailwind (NativeWind) |
| Backend | FastAPI · SQLAlchemy · SQLite |
| Payments | Razorpay SDK |
| AI Agent | GPT-4o · Gemini Embedding 2 · Qdrant (RAG) |
| State | Zustand · AsyncStorage |
| Auth | Header-based user ID (hackathon scope) |

---

## Project Structure

```
NOVO/
├── backend/
│   ├── config/             # App configuration, env loader
│   ├── db/                 # Database engine and session setup
│   ├── models/             # SQLAlchemy ORM models (User, PaymentLog)
│   ├── routers/            # FastAPI route handlers
│   ├── schemas/            # Pydantic request/response schemas
│   ├── utils/              # Helper functions (coin calculator, streak logic)
│   ├── .env                # Environment variables (not committed)
│   ├── main.py             # FastAPI app entry point
│   ├── NOVO.db             # SQLite database
│   └── requirements.txt    # Python dependencies
│
└── frontend/
    ├── app/                # Expo Router screens
    │   ├── (tabs)/         # Tab navigator screens
    │   │   ├── scan.tsx    # QR scanner + Razorpay helpers
    │   │   └── ...
    │   ├── confirm.tsx     # Payment confirmation + Razorpay checkout
    │   └── success.tsx     # Post-payment success + coins earned
    ├── assets/             # Images, fonts, icons
    ├── components/         # Shared UI components (Button, Card, Loading)
    ├── config/             # Theme, API base URL, UPI app config
    ├── hooks/              # Custom React hooks (useApi, etc.)
    ├── scripts/            # Utility scripts
    ├── store/              # Zustand global state
    ├── app.json            # Expo app config
    └── expo-env.d.ts       # Expo TypeScript declarations
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Expo CLI
- Android device or emulator (for camera + Razorpay SDK)

---

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
.venv\Scripts\activate        # Windows
source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Fill in RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
```

If you are running this against an existing `NOVO.db` that was created before the Razorpay columns were added, run the migration first:

```bash
python -c "
import sqlite3
conn = sqlite3.connect('NOVO.db')
try:
    conn.execute('ALTER TABLE users ADD COLUMN nova_coins INTEGER DEFAULT 0')
    conn.execute('ALTER TABLE payment_logs ADD COLUMN razorpay_order_id TEXT')
    conn.execute('ALTER TABLE payment_logs ADD COLUMN razorpay_payment_id TEXT')
    conn.execute('ALTER TABLE payment_logs ADD COLUMN coins_earned INTEGER DEFAULT 0')
    conn.commit()
    print('Migration complete')
except Exception as e:
    print('Already migrated or error:', e)
conn.close()
"
```

Start the server:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at `http://localhost:8000/docs`

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Install Razorpay SDK
npm install react-native-razorpay

# Create .env file (see Environment Variables below)
cp .env.example .env
# Update EXPO_PUBLIC_BASE_URL with your backend URL

# Start Expo
npx expo start
```

> **Note:** Use your machine's local IP address (not `localhost`) in `EXPO_PUBLIC_BASE_URL` when testing on a physical Android device.

---

### Environment Variables

**Backend** — Create `backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret_here
```

**Frontend** — Create `frontend/.env`:

```env
EXPO_PUBLIC_BASE_URL=http://<your-backend-ip>:8000
```

> **Note:** Variables in `frontend/.env` must be prefixed with `EXPO_PUBLIC_` to be accessible in the Expo app. Never commit `.env` files to version control.

---

## API Reference

Full interactive docs available at `http://localhost:8000/docs`

All endpoints except `/auth/register`, `/auth/login`, `/test`, `/test-post`, and `/health` require the header:
```
X-User-Id: <user_id>
```

### 🔧 Test

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/test` | Health check ping |
| `POST` | `/test-post` | Test POST endpoint |
| `GET` | `/health` | Server health status |

### 🔐 Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login existing user |
| `POST` | `/auth/logout` | Logout current session |
| `GET` | `/auth/me` | Get current user + Nova Coin balance |

### 👤 Profile

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/profile` | Get user profile |
| `PATCH` | `/profile` | Update user profile |

### 💳 Payments

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/payments/create-order` | Create a Razorpay order + log as pending |
| `POST` | `/payments/verify-razorpay` | Verify Razorpay signature + award Nova Coins |
| `POST` | `/payments/log` | Manually log a payment (legacy) |
| `POST` | `/payments/verify` | Manually verify a payment (legacy) |
| `PATCH` | `/payments/status/{txn_ref}` | Update payment status |
| `GET` | `/payments/status/{txn_ref}` | Get payment status |
| `GET` | `/payments/history` | Full transaction history |
| `GET` | `/payments/summary` | Monthly spend + coins earned summary |

### 🛍️ Collections (Coin Store)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/collections/merch` | List all merch items |
| `GET` | `/collections/merch/{item_id}` | Get a specific merch item |
| `GET` | `/collections/amazon` | List Amazon coupons |
| `GET` | `/collections/amazon/{item_id}` | Get a specific Amazon coupon |
| `GET` | `/collections/flipkart` | List Flipkart coupons |
| `GET` | `/collections/flipkart/{item_id}` | Get a specific Flipkart coupon |

### 🧾 Purchases

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/purchase` | Purchase an item using Nova Coins |
| `GET` | `/purchase/history` | Full purchase history |
| `GET` | `/purchase/{purchase_id}` | Get a specific purchase |

---

## Nova Coins System

| Transactions in Last 30 Days | Multiplier |
|---|---|
| 0 – 9 | 1x |
| 10 – 19 | 1.5x |
| 20+ | 2x |

**Formula:** `coins = floor(amount / 10) × multiplier`

Example: ₹250 payment with a 1.5x streak = `floor(250/10) × 1.5 = 37 coins`

---

## Test Mode (Razorpay Sandbox)

The app runs in Razorpay test mode. No real money is involved.

| Field | Value |
|---|---|
| UPI ID | `success@razorpay` |
| Card Number | `4111 1111 1111 1111` |
| Expiry | `12/28` |
| CVV | `123` |
| OTP | `1234` |

The confirm screen displays these credentials automatically during demo.

---

## Payment Flow

```
Scan QR → confirm.tsx
  → POST /payments/create-order     (creates Razorpay order, logs as pending)
  → RazorpayCheckout.open()         (user pays via UPI or card)
  → POST /payments/verify-razorpay  (verifies signature, marks completed)
  → Nova Coins awarded to user
  → success.tsx                     (shows amount, coins earned, total balance)
```

---

## Roadmap

- [ ] Squad investing — group micro-investment pools
- [ ] Weekly events engine — challenges, leaderboards, coin betting
- [ ] AI investing agent — conversational portfolio guidance
- [ ] Portfolio builder — RAG-powered personalized allocation
- [ ] Money Roast — weekly AI spending summary card
- [ ] Local partner coin network — campus and small business redemptions
- [ ] Carbon finance score — eco-bonus coins for sustainable spending

---

## License

Built for Finvasia Innovation Hackathon 2026. Not for production use in current form.