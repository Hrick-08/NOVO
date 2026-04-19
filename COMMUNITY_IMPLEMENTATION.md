# 🎉 Community Tab - Implementation Guide

## Overview

The Community tab is now fully implemented as a Phase 0 (Hackathon Demo) with the following features:

- **4 Weekly Events**: Saving challenges, quizzes, marathons, and prediction contests
- **Real-time Leaderboards**: Global rankings with top 5 players
- **Coin Rewards System**: Earn coins by joining events and winning challenges
- **Event Leaderboards**: View rankings for specific events
- **Squads (API Ready)**: Backend support for squad creation and invitations (UI coming Phase 1)

---

## 🏗️ Architecture

### Backend Stack
- **Framework**: FastAPI
- **Database**: PostgreSQL (with SQLAlchemy ORM)
- **Models**: Event, EventParticipant, Squad, SquadMember, Badge, UserBadge
- **Endpoints**: 11 community API routes

### Frontend Stack
- **Framework**: React Native (Expo)
- **UI Components**: EventCard, Leaderboard
- **State Management**: Zustand (useAppStore)
- **API Integration**: Custom hooks (useApi.ts)

---

## 🚀 Quick Start

### Backend Setup

1. **Install dependencies** (if not already done):
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Run the server**:
   ```bash
   python -m uvicorn main:app --reload
   ```
   
   The server will:
   - Create all database tables
   - Seed demo data (4 events, 5 badges, mock participants)
   - Start at `http://localhost:8000`

3. **Verify API**:
   ```bash
   curl http://localhost:8000/api/community/events \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-User-Id: 1"
   ```

### Frontend Setup

1. **Install dependencies** (if not already done):
   ```bash
   cd frontend
   npm install
   # or
   yarn install
   ```

2. **Start the dev server**:
   ```bash
   npx expo start
   ```

3. **Open on device/simulator**:
   - Press `i` for iOS simulator or `a` for Android emulator
   - Or scan QR code with Expo Go app on your phone

---

## 📱 Features Overview

### Community Tab

Located in the tab navigation (position 5) between "Invest" and "Shop".

#### Events Tab
- **Displays**: List of active community events
- **Event Card Shows**:
  - Event title and type (saving, quiz, marathon, prediction)
  - Color-coded border (blue, purple, green, orange)
  - Coin reward amount
  - Time remaining (e.g., "2d 4h")
  - Participant count
  - "Join" or "Leaderboard" button (depending on participation status)

- **User Actions**:
  - Tap "Join" to participate (shows success alert with coins earned)
  - Coins awarded immediately (first event bonus: 50 coins)
  - Button changes to "Leaderboard" once joined

#### Leaderboard Tab
- **Shows**: Weekly global rankings
- **Displays**:
  - Rank with medal emoji (🥇 🥈 🥉) for top 3
  - User name and avatar (initial + generated color)
  - Total coins
  - Score points
  - Rank change indicator (↑ or ↓)

### Event Leaderboard Detail Page

Accessible by tapping "Leaderboard" on an event card:
- **Header**: Event title + "Leaderboard"
- **Content**: Top 5 participants ranked by score
- **Styling**: Same leaderboard component with medals and coin display

---

## 💰 Coin Reward System

| Action | Coins |
|--------|-------|
| Join first event (bonus) | +50 |
| Join saving challenge | +100 |
| Join quiz event | +100 |
| Join marathon | +80 |
| Join prediction bet | +200 |
| Create squad | +50 |
| Join squad | +150 |

---

## 📊 API Endpoints

### Events
- `GET /api/community/events` - Get all active events
- `POST /api/community/events/{id}/join` - Join an event
- `GET /api/community/events/{id}/leaderboard` - Get event leaderboard

### Leaderboards
- `GET /api/community/leaderboard/weekly` - Get weekly global rankings
- `GET /api/community/leaderboard/monthly` - Get monthly global rankings

### Squads
- `POST /api/community/squads` - Create a squad
- `GET /api/community/squads/{id}` - Get squad details
- `POST /api/community/squads/{id}/invite` - Invite user to squad

### Badges
- `GET /api/community/badges` - Get all available badges
- `GET /api/community/user/badges` - Get user's earned badges

---

## 🧪 Testing Guide

### Test Scenario 1: Join an Event

1. Navigate to Community tab
2. Tap "Join" on the "Save ₹500 This Week" event
3. **Expected**:
   - Success alert: "Successfully joined event +50 coins!"
   - Coins increase in header
   - Button changes to "Leaderboard"

### Test Scenario 2: View Event Leaderboard

1. After joining an event, tap "Leaderboard"
2. **Expected**:
   - Navigate to event leaderboard page
   - Top 5 participants shown with rankings
   - Medals for top 3 (🥇 🥈 🥉)

### Test Scenario 3: View Weekly Global Leaderboard

1. On Community tab, go to "Leaderboard" tab
2. **Expected**:
   - Shows weekly global rankings
   - Top players listed with coins and scores
   - Rank changes indicated

### Test Scenario 4: Refresh Events

1. On Community tab, pull down to refresh
2. **Expected**:
   - Events reload
   - Mock leaderboard data updates
   - Smooth refresh animation

### Test Scenario 5: Create Squad (API Ready)

Backend supports squad creation. To test:

```bash
curl -X POST http://localhost:8000/api/community/squads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-User-Id: 1" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Squad", "description": "A test squad"}'
```

**Response**:
```json
{
  "id": 1,
  "name": "Test Squad",
  "description": "A test squad",
  "owner_id": 1,
  "owner_name": "User Name",
  "member_count": 1,
  "max_members": 10,
  "created_at": "2024-04-19T10:30:00"
}
```

---

## 🎨 Design Details

### Event Type Color Scheme
- **Saving** (💰): Blue (#1A56DB)
- **Quiz** (🧠): Purple (#9333EA)
- **Marathon** (🏃): Green (#22C55E)
- **Prediction** (📈): Orange (#F97316)

### Leaderboard Medal Ranking
- 🥇 Gold - 1st place
- 🥈 Silver - 2nd place
- 🥉 Bronze - 3rd place
- \# Number - 4th+ places

### Avatar Generation
- First letter of user's name (uppercase)
- Color generated from user ID (deterministic)
- 6-color palette ensures variety

---

## 📁 File Structure

```
backend/
├── routers/
│   └── community.py         # All community endpoints
├── models/
│   └── models.py            # Event, Squad, Badge models (new)
├── schemas/
│   └── schemas.py           # Community DTOs (new)
└── db/
    └── seed.py              # Demo data seeding (updated)

frontend/
├── app/(tabs)/
│   ├── community.tsx        # Main community tab
│   └── community/
│       └── leaderboard.tsx  # Event leaderboard detail
├── components/
│   ├── EventCard.tsx        # Event card component
│   └── Leaderboard.tsx      # Leaderboard component
└── hooks/
    └── useApi.ts            # Community API functions (new)
```

---

## 🔍 Debugging Tips

### Issue: Events not loading

**Check**:
1. Backend server running: `http://localhost:8000/api/community/events`
2. User token valid in Authorization header
3. `X-User-Id` header set correctly
4. Network tab in DevTools for error response

**Fix**:
```bash
# Check if user exists in database
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: Coins not updating

**Check**:
1. Response includes `coins_earned` field
2. `updateUserCoins` called in frontend
3. Zustand store properly connected

**Fix**:
```javascript
// Manually trigger update
useAppStore.setState({
  user: { ...useAppStore.getState().user, nova_coins: 1000 }
});
```

### Issue: Leaderboard showing no data

**Check**:
1. Event exists and has participants
2. EventParticipant records seeded correctly
3. Leaderboard API returning data

**Fix**: Check seed.py output:
```bash
# Verify event participants were created
curl http://localhost:8000/api/community/leaderboard/weekly \
  -H "X-User-Id: 1"
```

---

## 📋 TODO: Phase 1 Features

Phase 1 will include:
- [ ] Squad creation and invite UI flow
- [ ] Live event system with weekly reset
- [ ] Push notifications for event start/end
- [ ] Redis-backed real-time leaderboard
- [ ] Voice-activated event entry ("Hey Novo, join this week's challenge")
- [ ] Event Feed with shareable cards
- [ ] Social features (friend invites, squad vs squad)

---

## 🤝 Contributing

To extend the community feature:

1. **Add new event type**:
   - Add to `Event.event_type` enum values
   - Create event card logic for new type
   - Add color scheme in `EventCard.tsx`

2. **Add new badge**:
   - Create badge in seed.py
   - Add badge logic in community.py
   - Award badge to users

3. **Add leaderboard filters**:
   - Create new endpoint in community.py
   - Add filter options (by event, by week, by squad)
   - Update frontend to call new endpoint

---

## 📞 Questions?

Refer to:
- [community.md](../community.md) - Full feature specification
- [Novo PRD](../Novo_PRD.docx) - Complete product requirements
- API docs: `http://localhost:8000/docs` - Auto-generated Swagger UI

---

**Last Updated**: April 19, 2024  
**Version**: Phase 0 (Hackathon Demo)  
**Status**: ✅ Ready for demo & testing
