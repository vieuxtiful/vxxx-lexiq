"""
Main FastAPI Application for LexiQ Backend
Integrates all services: Hot Match, Consistency Checks, and LexiQ Engine
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="LexiQ Backend API",
    description="Comprehensive translation quality assurance backend",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
try:
    from .hot_match_api import router as hot_match_router
    app.include_router(hot_match_router)
    logger.info("✅ Hot Match API loaded")
except Exception as e:
    logger.warning(f"⚠️ Hot Match API not loaded: {e}")

try:
    from .integrated_lqa_api import router as lqa_router
    app.include_router(lqa_router)
    logger.info("✅ Integrated LQA API loaded")
except Exception as e:
    logger.warning(f"⚠️ Integrated LQA API not loaded: {e}")


@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "LexiQ Backend API",
        "version": "2.0.0",
        "status": "operational",
        "endpoints": {
            "hot_matches": "/api/v2/hot-matches",
            "lqa": "/api/v2/lqa",
            "health": "/health",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    """Comprehensive health check"""
    health_status = {
        "status": "healthy",
        "version": "2.0.0",
        "services": {}
    }

    # Check Hot Match service
    try:
        from .hot_match_detector import HotMatchDetector
        detector = HotMatchDetector()
        health_status["services"]["hot_match"] = "available"
    except Exception as e:
        health_status["services"]["hot_match"] = f"unavailable: {str(e)}"

    # Check Consistency Check service
    try:
        from .LexiQ_ConsistencyChecker_Type import ConsistencyCheckService
        service = ConsistencyCheckService()
        health_status["services"]["consistency_check"] = "available"
    except Exception as e:
        health_status["services"]["consistency_check"] = f"unavailable: {str(e)}"

    # Check LexiQ Engine
    try:
        sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))
        from lexiq_engine_01_oct_2025 import EnhancedLexiQEngine
        engine = EnhancedLexiQEngine()
        health_status["services"]["lexiq_engine"] = "available"
    except Exception as e:
        health_status["services"]["lexiq_engine"] = f"unavailable: {str(e)}"

    # Determine overall status
    unavailable_services = [
        name for name, status in health_status["services"].items()
        if not status.startswith("available")
    ]

    if unavailable_services:
        health_status["status"] = "degraded"
        health_status["unavailable_services"] = unavailable_services

    return health_status


@app.get("/api/info")
async def api_info():
    """API information and capabilities"""
    return {
        "api_version": "2.0.0",
        "capabilities": {
            "hot_match_detection": True,
            "consistency_checks": True,
            "lexiq_semantic_analysis": True,
            "integrated_lqa": True,
            "batch_processing": True,
            "caching": True,
            "offline_mode": True
        },
        "supported_languages": [
            "en", "es", "fr", "de", "pt", "it", "ja", "zh", "ko", "ar"
        ],
        "consistency_check_types": [
            "segment_alignment",
            "glossary_compliance",
            "capitalization",
            "punctuation",
            "number_format",
            "whitespace",
            "tag_placeholder",
            "grammar",
            "spelling",
            "custom_rule"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    
    logger.info("🚀 Starting LexiQ Backend Server...")
    logger.info("📍 Server will be available at: http://localhost:8000")
    logger.info("📚 API documentation: http://localhost:8000/docs")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
