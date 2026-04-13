"""Routers module."""
from .auth import router as auth_router, pwd_context
from .profile import router as profile_router
from .payments import router as payments_router
from .collections import router as collections_router
from .purchases import router as purchases_router
from .qr import router as qr_router
from .test import router as test_router

__all__ = [
    "auth_router",
    "profile_router",
    "payments_router",
    "collections_router",
    "purchases_router",
    "qr_router",
    "test_router",
]
