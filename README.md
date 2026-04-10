# PayScan

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
Payment-app/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout
│   ├── index.tsx           # Login/Register
│   ├── confirm.tsx        # Payment confirmation
│   ├── status.tsx         # Payment status tracking
│   └── (tabs)/            # Tab navigation
│       ├── index.tsx      # Home
│       ├── scan.tsx       # QR Scanner
│       └── history.tsx    # Transaction history
└── src/                  # Shared code
    ├── config.ts          # Colors, fonts, config
    ├── store/             # Zustand state
    ├── hooks/             # Custom hooks
    └── components/        # Reusable components
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

- The app uses `payscan://` as the deep link scheme for UPI app callbacks
- All amounts are in INR (₹)
- User ID is stored in AsyncStorage and sent as `X-User-Id` header
