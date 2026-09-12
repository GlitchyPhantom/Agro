"""
History Router - Scan history and statistics.
"""

from fastapi import APIRouter, HTTPException, Header
from services.supabase_service import get_user_scans, get_scan_by_id, delete_scan, get_disease_stats

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history")
async def get_history(
    x_user_id: str = Header(..., alias="X-User-Id"),
    limit: int = 50,
):
    """Get scan history for the authenticated user."""
    try:
        scans = await get_user_scans(x_user_id, limit)
        return {"scans": scans, "count": len(scans)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history/{scan_id}")
async def get_scan(
    scan_id: str,
    x_user_id: str = Header(..., alias="X-User-Id"),
):
    """Get a specific scan by ID."""
    try:
        scan = await get_scan_by_id(scan_id, x_user_id)
        if not scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        return scan
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/history/{scan_id}")
async def remove_scan(
    scan_id: str,
    x_user_id: str = Header(..., alias="X-User-Id"),
):
    """Delete a scan record."""
    try:
        await delete_scan(scan_id, x_user_id)
        return {"message": "Scan deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_stats(
    x_user_id: str = Header(None, alias="X-User-Id"),
):
    """Get disease statistics for the dashboard."""
    try:
        if not x_user_id:
            return {"total_scans": 0, "healthy_scans": 0, "diseases_detected": 0, "top_disease": None}
        stats = await get_disease_stats(x_user_id)
        return stats
    except Exception as e:
        print(f"[Stats Error] {e}")
        return {"total_scans": 0, "healthy_scans": 0, "diseases_detected": 0, "top_disease": None}
