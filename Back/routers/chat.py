"""
Chat Router - AI-powered agricultural chatbot.
"""

from fastapi import APIRouter, HTTPException, Header, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional
from services.groq_service import chat_with_ai
from services.supabase_service import save_chat_message, get_user_chat_history, delete_chat_thread_messages

router = APIRouter(prefix="/api", tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None
    user_id: Optional[str] = "guest"
    mode: Optional[str] = "General"
    language: Optional[str] = "en"
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    saved: Optional[bool] = True


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    background_tasks: BackgroundTasks,
    x_user_id: Optional[str] = Header(None, alias="X-User-Id")
):
    """
    Chat with the AgroIntel AI assistant.
    Asynchronously stores user query & AI response rows in background without blocking response.
    """
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    user_id = x_user_id or request.user_id or "guest"

    history = None
    if request.history:
        history = [{"role": m.role, "content": m.content} for m in request.history]

    try:
        reply = await chat_with_ai(request.message, history, request.language or "en")

        # Store user prompt & AI response in background (non-blocking)
        background_tasks.add_task(
            save_chat_message,
            user_id=user_id,
            user_query=request.message,
            bot_response=reply,
            session_id=request.session_id,
            language=request.language or "en"
        )

        return ChatResponse(reply=reply, saved=True)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI service error: {str(e)}")


@router.get("/chat/history")
async def get_chats(
    x_user_id: str = Header(..., alias="X-User-Id"),
    limit: int = 50
):
    """Get stored chat records for authenticated user."""
    try:
        chats = await get_user_chat_history(x_user_id, limit)
        return {"chats": chats, "count": len(chats)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/chat/thread/{thread_id}")
async def delete_thread(
    thread_id: str,
    x_user_id: str = Header(..., alias="X-User-Id")
):
    """Delete a chat thread and all its queries/responses from database."""
    try:
        success = await delete_chat_thread_messages(x_user_id, thread_id)
        return {"message": "Chat thread deleted successfully", "success": success}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
