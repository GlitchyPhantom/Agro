"""
Supabase Service - Database and storage operations.
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY
import uuid
from datetime import datetime

_client: Client = None


def _get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return _client


# ── Image Storage ────────────────────────────────────────────────────────────

async def upload_image(image_bytes: bytes, filename: str, user_id: str) -> str:
    """Upload image to Supabase storage bucket. Returns public URL."""
    try:
        client = _get_client()
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
        storage_path = f"{user_id}/{uuid.uuid4().hex}.{ext}"

        client.storage.from_("plant-images").upload(
            storage_path,
            image_bytes,
            file_options={"content-type": f"image/{ext}", "upsert": "true"},
        )

        return client.storage.from_("plant-images").get_public_url(storage_path)
    except Exception as e:
        print(f"[Storage Warning] Could not upload image to Supabase bucket: {e}")
        return ""


# ── Scan History ─────────────────────────────────────────────────────────────

async def save_scan(
    user_id: str,
    image_url: str,
    disease: str,
    confidence: float,
    severity: str,
    is_healthy: bool,
    advisory: str,
    predictions: list,
    location: str = None,
) -> dict:
    """Save a scan record to the database."""
    try:
        client = _get_client()

        # Try inserting into 'detections' table
        try:
            record = {
                "user_id": user_id,
                "crop_name": disease.split("_")[0] if "_" in disease else "Crop",
                "disease_name": disease,
                "confidence": confidence,
                "image_url": image_url,
                "top_predictions": predictions,
                "advisory": {"text": advisory, "severity": severity},
                "location": location,
            }
            result = client.table("detections").insert(record).execute()
            return result.data[0] if result.data else record
        except Exception:
            # Fallback to 'scans' table
            record = {
                "user_id": user_id,
                "image_url": image_url,
                "disease": disease,
                "confidence": confidence,
                "severity": severity,
                "is_healthy": is_healthy,
                "advisory": advisory,
                "predictions": predictions,
                "location": location,
                "scanned_at": datetime.utcnow().isoformat(),
            }
            result = client.table("scans").insert(record).execute()
            return result.data[0] if result.data else record
    except Exception as e:
        print(f"[Database Warning] Save scan failed: {e}")
        return {}


async def get_user_scans(user_id: str, limit: int = 50) -> list:
    """Get scan history for a user, most recent first."""
    client = _get_client()

    result = (
        client.table("scans")
        .select("*")
        .eq("user_id", user_id)
        .order("scanned_at", desc=True)
        .limit(limit)
        .execute()
    )

    return result.data or []


async def get_scan_by_id(scan_id: str, user_id: str) -> dict:
    """Get a specific scan by ID."""
    client = _get_client()

    result = (
        client.table("scans")
        .select("*")
        .eq("id", scan_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )

    return result.data


async def delete_scan(scan_id: str, user_id: str) -> bool:
    """Delete a scan record."""
    client = _get_client()

    client.table("scans").delete().eq("id", scan_id).eq("user_id", user_id).execute()
    return True


async def get_disease_stats(user_id: str) -> dict:
    """Get disease statistics for a user's dashboard."""
    client = _get_client()

    result = (
        client.table("scans")
        .select("disease, severity, is_healthy, scanned_at")
        .eq("user_id", user_id)
        .execute()
    )

    scans = result.data or []
    total = len(scans)
    healthy = sum(1 for s in scans if s.get("is_healthy"))
    diseased = total - healthy

    # Disease frequency
    disease_counts = {}
    for s in scans:
        d = s.get("disease", "Unknown")
        disease_counts[d] = disease_counts.get(d, 0) + 1

    return {
        "total_scans": total,
        "healthy_count": healthy,
        "diseased_count": diseased,
        "disease_frequency": disease_counts,
    }


# ── Chat History Storage ───────────────────────────────────────────────────

async def save_chat_message(
    user_id: str,
    user_query: str,
    bot_response: str,
    session_id: str = None,
    language: str = "en"
) -> list:
    """Save user query and AI bot response rows into chat_messages table matching database schema."""
    try:
        client = _get_client()

        # Format user_id as valid UUID or fallback to default user UUID
        valid_uuid = user_id if (isinstance(user_id, str) and len(user_id) == 36 and "-" in user_id) else "dded15c6-cfc7-4aa4-845e-f7217c5965e1"

        rows = [
            {
                "user_id": valid_uuid,
                "sender": "user",
                "message": user_query,
                "language": language,
            },
            {
                "user_id": valid_uuid,
                "sender": "assistant",
                "message": bot_response,
                "language": language,
            },
        ]

        if session_id:
            rows[0]["session_id"] = session_id
            rows[1]["session_id"] = session_id

        try:
            result = client.table("chat_messages").insert(rows).execute()
            print(f"[Supabase DB Success] Saved {len(result.data or [])} messages to chat_messages table!")
            return result.data or []
        except Exception as e1:
            # Fallback without session_id if column isn't created in Supabase yet
            for r in rows:
                r.pop("session_id", None)
            result = client.table("chat_messages").insert(rows).execute()
            return result.data or []
    except Exception as e:
        print(f"[Database Warning] save_chat_message failed: {e}")
        return []


async def get_user_chat_history(user_id: str, limit: int = 50) -> list:
    """Fetch stored chat messages for user from chat_messages table."""
    try:
        client = _get_client()
        valid_uuid = user_id if (isinstance(user_id, str) and len(user_id) == 36 and "-" in user_id) else "dded15c6-cfc7-4aa4-845e-f7217c5965e1"

        res = client.table("chat_messages").select("*").eq("user_id", valid_uuid).order("created_at", desc=False).limit(limit).execute()
        return res.data or []
    except Exception as e:
        print(f"[Database Warning] get_user_chat_history failed: {e}")
        return []


async def delete_chat_thread_messages(user_id: str, session_id: str = None) -> bool:
    """Delete chat thread messages for a specific session_id from Supabase database."""
    try:
        client = _get_client()
        if session_id and len(str(session_id)) > 0:
            client.table("chat_messages").delete().eq("session_id", str(session_id)).execute()
            print(f"[Supabase DB Delete] Deleted session_id {session_id}")
            return True
        return False
    except Exception as e:
        print(f"[Database Warning] delete_chat_thread_messages failed: {e}")
        return False





