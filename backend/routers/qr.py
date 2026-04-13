"""
QR code parsing routes.
"""

import io
from fastapi import APIRouter, HTTPException, File, UploadFile
from PIL import Image
from pyzbar.pyzbar import decode

router = APIRouter(prefix="/qr", tags=["qr"])


@router.post("/parse")
async def parse_qr(file: UploadFile = File(...)):
    """Parse UPI QR code from image."""
    image_data = await file.read()

    try:
        image = Image.open(io.BytesIO(image_data))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file")

    decoded_objects = decode(image)

    if not decoded_objects:
        raise HTTPException(status_code=400, detail="No QR code found")

    qr_data = decoded_objects[0].data.decode("utf-8")

    if not qr_data.startswith("upi://"):
        raise HTTPException(status_code=400, detail="Not a valid UPI QR code")

    query = qr_data.split("?", 1)[1] if "?" in qr_data else ""
    params = {}
    for pair in query.split("&"):
        if "=" in pair:
            key, value = pair.split("=", 1)
            params[key] = value

    return {
        "pa": params.get("pa", ""),
        "pn": params.get("pn", ""),
        "am": params.get("am", ""),
        "tn": params.get("tn", ""),
    }
