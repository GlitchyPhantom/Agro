"""
Resources Router - Farm Plots and Farm Inventory CRUD endpoints.
"""

from fastapi import APIRouter, HTTPException, Header, Body
from typing import Optional, Dict, Any, List
from services.supabase_service import (
    get_user_plots,
    get_plot_by_id,
    create_plot,
    update_plot,
    delete_plot,
    get_user_inventory,
    get_inventory_item_by_id,
    create_inventory_item,
    update_inventory_item,
    delete_inventory_item,
)

router = APIRouter(prefix="/api", tags=["resources"])


# ── Farm Plots ─────────────────────────────────────────────────────────────

@router.get("/plots")
async def list_plots(x_user_id: str = Header(..., alias="X-User-Id")):
    """Get all farm plots for authenticated user."""
    try:
        plots = await get_user_plots(x_user_id)
        return {"plots": plots, "count": len(plots)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/plots")
async def add_plot(
    data: Dict[str, Any] = Body(...),
    x_user_id: str = Header(..., alias="X-User-Id")
):
    """Add a new farm plot."""
    try:
        if not data.get("plot_name") or not data.get("crop"):
            raise HTTPException(status_code=400, detail="plot_name and crop are required")
        new_plot = await create_plot(x_user_id, data)
        return {"plot": new_plot, "message": "Farm plot created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/plots/{plot_id}")
async def edit_plot(
    plot_id: str,
    data: Dict[str, Any] = Body(...),
    x_user_id: str = Header(..., alias="X-User-Id")
):
    """Update an existing farm plot."""
    try:
        updated = await update_plot(plot_id, x_user_id, data)
        return {"plot": updated, "message": "Farm plot updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/plots/{plot_id}")
async def remove_plot(
    plot_id: str,
    x_user_id: str = Header(..., alias="X-User-Id")
):
    """Delete a farm plot."""
    try:
        await delete_plot(plot_id, x_user_id)
        return {"message": "Farm plot deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Farm Inventory ──────────────────────────────────────────────────────────

@router.get("/inventory")
async def list_inventory(x_user_id: str = Header(..., alias="X-User-Id")):
    """Get all farm inventory / medicine items for authenticated user."""
    try:
        items = await get_user_inventory(x_user_id)
        return {"inventory": items, "count": len(items)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory")
async def add_inventory(
    data: Dict[str, Any] = Body(...),
    x_user_id: str = Header(..., alias="X-User-Id")
):
    """Add a new item to inventory."""
    try:
        if not data.get("item_name") or not data.get("category"):
            raise HTTPException(status_code=400, detail="item_name and category are required")
        new_item = await create_inventory_item(x_user_id, data)
        return {"item": new_item, "message": "Inventory item added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/inventory/{item_id}")
async def edit_inventory(
    item_id: str,
    data: Dict[str, Any] = Body(...),
    x_user_id: str = Header(..., alias="X-User-Id")
):
    """Update an existing inventory item."""
    try:
        updated = await update_inventory_item(item_id, x_user_id, data)
        return {"item": updated, "message": "Inventory item updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/inventory/{item_id}")
async def remove_inventory(
    item_id: str,
    x_user_id: str = Header(..., alias="X-User-Id")
):
    """Delete an inventory item."""
    try:
        await delete_inventory_item(item_id, x_user_id)
        return {"message": "Inventory item deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
