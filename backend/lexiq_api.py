"""
LexiQ API Endpoints - Comprehensive REST API for terminology management
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from typing import Dict, Any, List, Optional
import logging
from pydantic import BaseModel, Field
import pandas as pd
from io import StringIO

from .enhanced_lexiq_engine import EnhancedLexiQEngine, TermValidationResult, FallbackTier
from .pandas_sync_service import PandasSyncService, SyncEvent
from .hot_match_service import HotMatchService
from .hot_match_detector import HotMatchDetector

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/v2/lexiq", tags=["lexiq"])

# Initialize services (these would be dependency injected in production)
pandas_sync = PandasSyncService()
lexiq_engine = EnhancedLexiQEngine()
hot_match_service = HotMatchService()
hot_match_detector = HotMatchDetector()


# Request/Response Models
class TermCreateRequest(BaseModel):
    term: str
    target_term: Optional[str] = None
    domain: str
    language: str
    classification: str = 'review'
    score: float = 0.0
    frequency: int = 0
    context: str = ''
    rationale: str = ''
    suggestions: List[str] = []
    semantic_type: Optional[str] = None
    confidence: float = 0.0


class TermUpdateRequest(BaseModel):
    updates: Dict[str, Any]


class BatchUpdateRequest(BaseModel):
    updates: List[Dict[str, Any]]


class TermValidationRequest(BaseModel):
    term: str
    domain: str
    language: str
    context: str = ''


class BatchValidationRequest(BaseModel):
    terms: List[Dict[str, Any]]
    domain: str
    language: str


class RecommendationRequest(BaseModel):
    term: str
    domain: str
    language: str
    context: str = ''
    classification: str


async def get_current_user(authorization: Optional[str] = None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required")
    return "mock_user_id"


@router.post("/terms")
async def create_term(
    request: TermCreateRequest,
    user_id: str = Depends(get_current_user)
):
    try:
        term_data = request.dict()
        result = await pandas_sync.create_term(term_data, user_id=user_id)
        lexiq_engine.update_glossary_dataframe(pandas_sync.get_dataframe())
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Failed to create term: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/terms/{term_id}")
async def get_term(term_id: str, user_id: str = Depends(get_current_user)):
    try:
        term = await pandas_sync.get_term(term_id)
        if not term:
            raise HTTPException(status_code=404, detail="Term not found")
        return {"status": "success", "data": term}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get term: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/terms/{term_id}")
async def update_term(
    term_id: str,
    request: TermUpdateRequest,
    user_id: str = Depends(get_current_user)
):
    try:
        result = await pandas_sync.update_term(term_id, request.updates, user_id=user_id)
        if not result:
            raise HTTPException(status_code=404, detail="Term not found")
        lexiq_engine.update_glossary_dataframe(pandas_sync.get_dataframe())
        return {"status": "success", "data": result}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update term: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/terms/{term_id}")
async def delete_term(term_id: str, user_id: str = Depends(get_current_user)):
    try:
        success = await pandas_sync.delete_term(term_id, user_id=user_id)
        if not success:
            raise HTTPException(status_code=404, detail="Term not found")
        lexiq_engine.update_glossary_dataframe(pandas_sync.get_dataframe())
        return {"status": "success", "message": "Term deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete term: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/terms/batch")
async def batch_update_terms(
    request: BatchUpdateRequest,
    user_id: str = Depends(get_current_user)
):
    try:
        result = await pandas_sync.batch_update(request.updates, user_id=user_id)
        lexiq_engine.update_glossary_dataframe(pandas_sync.get_dataframe())
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Batch update failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/terms/query")
async def query_terms(
    filters: Optional[Dict[str, Any]] = None,
    limit: Optional[int] = None,
    offset: int = 0,
    user_id: str = Depends(get_current_user)
):
    try:
        terms = await pandas_sync.get_all_terms(filters, limit, offset)
        return {"status": "success", "data": terms, "count": len(terms)}
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate")
async def validate_term(
    request: TermValidationRequest,
    user_id: str = Depends(get_current_user)
):
    try:
        result = lexiq_engine.validate_term(
            request.term,
            request.domain,
            request.language,
            request.context
        )
        
        return {
            "status": "success",
            "data": {
                "term": result.term,
                "is_valid": result.is_valid,
                "confidence": result.confidence,
                "fallback_tier": result.fallback_tier.value,
                "rationale": result.rationale,
                "recommended_term": result.recommended_term,
                "semantic_type": result.semantic_type,
                "domain_match": result.domain_match,
                "language_match": result.language_match
            }
        }
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate/batch")
async def batch_validate_terms(
    request: BatchValidationRequest,
    user_id: str = Depends(get_current_user)
):
    try:
        results = lexiq_engine.batch_validate_terms(
            request.terms,
            request.domain,
            request.language
        )
        
        return {
            "status": "success",
            "data": [
                {
                    "term": r.term,
                    "is_valid": r.is_valid,
                    "confidence": r.confidence,
                    "fallback_tier": r.fallback_tier.value,
                    "rationale": r.rationale,
                    "recommended_term": r.recommended_term,
                    "semantic_type": r.semantic_type
                }
                for r in results
            ]
        }
    except Exception as e:
        logger.error(f"Batch validation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/recommendations")
async def get_recommendations(
    request: RecommendationRequest,
    user_id: str = Depends(get_current_user)
):
    try:
        validation_result = lexiq_engine.validate_term(
            request.term,
            request.domain,
            request.language,
            request.context
        )
        
        recommendations = []
        
        if validation_result.recommended_term:
            recommendations.append({
                "term": validation_result.recommended_term,
                "confidence": validation_result.confidence,
                "source": validation_result.fallback_tier.value,
                "rationale": validation_result.rationale
            })
        
        return {
            "status": "success",
            "data": {
                "original_term": request.term,
                "recommendations": recommendations,
                "validation": {
                    "is_valid": validation_result.is_valid,
                    "confidence": validation_result.confidence,
                    "semantic_type": validation_result.semantic_type
                }
            }
        }
    except Exception as e:
        logger.error(f"Recommendation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_statistics(user_id: str = Depends(get_current_user)):
    try:
        stats = await pandas_sync.get_statistics()
        return {"status": "success", "data": stats}
    except Exception as e:
        logger.error(f"Statistics failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/history")
async def get_sync_history(
    limit: int = 50,
    user_id: str = Depends(get_current_user)
):
    try:
        history = pandas_sync.get_sync_history(limit)
        return {"status": "success", "data": history}
    except Exception as e:
        logger.error(f"Sync history failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export/csv")
async def export_csv(
    filepath: str,
    user_id: str = Depends(get_current_user)
):
    try:
        success = await pandas_sync.export_to_csv(filepath)
        if not success:
            raise HTTPException(status_code=500, detail="Export failed")
        return {"status": "success", "message": f"Exported to {filepath}"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Export failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import/csv")
async def import_csv(
    file: UploadFile = File(...),
    replace: bool = False,
    user_id: str = Depends(get_current_user)
):
    try:
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        temp_file = f"/tmp/import_{user_id}.csv"
        df.to_csv(temp_file, index=False)
        
        result = await pandas_sync.import_from_csv(temp_file, replace, user_id)
        lexiq_engine.update_glossary_dataframe(pandas_sync.get_dataframe())
        
        return {"status": "success", "data": result}
    except Exception as e:
        logger.error(f"Import failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "lexiq-api",
        "version": "2.0.0",
        "components": {
            "pandas_sync": len(pandas_sync.get_dataframe()),
            "lexiq_engine": "active",
            "hot_match": "active"
        }
    }
