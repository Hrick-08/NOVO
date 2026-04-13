"""
FastAPI Payment Application with modular structure.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import database and models
from db import engine, Base, SessionLocal
from db.seed import seed_demo_data
from routers import (
    auth_router,
    profile_router,
    payments_router,
    collections_router,
    purchases_router,
    qr_router,
)
from routers.test import router as test_router

load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Payment App API",
    description="Nova Coins - Payment and Rewards System",
    version="1.0.0",
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create all database tables
Base.metadata.create_all(bind=engine)

# Seed demo data on startup
with SessionLocal() as seed_session:
    seed_demo_data(seed_session)

# Include routers
app.include_router(test_router)
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(payments_router)
app.include_router(collections_router)
app.include_router(purchases_router)
# app.include_router(qr_router)
