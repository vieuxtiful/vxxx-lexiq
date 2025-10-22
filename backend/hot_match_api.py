"""
Hot Match API Endpoints - FastAPI routes for Hot Match system
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, List
import logging
from pydantic import BaseModel

from .hot_match_detector import HotMatchDetector, InterchangeableMatch
from .hot_match_service import HotMatchService

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/v2/hot-matches", tags=["hot-matches"])

# Initialize services (these would be dependency injected in your actual app)
hot_match_detector = HotMatchDetector()
hot_match_service = HotMatchService()


# Pydantic models for request/response validation
class HotMatchDetectionRequest(BaseModel):
    terms: List[Dict[str, Any]]
    domain: str
    language: str
    content: str
    projectId: str | None = None


class HotMatchRecordRequest(BaseModel):
    baseTerm: str
    selectedTerm: str
    rejectedTerms: List[str]
    domain: str
    language: str
    userId: str
    projectId: str | None = None
    sessionId: str | None = None


class HotMatchResponse(BaseModel):
    baseTerm: str
    detectedTerm: str
    interchangeableTerms: List[str]
    percentages: Dict[str, float]
    domain: str
    language: str
    confidence: float
    context: str
    baseTermHash: str


class HotMatchDetectionResponse(BaseModel):
    hotMatches: List[HotMatchResponse]
    totalDetected: int


# Dependency for user authentication (implement based on your auth system)
async def authenticate_user(authorization: str | None = None) -> str:
    """
    Authenticate user from request headers
    
    Args:
        authorization: Authorization header value
    
    Returns:
        User ID
    
    Raises:
        HTTPException: If authentication fails
    """
    # TODO: Implement actual authentication
    # For now, return a mock user ID
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    # Extract user ID from token
    # user_id = verify_jwt_token(authorization)
    user_id = "mock_user_id"
    
    return user_id


@router.post("/detect", response_model=HotMatchDetectionResponse)
async def detect_hot_matches(
    request: HotMatchDetectionRequest,
    user_id: str = Depends(authenticate_user)
):
    """
    Detect potential hot matches in analyzed terms
    
    Args:
        request: Detection request with terms and context
        user_id: Authenticated user ID
    
    Returns:
        List of detected hot matches with percentages
    """
    try:
        logger.info(f"Hot match detection requested by user {user_id} for domain '{request.domain}'")
        
        # Detect interchangeable terms
        matches: List[InterchangeableMatch] = hot_match_detector.detect_interchangeable_terms(
            analyzed_terms=request.terms,
            domain=request.domain,
            context=request.content,
            language=request.language
        )
        
        # Enhance with current percentages
        enhanced_matches: List[HotMatchResponse] = []
        
        for match in matches:
            base_hash = hot_match_service.generate_base_term_hash(
                match.base_term,
                request.domain
            )
            
            # Get all terms (detected + alternatives)
            all_terms = [match.detected_term] + match.alternatives
            
            # Get percentages for all terms
            percentages = await hot_match_service.get_all_percentages_for_group(
                base_hash,
                all_terms
            )
            
            enhanced_matches.append(HotMatchResponse(
                baseTerm=match.base_term,
                detectedTerm=match.detected_term,
                interchangeableTerms=all_terms,
                percentages=percentages,
                domain=request.domain,
                language=request.language,
                confidence=match.confidence,
                context=match.context,
                baseTermHash=base_hash
            ))
        
        logger.info(f"Detected {len(enhanced_matches)} hot matches")
        
        return HotMatchDetectionResponse(
            hotMatches=enhanced_matches,
            totalDetected=len(enhanced_matches)
        )
        
    except Exception as e:
        logger.error(f"Hot match detection failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Hot match detection failed: {str(e)}"
        )


@router.post("/record-selection")
async def record_hot_match_selection(
    request: HotMatchRecordRequest,
    user_id: str = Depends(authenticate_user)
):
    """
    Record user's term selection for hot matches
    
    Args:
        request: Selection request with chosen term
        user_id: Authenticated user ID
    
    Returns:
        Success status
    """
    try:
        logger.info(f"Recording hot match selection by user {user_id}: {request.baseTerm} -> {request.selectedTerm}")
        
        # Prepare data for service
        hot_match_data = {
            'baseTerm': request.baseTerm,
            'selectedTerm': request.selectedTerm,
            'rejectedTerms': request.rejectedTerms,
            'domain': request.domain,
            'language': request.language,
            'projectId': request.projectId,
            'sessionId': request.sessionId
        }
        
        # Record selection
        success = await hot_match_service.record_user_selection(
            user_id=user_id,
            hot_match_data=hot_match_data
        )
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to record selection"
            )
        
        return {"status": "success", "message": "Selection recorded successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to record hot match selection: {e}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to record selection: {str(e)}"
        )


@router.get("/percentage")
async def get_hot_match_percentage(
    hash: str,
    term: str,
    user_id: str = Depends(authenticate_user)
):
    """
    Get Hot Match percentage for a specific term
    
    Args:
        hash: Base term hash
        term: Term to get percentage for
        user_id: Authenticated user ID
    
    Returns:
        Percentage data
    """
    try:
        percentage = await hot_match_service.get_hot_match_percentage(hash, term)
        
        return {
            "percentage": percentage,
            "term": term,
            "baseTermHash": hash
        }
        
    except Exception as e:
        logger.error(f"Failed to get hot match percentage: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get percentage: {str(e)}"
        )


@router.get("/user-history")
async def get_user_selection_history(
    limit: int = 50,
    user_id: str = Depends(authenticate_user)
):
    """
    Get user's Hot Match selection history
    
    Args:
        limit: Maximum number of records to return
        user_id: Authenticated user ID
    
    Returns:
        List of user's past selections
    """
    try:
        history = await hot_match_service.get_user_selection_history(
            user_id=user_id,
            limit=limit
        )
        
        return {
            "selections": history,
            "total": len(history)
        }
        
    except Exception as e:
        logger.error(f"Failed to get user history: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get history: {str(e)}"
        )


@router.get("/trending/{domain}")
async def get_trending_terms(
    domain: str,
    limit: int = 10,
    user_id: str = Depends(authenticate_user)
):
    """
    Get trending terms for a domain
    
    Args:
        domain: Domain to get trending terms for
        limit: Maximum number of terms to return
        user_id: Authenticated user ID
    
    Returns:
        List of trending terms with statistics
    """
    try:
        trending = await hot_match_service.get_trending_terms(
            domain=domain,
            limit=limit
        )
        
        return {
            "domain": domain,
            "trendingTerms": trending,
            "total": len(trending)
        }
        
    except Exception as e:
        logger.error(f"Failed to get trending terms: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get trending terms: {str(e)}"
        )


# Health check endpoint
@router.get("/health")
async def health_check():
    """Health check endpoint for Hot Match system"""
    return {
        "status": "healthy",
        "service": "hot-match",
        "version": "1.0.0"
    }
