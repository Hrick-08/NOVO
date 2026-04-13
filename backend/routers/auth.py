"""
Authentication routes.
"""

from fastapi import APIRouter, HTTPException, Header, Depends
from sqlalchemy.orm import Session
from db import get_db
from models import User
from schemas import RegisterRequest, LoginRequest
from passlib.context import CryptContext

# Password hashing context - using pbkdf2 for better compatibility
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user or get existing user."""
    existing = db.query(User).filter(User.email == request.email).first()
    if existing:
        return {"user_id": existing.id, "name": existing.name}
    
    # Hash password if provided
    password_hash = pwd_context.hash(request.password) if request.password else None
    
    user = User(
        name=request.name,
        email=request.email,
        password_hash=password_hash,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"user_id": user.id, "name": user.name}


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Login user with email and password."""
    user = db.query(User).filter(User.email == request.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password if it exists
    if user.password_hash:
        if not pwd_context.verify(request.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")
    
    return {
        "user_id": user.id,
        "name": user.name,
        "email": user.email,
        "nova_coins": user.nova_coins,
    }


@router.post("/logout")
def logout(x_user_id: int = Header(alias="X-User-Id"), db: Session = Depends(get_db)):
    """Logout user by validating user exists and clearing server-side session data if any."""
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # In a stateless architecture, logout mainly involves client-side cleanup.
    # But we validate user exists and return success.
    return {"message": "Logged out successfully", "user_id": user.id}


@router.get("/me")
def get_me(x_user_id: int = Header(alias="X-User-Id"), db: Session = Depends(get_db)):
    """Get current user information."""
    user = db.query(User).filter(User.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "nova_coins": user.nova_coins,
        "created_at": user.created_at,
    }
