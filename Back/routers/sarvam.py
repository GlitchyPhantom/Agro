"""
Sarvam Router - Multilingual translation, TTS, and STT endpoints.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.sarvam_service import (
    translate_text,
    text_to_speech,
    speech_to_text,
    get_supported_languages,
)

router = APIRouter(prefix="/api", tags=["multilingual"])


class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "en"
    target_lang: str = "hi"


class TTSRequest(BaseModel):
    text: str
    language: str = "hi"


class STTRequest(BaseModel):
    audio: str  # base64 encoded audio
    language: str = "hi"


@router.get("/languages")
async def languages():
    """Get list of supported languages."""
    return {"languages": get_supported_languages()}


@router.post("/translate")
async def translate(request: TranslateRequest):
    """Translate text between Indian languages."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        translated = await translate_text(
            request.text, request.source_lang, request.target_lang
        )
        return {"translated_text": translated, "target_lang": request.target_lang}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Translation error: {str(e)}")


@router.post("/tts")
async def tts(request: TTSRequest):
    """Convert text to speech. Returns base64 audio."""
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        audio_base64 = await text_to_speech(request.text, request.language)
        return {"audio": audio_base64, "language": request.language}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS error: {str(e)}")


@router.post("/stt")
async def stt(request: STTRequest):
    """Convert speech to text. Accepts base64 audio."""
    if not request.audio:
        raise HTTPException(status_code=400, detail="Audio data required")

    try:
        transcript = await speech_to_text(request.audio, request.language)
        return {"transcript": transcript, "language": request.language}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"STT error: {str(e)}")
