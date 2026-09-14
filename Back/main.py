"""
AgroIntel Backend - FastAPI Application
AI-Based Plant Disease Detection and Advisory System
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import predict, chat, history, sarvam, resources

app = FastAPI(
    title="AgroIntel API",
    description="AI-Based Plant Disease Detection and Advisory System",
    version="1.0.0",
)

# CORS - allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(predict.router)
app.include_router(chat.router)
app.include_router(history.router)
app.include_router(sarvam.router)
app.include_router(resources.router)



@app.get("/")
async def root():
    return {
        "name": "AgroIntel API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "predict": "POST /api/predict",
            "chat": "POST /api/chat",
            "history": "GET /api/history",
            "stats": "GET /api/stats",
            "translate": "POST /api/translate",
            "tts": "POST /api/tts",
            "stt": "POST /api/stt",
            "languages": "GET /api/languages",
        },
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

