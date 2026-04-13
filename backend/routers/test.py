"""
Test endpoints for debugging.
"""

from fastapi import APIRouter

router = APIRouter(tags=["test"])


@router.get("/test")
def test():
    """Test endpoint to verify backend is running."""
    print("[DEBUG] Test endpoint called")
    return {"status": "ok", "message": "Backend is running"}


@router.post("/test-post")
def test_post():
    """Test POST endpoint."""
    print("[DEBUG] Test POST endpoint called")
    return {"status": "ok", "message": "POST is working"}

@router.get("/health")
def health():
    """Health check endpoint."""
    print("[DEBUG] Health check endpoint called")
    return {"status": "NOVO backend running smoothly"}