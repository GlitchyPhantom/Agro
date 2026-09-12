"""
Predict Router - Disease detection via image upload.
"""

from fastapi import APIRouter, UploadFile, File, Header, HTTPException
from services.model_service import predict_disease
from services.groq_service import get_disease_advisory
from services.supabase_service import upload_image, save_scan

router = APIRouter(prefix="/api", tags=["prediction"])


@router.post("/predict")
async def predict(
    file: UploadFile = File(...),
    x_user_id: str = Header(None, alias="X-User-Id"),
    x_location: str = Header(None, alias="X-Location"),
):
    """
    Upload a plant leaf image and get disease prediction with advisory.
    Returns top-3 predictions, severity level, and treatment recommendations.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    image_bytes = await file.read()

    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Empty file uploaded")

    # Run CNN prediction
    result = predict_disease(image_bytes)

    # Get advisory from Groq LLM (only if disease detected)
    advisory = None
    if not result["is_healthy"]:
        try:
            from services.groq_service import get_disease_advisory
            advisory = await get_disease_advisory(
                disease=result["primary_disease"],
                severity=result["severity"],
                confidence=result["primary_confidence"],
            )
        except Exception as e:
            import traceback
            print(f"[Groq Advisory Error Exception]: {e}")
            traceback.print_exc()
            advisory = f"⚠️ Groq Advisory Error: {e}"

    result["advisory"] = advisory

    # Always upload image to Supabase storage bucket (works for guest & authenticated users)
    upload_user_id = x_user_id or "guest"
    try:
        image_url = await upload_image(image_bytes, file.filename, upload_user_id)
        result["image_url"] = image_url

        if x_user_id:
            scan_record = await save_scan(
                user_id=x_user_id,
                image_url=image_url,
                disease=result["primary_disease"],
                confidence=result["primary_confidence"],
                severity=result["severity"],
                is_healthy=result["is_healthy"],
                advisory=advisory or "",
                predictions=result["predictions"],
                location=x_location,
            )
            result["scan_id"] = scan_record.get("id")
    except Exception as e:
        print(f"[Storage Warning] {e}")
        result["storage_error"] = str(e)

    return result
