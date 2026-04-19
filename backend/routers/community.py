"""
Community Events, Squads, and Leaderboard endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional

from db import SessionLocal
from models import (
    Event, EventParticipant, Squad, SquadMember, Badge, UserBadge, User
)
from schemas import (
    EventResponse, EventLeaderboardResponse, LeaderboardEntryResponse,
    WeeklyLeaderboardResponse, MonthlyLeaderboardResponse, JoinEventRequest,
    JoinEventResponse, SquadResponse, CreateSquadRequest, InviteSquadRequest,
    BadgeResponse, UserBadgeResponse
)

router = APIRouter(prefix="/api/community", tags=["community"])


def get_db():
    """Dependency to get DB session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(x_user_id: int = Header(alias="X-User-Id"), db: Session = Depends(get_db)):
    """Get current user from X-User-Id header."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="Missing X-User-Id header")
    
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ============================================================================
# Events Endpoints
# ============================================================================

@router.get("/events", response_model=List[EventResponse])
def list_events(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all active and upcoming events."""
    events = db.query(Event).filter(Event.is_active == True).order_by(Event.starts_at).all()
    
    result = []
    for event in events:
        participant_count = db.query(EventParticipant).filter(
            EventParticipant.event_id == event.id
        ).count()
        
        user_joined = db.query(EventParticipant).filter(
            EventParticipant.event_id == event.id,
            EventParticipant.user_id == current_user.id
        ).first() is not None
        
        result.append(EventResponse(
            id=event.id,
            title=event.title,
            description=event.description,
            event_type=event.event_type,
            coins_reward=event.coins_reward,
            target_amount=event.target_amount,
            category_color=event.category_color,
            starts_at=event.starts_at.isoformat(),
            ends_at=event.ends_at.isoformat(),
            is_active=event.is_active,
            participant_count=participant_count,
            user_joined=user_joined
        ))
    
    return result


@router.post("/events/{event_id}/join", response_model=JoinEventResponse)
def join_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Join an event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Check if already joined
    existing = db.query(EventParticipant).filter(
        EventParticipant.event_id == event_id,
        EventParticipant.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Already joined this event")
    
    # Create participation record
    participant = EventParticipant(
        event_id=event_id,
        user_id=current_user.id,
        score=0.0,
        coins_earned=0,
        is_completed=False
    )
    db.add(participant)
    
    # Award onboarding bonus if first event
    first_event_bonus = 0
    first_event_count = db.query(EventParticipant).filter(
        EventParticipant.user_id == current_user.id
    ).count()
    
    if first_event_count == 1:
        first_event_bonus = 50
        current_user.nova_coins += first_event_bonus
    
    db.commit()
    
    return JoinEventResponse(
        success=True,
        message="Successfully joined event",
        coins_earned=first_event_bonus
    )


@router.get("/events/{event_id}/leaderboard", response_model=EventLeaderboardResponse)
def get_event_leaderboard(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get leaderboard for a specific event."""
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    participants = db.query(EventParticipant).filter(
        EventParticipant.event_id == event_id
    ).order_by(EventParticipant.score.desc(), EventParticipant.coins_earned.desc()).limit(5).all()
    
    entries = []
    for rank, participant in enumerate(participants, 1):
        user = db.query(User).filter(User.id == participant.user_id).first()
        entries.append(LeaderboardEntryResponse(
            rank=rank,
            user_id=user.id,
            user_name=user.name,
            user_avatar=user.avatar_url,
            coins=participant.coins_earned,
            score=participant.score,
            rank_change=0
        ))
    
    return EventLeaderboardResponse(
        event_id=event_id,
        event_title=event.title,
        entries=entries
    )


# ============================================================================
# Leaderboard Endpoints
# ============================================================================

@router.get("/leaderboard/weekly", response_model=WeeklyLeaderboardResponse)
def get_weekly_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get global weekly leaderboard (top 5)."""
    week_end = datetime.utcnow().date()
    week_start = week_end - timedelta(days=7)
    
    # Get top coins this week from EventParticipants
    participants = db.query(EventParticipant).filter(
        EventParticipant.joined_at >= week_start,
        EventParticipant.joined_at <= week_end
    ).all()
    
    # Group by user and sum coins
    user_coins = {}
    for p in participants:
        if p.user_id not in user_coins:
            user_coins[p.user_id] = 0
        user_coins[p.user_id] += p.coins_earned
    
    # Sort and create entries
    sorted_users = sorted(user_coins.items(), key=lambda x: x[1], reverse=True)[:5]
    
    entries = []
    for rank, (user_id, coins) in enumerate(sorted_users, 1):
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            entries.append(LeaderboardEntryResponse(
                rank=rank,
                user_id=user.id,
                user_name=user.name,
                user_avatar=user.avatar_url,
                coins=coins,
                score=float(coins),
                rank_change=0
            ))
    
    return WeeklyLeaderboardResponse(
        week_ending=week_end.isoformat(),
        entries=entries
    )


@router.get("/leaderboard/monthly", response_model=MonthlyLeaderboardResponse)
def get_monthly_leaderboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get global monthly leaderboard (top 5)."""
    now = datetime.utcnow()
    month_start = now.replace(day=1)
    
    # Get participants from this month
    participants = db.query(EventParticipant).filter(
        EventParticipant.joined_at >= month_start,
        EventParticipant.joined_at <= now
    ).all()
    
    # Group by user and sum coins
    user_coins = {}
    for p in participants:
        if p.user_id not in user_coins:
            user_coins[p.user_id] = 0
        user_coins[p.user_id] += p.coins_earned
    
    # Sort and create entries
    sorted_users = sorted(user_coins.items(), key=lambda x: x[1], reverse=True)[:5]
    
    entries = []
    for rank, (user_id, coins) in enumerate(sorted_users, 1):
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            entries.append(LeaderboardEntryResponse(
                rank=rank,
                user_id=user.id,
                user_name=user.name,
                user_avatar=user.avatar_url,
                coins=coins,
                score=float(coins),
                rank_change=0
            ))
    
    return MonthlyLeaderboardResponse(
        month=now.strftime("%Y-%m"),
        entries=entries
    )


# ============================================================================
# Squad Endpoints
# ============================================================================

@router.post("/squads", response_model=SquadResponse)
def create_squad(
    request: CreateSquadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new squad."""
    squad = Squad(
        name=request.name,
        description=request.description,
        owner_id=current_user.id,
        max_members=10
    )
    db.add(squad)
    db.flush()
    
    # Add creator as first member
    member = SquadMember(squad_id=squad.id, user_id=current_user.id)
    db.add(member)
    db.commit()
    
    # Award squad creation bonus
    current_user.nova_coins += 50
    db.commit()
    
    return SquadResponse(
        id=squad.id,
        name=squad.name,
        description=squad.description,
        owner_id=squad.owner_id,
        owner_name=current_user.name,
        member_count=1,
        max_members=squad.max_members,
        created_at=squad.created_at.isoformat()
    )


@router.post("/squads/{squad_id}/invite")
def invite_to_squad(
    squad_id: int,
    request: InviteSquadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Invite a user to squad."""
    squad = db.query(Squad).filter(Squad.id == squad_id).first()
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found")
    
    if squad.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only squad owner can invite")
    
    target_user = db.query(User).filter(User.id == request.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already a member
    existing_member = db.query(SquadMember).filter(
        SquadMember.squad_id == squad_id,
        SquadMember.user_id == request.user_id
    ).first()
    
    if existing_member:
        raise HTTPException(status_code=400, detail="User already in squad")
    
    # Check member limit
    member_count = db.query(SquadMember).filter(SquadMember.squad_id == squad_id).count()
    if member_count >= squad.max_members:
        raise HTTPException(status_code=400, detail="Squad is full")
    
    # Add member
    member = SquadMember(squad_id=squad_id, user_id=request.user_id)
    db.add(member)
    
    # Award squad bonus (3x coins for first week in squad)
    target_user.nova_coins += 150
    
    db.commit()
    
    return {"success": True, "message": "User invited to squad"}


@router.get("/squads/{squad_id}", response_model=SquadResponse)
def get_squad(
    squad_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get squad details."""
    squad = db.query(Squad).filter(Squad.id == squad_id).first()
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found")
    
    member_count = db.query(SquadMember).filter(SquadMember.squad_id == squad_id).count()
    owner = db.query(User).filter(User.id == squad.owner_id).first()
    
    return SquadResponse(
        id=squad.id,
        name=squad.name,
        description=squad.description,
        owner_id=squad.owner_id,
        owner_name=owner.name if owner else "Unknown",
        member_count=member_count,
        max_members=squad.max_members,
        created_at=squad.created_at.isoformat()
    )


@router.post("/squads/{squad_id}/leave")
def leave_squad(
    squad_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Leave a squad. If only member remains, delete the squad."""
    squad = db.query(Squad).filter(Squad.id == squad_id).first()
    if not squad:
        raise HTTPException(status_code=404, detail="Squad not found")
    
    # Check if user is a member
    member = db.query(SquadMember).filter(
        SquadMember.squad_id == squad_id,
        SquadMember.user_id == current_user.id
    ).first()
    
    if not member:
        raise HTTPException(status_code=400, detail="You are not a member of this squad")
    
    # Get current member count
    member_count = db.query(SquadMember).filter(SquadMember.squad_id == squad_id).count()
    
    # If only 1 member (the current user), delete the squad entirely
    if member_count == 1:
        db.delete(member)
        db.delete(squad)
        db.commit()
        return {"success": True, "message": "Squad deleted"}
    
    # If owner tries to leave with multiple members, prevent it
    if squad.owner_id == current_user.id and member_count > 1:
        raise HTTPException(status_code=400, detail="Squad owner cannot leave with active members. Transfer ownership or disband the squad")
    
    # Remove member
    db.delete(member)
    db.commit()
    
    return {"success": True, "message": "Successfully left the squad"}


# ============================================================================
# Badge Endpoints
# ============================================================================

@router.get("/badges", response_model=List[BadgeResponse])
def get_badges(db: Session = Depends(get_db)):
    """Get all available badges."""
    badges = db.query(Badge).all()
    return [BadgeResponse(
        id=b.id,
        name=b.name,
        description=b.description,
        image_url=b.image_url
    ) for b in badges]


@router.get("/user/badges", response_model=List[UserBadgeResponse])
def get_user_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get badges earned by current user."""
    user_badges = db.query(UserBadge).filter(
        UserBadge.user_id == current_user.id
    ).all()
    
    result = []
    for ub in user_badges:
        badge = db.query(Badge).filter(Badge.id == ub.badge_id).first()
        if badge:
            result.append(UserBadgeResponse(
                id=badge.id,
                name=badge.name,
                description=badge.description,
                image_url=badge.image_url,
                earned_at=ub.earned_at.isoformat()
            ))
    
    return result


# ============================================================================
# Admin Endpoints (Event Management)
# ============================================================================

@router.post("/admin/reset-weekly-events")
def reset_weekly_events(db: Session = Depends(get_db)):
    """
    Reset weekly events.
    - Archive previous week's events
    - Create new week's events
    - Reset leaderboard rankings
    
    In production, this should be protected by admin authentication
    and called via Celery scheduler every Monday at 00:00 UTC.
    """
    try:
        now = datetime.utcnow()
        
        # Mark previous week's events as inactive
        previous_week_events = db.query(Event).filter(
            Event.is_active == True,
            Event.event_type.in_(['saving', 'quiz', 'marathon'])
        ).all()
        
        for event in previous_week_events:
            event.is_active = False
        
        db.commit()
        
        # Create new weekly events (starting tomorrow)
        tomorrow = now + timedelta(days=1)
        week_later = tomorrow + timedelta(days=7)
        
        new_events = [
            Event(
                title="Weekly Saving Challenge",
                description="Save money this week and earn coins based on your target!",
                event_type="saving",
                coins_reward=100,
                target_amount=500.0,
                category_color="green",
                starts_at=tomorrow,
                ends_at=week_later,
                is_active=True
            ),
            Event(
                title="Quiz Master Battle",
                description="Answer 10 financial literacy questions correctly",
                event_type="quiz",
                coins_reward=80,
                target_amount=10.0,
                category_color="purple",
                starts_at=tomorrow,
                ends_at=week_later,
                is_active=True
            ),
            Event(
                title="30-Day Marathon",
                description="Check in for 7 consecutive days",
                event_type="marathon",
                coins_reward=150,
                target_amount=7.0,
                category_color="orange",
                starts_at=tomorrow,
                ends_at=week_later,
                is_active=True
            ),
        ]
        
        for event in new_events:
            db.add(event)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Weekly events reset successfully",
            "archived_events": len(previous_week_events),
            "new_events": len(new_events)
        }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
