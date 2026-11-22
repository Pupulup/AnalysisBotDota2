
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.matches import router as matches_router
from app.api.routes.guides import router as guides_router
from app.api.routes.players import router as players_router


app = FastAPI(
    title="Dota Analytics API",
    description="Backend for Dota Analytics Telegram Mini App",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(matches_router)
app.include_router(guides_router)
app.include_router(players_router)


@app.get("/")
async def root():
    return {
        "application": "Dota Analytics",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "service": "backend"
    }
