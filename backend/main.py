import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("lexiq.main")

app = FastAPI(title="LexiQ Backend", version="2.0.0")

# CORS (allow localhost dev)
frontend_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://localhost:8081",
    "http://127.0.0.1:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=frontend_origins + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach routers conditionally to avoid hard crashes if optional deps are missing in dev
try:
    from .lexiq_api import router as lexiq_router
    app.include_router(lexiq_router)
    logger.info("LexiQ API router mounted at /api/v2/lexiq")
except Exception as e:
    logger.warning(f"LexiQ API router not mounted: {e}")


@app.get("/")
async def root():
    return {"service": "lexiq-backend", "version": "2.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "lexiq-backend", "router_mounted": 'lexiq_api' in globals()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=int(os.environ.get("PORT", 8000)), reload=True)
