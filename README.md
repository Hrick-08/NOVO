# NOVO

A React Native (Expo) mobile app for scanning UPI QR codes and completing payments via your preferred UPI app (GPay, PhonePe, Paytm).

## Tech Stack

- **Frontend**: React Native with Expo SDK 52, Expo Router, React Native Reanimated
- **Backend**: FastAPI (Python) with SQLite via SQLAlchemy
- **Design**: Dark fintech aesthetic with Space Grotesk & DM Sans fonts

## Prerequisites

- Node.js 18+
- Python 3.10+
- Expo CLI (`npm install -g expo-cli`)

## Getting Started

### 1. Clone & Install Frontend Dependencies

```bash
cd Payment-app
npm install
```

### 2. Set Up & Run Backend

Open a new terminal:

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Run the Expo App

```bash
npx expo start
```

- Press `a` to run on Android emulator
- Press `i` to run on iOS simulator
- Scan the QR code with the Expo Go app on your phone

### 4. Connecting a Physical Device

If running on a physical phone, update the API URL:

1. Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Edit `src/config.ts`:
   ```typescript
   export const BASE_URL = 'http://YOUR_IP:8000';
   ```
3. Restart the Expo server

## Project Structure

```
NOVO/
├── README.md               # Project documentation
├── backend/                # FastAPI backend
│   ├── main.py             # Main application entry point
│   ├── requirements.txt     # Python dependencies
│   └── routers/            # API route handlers
└── frontend/               # React Native Expo app
    ├── package.json        # Node.js dependencies
    ├── tsconfig.json       # TypeScript configuration
    ├── eslint.config.js    # ESLint configuration
    ├── app.json            # Expo app configuration
    ├── expo-env.d.ts       # Expo environment types
    ├── README.md           # Frontend documentation
    ├── app/                # Expo Router screens
    │   ├── _layout.tsx     # Root layout
    │   ├── index.tsx       # Login/Register screen
    │   ├── confirm.tsx     # Payment confirmation screen
    │   ├── status.tsx      # Payment status tracking
    │   └── (tabs)/         # Tab navigation
    │       ├── _layout.tsx # Tab layout
    │       ├── index.tsx   # Home screen
    │       ├── scan.tsx    # QR Scanner screen
    │       └── history.tsx # Transaction history screen
    ├── assets/             # Images and static assets
    │   └── images/
    ├── components/         # Reusable UI components
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   ├── Input.tsx
    │   ├── Loading.tsx
    │   ├── PaymentItem.tsx
    │   ├── index.ts
    │   ├── themed-text.tsx
    │   ├── themed-view.tsx
    │   └── ui/             # UI utility components
    │       ├── collapsible.tsx
    │       ├── icon-symbol.ios.tsx
    │       └── icon-symbol.tsx
    ├── config/             # Configuration
    │   ├── api.ts          # API config and settings
    │   └── theme.ts        # Theme configuration
    ├── hooks/              # Custom hooks
    │   ├── use-color-scheme.ts
    │   ├── use-color-scheme.web.ts
    │   ├── use-theme-color.ts
    │   └── useApi.ts
    ├── scripts/            # Utility scripts
    │   └── reset-project.js
    └── store/              # State management (Zustand)
        └── useAppStore.ts
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| GET | `/auth/me` | Get current user |
| POST | `/payments/log` | Log a new payment |
| POST | `/payments/verify` | Verify payment success |
| PATCH | `/payments/status/{txn_ref}` | Update payment status |
| GET | `/payments/status/{txn_ref}` | Get payment status |
| GET | `/payments/history` | Get transaction history |
| GET | `/payments/summary` | Get monthly summary |

## Features

- Scan QR codes using device camera
- Upload QR images from gallery
- Auto-detect UPI payment links
- Choose from GPay, PhonePe, Paytm, or any UPI app
- Track payment status via deep link callbacks
- Manual confirmation fallback on timeout
- Transaction history with pull-to-refresh

## Notes

- The app uses `NOVO://` as the deep link scheme for UPI app callbacks
- All amounts are in INR (₹)
- User ID is stored in AsyncStorage and sent as `X-User-Id` header
