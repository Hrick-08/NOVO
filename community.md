# 🏆 Novo — Community & Events Tab

> Complete feature spec, implementation notes, and design context for the Community pillar of Novo.

---

## Overview

The Community tab is Novo's biggest differentiator. No Indian fintech app has cracked social finance for Gen-Z. While GPay has payments, Zerodha has investing, and CRED has rewards — none of them have a community layer that gives users a reason to open the app every day for something other than transacting.

The core insight: **Gen-Z doesn't just want tools. They want to participate.**

---

## Position in the App

Community is Pillar 2 of Novo's five-pillar architecture:

| # | Pillar | Purpose |
|---|--------|---------|
| 1 | Payments & Nova Coins | Entry point and daily habit loop |
| **2** | **Community & Events** | **Retention and social flywheel** |
| 3 | AI Investing Agent | Fear removal and guidance |
| 4 | AI Portfolio Builder | Personalized financial planning |
| 5 | Financial Identity | Personality and progression |

---

## Core Features

### Weekly Events Hub
- A dedicated **Discover page** surfacing active challenges every week
- Event types include:
  - 💰 **Saving challenges** — save ₹X by Sunday
  - 🧠 **Financial quizzes** — answer 5 questions about investing, win coins
  - 🏃 **Step marathons** — physical activity tied to coin rewards
  - 📈 **Stock prediction contests** — guess which stock rises more this week (coins only, no real money)
- New events drop every Monday with a push notification
- Events have a timer/countdown visible on the card

### Nova Coins Rewards
- Completing events earns **bonus Nova Coins** on top of regular payment rewards
- Top performers earn **exclusive badges** and **higher coin earn multipliers**
- Coins earned from events feed directly into the same wallet used for the Novo Store

### Squads
- Users can create or join a **Squad of up to 10 friends**
- Squads have a shared dashboard showing:
  - Collective savings this week
  - Each member's coin balance (opt-in visibility)
  - Active shared challenges
- Squads can run **private challenges** visible only to members
- Squad formation is incentivized at onboarding: **3x coins for your first week in a squad**

### Squad Investing Pot *(Phase 2)*
- Squads can pool coins or real money into a **shared micro-investment account**
- All members vote on allocation — democratic investing
- Returns split proportionally based on contribution
- This is the most socially novel feature in the roadmap — no Indian fintech app does this

### Leaderboard
- **Weekly and monthly leaderboards** for:
  - Total coins earned
  - Saving streak length
  - Event completion count
- Two views: **Global** (all Novo users) and **Squad** (private to your group)
- Resets weekly to keep competition fresh and give new users a fair shot

### Coin Prediction Bets
- During events, users bet **coins (not real money)** on outcomes
  - Example: "Which stock rises more this week — HDFC or Infosys?"
  - Winners split the coin pool
- Pure coins only — no regulatory implications, no real money at risk
- Adds a **fantasy-sports energy** to financial literacy

### Event Feed *(Phase 2)*
- Social feed showing what squads and friends are doing:
  - Events joined
  - Badges earned
  - Milestones hit (e.g., "Devyansh just hit a 30-day saving streak! 🔥")
- Shareable cards for Instagram/WhatsApp Stories

---

## User Flow

```
Monday push notification: "This week's challenge: Save ₹500 by Sunday!"
  → User opens app → Events tab
  → Taps "Join Challenge"
  → Invites squad members
  → Real-time leaderboard appears during the week
  → Sunday: Results published
  → Winners receive bonus coins + badge
  → Weekly Money Roast card generated (shareable)
```

---

## Nova Coins Integration

Community events are a **secondary earn channel** on top of payments:

| Action | Coins Earned |
|--------|-------------|
| Complete a saving challenge | 50–200 coins (scales with target amount) |
| Win a quiz event | 100 coins |
| Top 3 on weekly leaderboard | 250 coins |
| Squad completes a challenge together | 150 coins per member |
| First event joined | 50 bonus coins (onboarding) |
| 7-day event participation streak | 2x multiplier for that week |

---

## Engagement Flywheel

```
User joins event
  → invites friends to squad
    → squad creates social accountability
      → users open app daily to check leaderboard
        → more transactions = more coins
          → coins redeemed in Novo Store
            → user wants more coins
              → joins next event
```

This loop is the core of Novo's DAU/MAU strategy. Target: **60% of active users participate in weekly events by Month 12**.

---

## KPIs

| Metric | Month 3 Target | Month 12 Target |
|--------|---------------|----------------|
| Weekly Event Participation Rate | 40% of active users | 60% of active users |
| Squad Formation Rate | 20% of users in a squad | 45% of users in a squad |
| Event Feed Share Rate | 10% of weekly roasts shared | 25% of weekly roasts shared |
| Avg. events joined per active user/month | 2 | 4 |

---

## Roadmap

### Phase 0 — Hackathon Demo
- [ ] Static events page with one sample challenge
- [ ] Coins awarded on challenge completion (mock)
- [ ] Basic leaderboard (top 5 users by coins)

### Phase 1 — MVP (Months 1–3)
- [ ] Live event system with weekly reset
- [ ] Squad creation and invite flow
- [ ] Push notifications for event start/end
- [ ] Real-time leaderboard (Redis-backed)
- [ ] Badge system (5 starter badges)

### Phase 2 — Growth (Months 4–6)
- [ ] Squad Investing Pot
- [ ] Coin Prediction Bets
- [ ] Event Feed with shareable cards
- [ ] Voice-activated event entry ("Hey Novo, join this week's challenge")
- [ ] iOS launch

### Phase 3 — Scale (Months 7–12)
- [ ] Local partner events (campus marathons, college quiz nights)
- [ ] Brand-sponsored challenges (e.g., "Zomato Week: Save ₹200 on food, earn 500 coins")
- [ ] Squad vs Squad tournaments
- [ ] Carbon finance challenges (spend at eco brands, earn bonus coins)

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React Native (Expo) | Events tab, leaderboard, squad UI |
| Backend | FastAPI | Event management, squad logic |
| Real-time | Redis | Leaderboard scoring, live event state |
| Async jobs | Celery + Redis | Weekly event reset, notification dispatch |
| Database | PostgreSQL | Squad memberships, event history, badge records |
| Push notifications | Expo Notifications | Event start/end, squad invites |

### Key Backend Endpoints (planned)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/events` | List active and upcoming events |
| `POST` | `/events/{id}/join` | Join an event |
| `GET` | `/events/{id}/leaderboard` | Get event leaderboard |
| `POST` | `/squads` | Create a squad |
| `POST` | `/squads/{id}/invite` | Invite a user to squad |
| `GET` | `/squads/{id}` | Get squad details + member stats |
| `GET` | `/leaderboard/weekly` | Global weekly coin leaderboard |
| `GET` | `/leaderboard/monthly` | Global monthly leaderboard |

---

## Design Notes

- Community tab uses the same **#1A56DB** primary blue as the rest of the app
- Event cards use **color-coded borders** by type: blue (saving), purple (quiz), green (marathon), orange (prediction)
- Leaderboard shows **rank delta** (↑3 / ↓1) since last week to give users momentum feedback
- Squad member avatars use initials + a color derived from their user ID for consistency without requiring profile photos
- The onboarding squad prompt appears after the first successful payment with a **"Bring your crew, earn 3x"** CTA

---

## Competitive Context

| Feature | Novo | GPay | CRED | Zerodha | Groww |
|---------|------|------|------|---------|-------|
| Weekly Events | ✅ | ❌ | ❌ | ❌ | ❌ |
| Squad System | ✅ | ❌ | ❌ | ❌ | ❌ |
| Squad Investing | ✅ | ❌ | ❌ | ❌ | ❌ |
| Coin Prediction Bets | ✅ | ❌ | ❌ | ❌ | ❌ |
| Social Feed | ✅ | ❌ | ❌ | ❌ | ❌ |
| Leaderboard | ✅ | ❌ | Partial | ❌ | ❌ |

The community tab is Novo's **primary moat** — it cannot be bolted onto an existing payment or investing app without a full UX rebuild.

---

## Related Docs

- [`README.md`](./README.md) — Full project overview
- [`PRD`](./Novo_PRD.docx) — Complete product requirements including all five pillars
- [`community.md`](./community.md) — This file
