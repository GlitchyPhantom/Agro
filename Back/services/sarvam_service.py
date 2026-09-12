"""
Sarvam Service - Multilingual translation, TTS and STT using Sarvam API.
"""

import httpx
import base64
from config import SARVAM_API_KEY

SARVAM_BASE_URL = "https://api.sarvam.ai"

# Supported languages
LANGUAGES = {
    "en": "en-IN",
    "hi": "hi-IN",
    "bn": "bn-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "mr": "mr-IN",
    "gu": "gu-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
    "pa": "pa-IN",
    "od": "od-IN",
    "or": "od-IN",
}

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "हिंदी",
    "bn": "বাংলা",
    "ta": "தமிழ்",
    "te": "తెలుగు",
    "mr": "मराठी",
    "gu": "ગુજરાતી",
    "kn": "ಕನ್ನಡ",
    "ml": "മലയാളം",
    "pa": "ਪੰਜਾਬੀ",
    "od": "ଓଡ଼ିଆ",
}


def _headers():
    return {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
    }


async def translate_text(text: str, source_lang: str, target_lang: str) -> str:
    """Translate text between Indian languages using Sarvam API."""
    source_code = LANGUAGES.get(source_lang, source_lang)
    target_code = LANGUAGES.get(target_lang, target_lang)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{SARVAM_BASE_URL}/translate",
            headers=_headers(),
            json={
                "input": text,
                "source_language_code": source_code,
                "target_language_code": target_code,
                "mode": "formal",
                "model": "mayura:v1",
                "enable_preprocessing": True,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data.get("translated_text", text)


async def text_to_speech(text: str, language: str) -> str:
    """Convert text to speech. Returns base64 encoded audio."""
    lang_code = LANGUAGES.get(language, language)

    # Truncate text to 500 characters max as per Sarvam API requirements
    input_text = text.strip()[:500]

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{SARVAM_BASE_URL}/text-to-speech",
            headers=_headers(),
            json={
                "inputs": [input_text],
                "target_language_code": lang_code,
                "speaker": "ritu",
                "model": "bulbul:v3",
            },
        )
        response.raise_for_status()
        data = response.json()
        # Returns base64 encoded WAV audio
        audios = data.get("audios", [])
        return audios[0] if audios else None


async def speech_to_text(audio_base64: str, language: str) -> str:
    """Convert speech to text. Accepts base64 encoded audio."""
    lang_code = LANGUAGES.get(language, language)

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{SARVAM_BASE_URL}/speech-to-text",
            headers=_headers(),
            json={
                "input": audio_base64,
                "language_code": lang_code,
                "model": "saarika:v2",
            },
        )
        response.raise_for_status()
        data = response.json()
        return data.get("transcript", "")


def get_supported_languages() -> dict:
    """Return supported languages with their names."""
    return LANGUAGE_NAMES
