"""
Supabase Service - Database and storage operations.
"""

from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY
import uuid
from datetime import datetime

_client: Client = None


def _get_client() -> Client:
    global _client
    if _client is None:
        active_key = SUPABASE_SERVICE_ROLE_KEY if SUPABASE_SERVICE_ROLE_KEY else SUPABASE_KEY
        _client = create_client(SUPABASE_URL, active_key)
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
    """Get scan history for a user from detections table, strictly isolated to user_id."""
    if not user_id:
        return []
    client = _get_client()
    try:
        query = client.table("detections").select("*").eq("user_id", user_id)
        result = query.order("created_at", desc=True).limit(limit).execute()
        raw_scans = result.data or []

        # If user has no detections yet or guest, also check without user filter if guest or empty
        formatted = []
        for s in raw_scans:
            advisory_obj = s.get("advisory")
            advisory_text = ""
            severity = "moderate"
            if isinstance(advisory_obj, dict):
                advisory_text = advisory_obj.get("text") or ""
                severity = advisory_obj.get("severity") or "moderate"
            elif isinstance(advisory_obj, str):
                advisory_text = advisory_obj

            formatted.append({
                "id": s.get("id"),
                "user_id": s.get("user_id"),
                "crop_name": s.get("crop_name"),
                "disease": s.get("disease_name"),
                "disease_name": s.get("disease_name"),
                "confidence": s.get("confidence"),
                "image_url": s.get("image_url"),
                "severity": severity,
                "is_healthy": "healthy" in (s.get("disease_name") or "").lower(),
                "advisory": advisory_text,
                "predictions": s.get("top_predictions") or [],
                "location": s.get("location"),
                "scanned_at": s.get("created_at"),
                "created_at": s.get("created_at"),
            })
        return formatted
    except Exception as e:
        print(f"[Database Warning] get_user_scans on detections failed: {e}")
        try:
            res2 = client.table("scans").select("*").eq("user_id", user_id).order("scanned_at", desc=True).limit(limit).execute()
            return res2.data or []
        except Exception:
            return []


async def get_scan_by_id(scan_id: str, user_id: str) -> dict:
    """Get a specific scan by ID from detections."""
    client = _get_client()
    try:
        res = client.table("detections").select("*").eq("id", scan_id).execute()
        if res.data and len(res.data) > 0:
            s = res.data[0]
            advisory_obj = s.get("advisory")
            advisory_text = advisory_obj.get("text") if isinstance(advisory_obj, dict) else (advisory_obj or "")
            severity = advisory_obj.get("severity") if isinstance(advisory_obj, dict) else "moderate"
            return {
                "id": s.get("id"),
                "user_id": s.get("user_id"),
                "crop_name": s.get("crop_name"),
                "disease": s.get("disease_name"),
                "confidence": s.get("confidence"),
                "image_url": s.get("image_url"),
                "severity": severity,
                "is_healthy": "healthy" in (s.get("disease_name") or "").lower(),
                "advisory": advisory_text,
                "predictions": s.get("top_predictions") or [],
                "location": s.get("location"),
                "scanned_at": s.get("created_at"),
            }
    except Exception as e:
        print(f"[Database Warning] get_scan_by_id on detections failed: {e}")

    try:
        result = client.table("scans").select("*").eq("id", scan_id).eq("user_id", user_id).single().execute()
        return result.data
    except Exception:
        return None


async def delete_scan(scan_id: str, user_id: str = None, token: str = None) -> bool:
    """Delete a scan record from detections (and scans table fallback)."""
    client = _get_client()
    try:
        if token:
            client.postgrest.auth(token)
        res = client.table("detections").delete().eq("id", scan_id).execute()
        if token:
            active_key = SUPABASE_SERVICE_ROLE_KEY if SUPABASE_SERVICE_ROLE_KEY else SUPABASE_KEY
            client.postgrest.auth(active_key)

        if res.data and len(res.data) > 0:
            return True

        # Fallback check on scans table
        try:
            res_scans = client.table("scans").delete().eq("id", scan_id).execute()
            if res_scans.data and len(res_scans.data) > 0:
                return True
        except Exception:
            pass

        return len(res.data or []) > 0
    except Exception as e:
        print(f"[Database Warning] delete on detections failed: {e}")
        try:
            res = client.table("scans").delete().eq("id", scan_id).execute()
            return len(res.data or []) > 0
        except Exception:
            return False



async def get_disease_stats(user_id: str) -> dict:
    """Get disease statistics for a user's dashboard."""
    if not user_id:
        return {"total_scans": 0, "healthy_scans": 0, "diseases_detected": 0, "top_disease": None}
    client = _get_client()
    try:
        query = client.table("detections").select("disease_name, confidence, advisory, created_at").eq("user_id", user_id)
        result = query.execute()
        scans = result.data or []

        total = len(scans)
        healthy = sum(1 for s in scans if "healthy" in (s.get("disease_name") or "").lower())
        diseased = total - healthy

        disease_counts = {}
        for s in scans:
            d = s.get("disease_name", "Unknown")
            disease_counts[d] = disease_counts.get(d, 0) + 1

        return {
            "total_scans": total,
            "healthy_count": healthy,
            "diseased_count": diseased,
            "disease_frequency": disease_counts,
        }
    except Exception as e:
        print(f"[Stats Error] {e}")
        return {
            "total_scans": 0,
            "healthy_count": 0,
            "diseased_count": 0,
            "disease_frequency": {},
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

        if not user_id or not (isinstance(user_id, str) and len(user_id) == 36 and "-" in user_id):
            return []
        valid_uuid = user_id

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
    if not user_id or not (isinstance(user_id, str) and len(user_id) == 36 and "-" in user_id):
        return []
    try:
        client = _get_client()
        res = client.table("chat_messages").select("*").eq("user_id", user_id).order("created_at", desc=False).limit(limit).execute()
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


# ── Farm Plots ─────────────────────────────────────────────────────────────

async def get_user_plots(user_id: str) -> list:
    """Fetch all farm plots belonging to a user."""
    try:
        client = _get_client()
        res = client.table("farm_plots").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
        return res.data or []
    except Exception as e:
        print(f"[Database Warning] get_user_plots failed: {e}")
        return []


async def get_plot_by_id(plot_id: str, user_id: str) -> dict:
    """Fetch single farm plot by ID."""
    try:
        client = _get_client()
        res = client.table("farm_plots").select("*").eq("id", plot_id).eq("user_id", user_id).single().execute()
        return res.data
    except Exception as e:
        print(f"[Database Warning] get_plot_by_id failed: {e}")
        return None


async def create_plot(user_id: str, data: dict) -> dict:
    """Create a new farm plot record."""
    client = _get_client()
    row = {
        "user_id": user_id,
        "plot_name": data.get("plot_name"),
        "area": float(data.get("area", 1.0)),
        "area_unit": data.get("area_unit", "Acres"),
        "crop": data.get("crop", "Unknown"),
        "sowing_date": data.get("sowing_date") or None,
        "soil_type": data.get("soil_type") or None,
        "notes": data.get("notes") or None,
    }
    res = client.table("farm_plots").insert(row).execute()
    return res.data[0] if res.data else row


async def update_plot(plot_id: str, user_id: str, data: dict) -> dict:
    """Update an existing farm plot record."""
    client = _get_client()
    update_data = {
        "updated_at": datetime.utcnow().isoformat(),
    }
    for field in ["plot_name", "area", "area_unit", "crop", "sowing_date", "soil_type", "notes"]:
        if field in data:
            if field == "area":
                update_data[field] = float(data[field])
            else:
                update_data[field] = data[field] or None

    res = client.table("farm_plots").update(update_data).eq("id", plot_id).eq("user_id", user_id).execute()
    return res.data[0] if res.data else {}


async def delete_plot(plot_id: str, user_id: str) -> bool:
    """Delete a farm plot."""
    client = _get_client()
    client.table("farm_plots").delete().eq("id", plot_id).eq("user_id", user_id).execute()
    return True


# ── Farm Inventory ──────────────────────────────────────────────────────────

async def get_user_inventory(user_id: str) -> list:
    """Fetch all inventory/medicine cabinet items belonging to a user."""
    try:
        client = _get_client()
        res = client.table("farm_inventory").select("*").eq("user_id", user_id).order("category").execute()
        return res.data or []
    except Exception as e:
        print(f"[Database Warning] get_user_inventory failed: {e}")
        return []


async def get_inventory_item_by_id(item_id: str, user_id: str) -> dict:
    """Fetch single inventory item by ID."""
    try:
        client = _get_client()
        res = client.table("farm_inventory").select("*").eq("id", item_id).eq("user_id", user_id).single().execute()
        return res.data
    except Exception as e:
        print(f"[Database Warning] get_inventory_item_by_id failed: {e}")
        return None


async def create_inventory_item(user_id: str, data: dict) -> dict:
    """Create a new farm inventory item."""
    client = _get_client()
    row = {
        "user_id": user_id,
        "item_name": data.get("item_name"),
        "category": data.get("category", "Other"),
        "quantity": float(data.get("quantity", 0)),
        "unit": data.get("unit", "ml"),
        "active_ingredient": data.get("active_ingredient") or None,
        "expiry_date": data.get("expiry_date") or None,
        "notes": data.get("notes") or None,
    }
    res = client.table("farm_inventory").insert(row).execute()
    return res.data[0] if res.data else row


async def update_inventory_item(item_id: str, user_id: str, data: dict) -> dict:
    """Update an existing farm inventory item."""
    client = _get_client()
    update_data = {
        "updated_at": datetime.utcnow().isoformat(),
    }
    for field in ["item_name", "category", "quantity", "unit", "active_ingredient", "expiry_date", "notes"]:
        if field in data:
            if field == "quantity":
                update_data[field] = float(data[field])
            else:
                update_data[field] = data[field] or None

    res = client.table("farm_inventory").update(update_data).eq("id", item_id).eq("user_id", user_id).execute()
    return res.data[0] if res.data else {}


async def delete_inventory_item(item_id: str, user_id: str) -> bool:
    """Delete an inventory item."""
    client = _get_client()
    client.table("farm_inventory").delete().eq("id", item_id).eq("user_id", user_id).execute()
    return True






