"""
Integrated LQA API - Combines Consistency Checks with LexiQ Engine
Provides unified API endpoints for comprehensive translation quality analysis
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import Dict, Any, List, Optional
import logging
import sys
import os
from pydantic import BaseModel, Field
import time
import hashlib

# Add scripts directory to path for importing lexiq_engine
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

try:
    from lexiq_engine_01_oct_2025 import (
        EnhancedLexiQEngine,
        EnhancedLexiQAPIAdapter
    )
    LEXIQ_ENGINE_AVAILABLE = True
except ImportError:
    logging.warning("LexiQ Engine not available")
    LEXIQ_ENGINE_AVAILABLE = False

from .LexiQ_ConsistencyChecker_Type import (
    ConsistencyCheckService,
    ConsistencyCheckType,
    IssueSeverity,
    dict_to_glossary_term,
    dict_to_custom_rule,
    issue_to_dict,
    statistics_to_dict
)

logger = logging.getLogger(__name__)

# Initialize router
router = APIRouter(prefix="/api/v2/lqa", tags=["lqa"])

# Initialize services
consistency_service = ConsistencyCheckService()
if LEXIQ_ENGINE_AVAILABLE:
    lexiq_engine = EnhancedLexiQEngine()
    lexiq_adapter = EnhancedLexiQAPIAdapter(lexiq_engine)
else:
    lexiq_engine = None
    lexiq_adapter = None


# Pydantic models for request/response validation
class GlossaryTermModel(BaseModel):
    id: str
    source: str
    target: str
    domain: Optional[str] = None
    caseSensitive: bool = False
    forbidden: bool = False


class CustomRuleModel(BaseModel):
    id: str
    name: str
    type: str = Field(..., description="regex, forbidden, or required")
    pattern: str
    replacement: Optional[str] = None
    description: str
    severity: str = "minor"
    enabled: bool = True


class IntegratedLQARequest(BaseModel):
    sourceText: str
    translationText: str
    sourceLanguage: str
    targetLanguage: str
    domain: str = "general"
    glossaryTerms: Optional[List[GlossaryTermModel]] = None
    customRules: Optional[List[CustomRuleModel]] = None
    checkTypes: Optional[List[str]] = None
    enableCache: bool = True
    checkGrammar: bool = True
    checkSpelling: bool = True
    userId: Optional[str] = None
    projectId: Optional[str] = None


class ConsistencyOnlyRequest(BaseModel):
    sourceText: str
    translationText: str
    sourceLanguage: str
    targetLanguage: str
    glossaryTerms: Optional[List[GlossaryTermModel]] = None
    customRules: Optional[List[CustomRuleModel]] = None
    checkTypes: Optional[List[str]] = None
    enableCache: bool = True


class LexiQOnlyRequest(BaseModel):
    translationContent: str
    glossaryContent: str = ""
    language: str = "en"
    domain: str = "general"
    checkGrammar: bool = False
    userId: Optional[str] = None


# Dependency for user authentication
async def authenticate_user(authorization: str | None = None) -> str:
    """Authenticate user from request headers"""
    # TODO: Implement actual authentication
    if not authorization:
        return "anonymous"
    return "authenticated_user"


@router.post("/analyze-integrated")
async def analyze_integrated(
    request: IntegratedLQARequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(authenticate_user)
):
    """
    Integrated LQA analysis combining Consistency Checks and LexiQ Engine
    
    This endpoint provides comprehensive quality analysis by:
    1. Running consistency checks (alignment, glossary, punctuation, numbers, etc.)
    2. Running LexiQ engine analysis (grammar, spelling, semantic types)
    3. Merging results into a unified response
    
    Args:
        request: Integrated analysis request
        background_tasks: FastAPI background tasks
        user_id: Authenticated user ID
    
    Returns:
        Unified analysis results with both consistency and LexiQ findings
    """
    start_time = time.time()
    
    try:
        logger.info(f"Integrated LQA analysis requested by user {user_id}")
        logger.info(f"Languages: {request.sourceLanguage} -> {request.targetLanguage}")
        logger.info(f"Domain: {request.domain}, Grammar: {request.checkGrammar}, Spelling: {request.checkSpelling}")
        
        # Parse check types
        check_types = None
        if request.checkTypes:
            check_types = [ConsistencyCheckType(ct) for ct in request.checkTypes]
        
        # Parse glossary terms
        glossary_terms = None
        if request.glossaryTerms:
            glossary_terms = [dict_to_glossary_term(term.dict()) for term in request.glossaryTerms]
        
        # Parse custom rules
        custom_rules = None
        if request.customRules:
            custom_rules = [dict_to_custom_rule(rule.dict()) for rule in request.customRules]
        
        # 1. Run Consistency Checks
        consistency_issues, consistency_stats = consistency_service.check_consistency(
            source_text=request.sourceText,
            translation_text=request.translationText,
            source_language=request.sourceLanguage,
            target_language=request.targetLanguage,
            glossary_terms=glossary_terms,
            custom_rules=custom_rules,
            check_types=check_types,
            enable_cache=request.enableCache
        )
        
        logger.info(f"Consistency checks complete: {len(consistency_issues)} issues found")
        
        # 2. Run LexiQ Engine Analysis (if available)
        lexiq_result = None
        if LEXIQ_ENGINE_AVAILABLE and lexiq_adapter:
            try:
                lexiq_result = lexiq_adapter.analyze_translation(
                    translation_content=request.translationText,
                    glossary_content=request.sourceText,
                    language=request.targetLanguage,
                    domain=request.domain,
                    check_grammar=request.checkGrammar,
                    user_id=request.userId or user_id
                )
                logger.info(f"LexiQ analysis complete: {len(lexiq_result.get('terms', []))} terms analyzed")
            except Exception as e:
                logger.error(f"LexiQ analysis failed: {e}")
                lexiq_result = None
        else:
            logger.warning("LexiQ Engine not available, skipping semantic analysis")
        
        # 3. Merge results
        merged_issues = [issue_to_dict(issue) for issue in consistency_issues]
        
        # Add LexiQ grammar and spelling issues to merged results
        if lexiq_result and lexiq_result.get('terms'):
            for term in lexiq_result['terms']:
                if term.get('classification') in ['grammar', 'spelling']:
                    merged_issues.append({
                        'id': term.get('text', '') + str(term.get('startPosition', 0)),
                        'type': term.get('classification'),
                        'severity': 'major' if term.get('score', 0) < 50 else 'minor',
                        'targetText': term.get('text', ''),
                        'startPosition': term.get('startPosition', 0),
                        'endPosition': term.get('endPosition', 0),
                        'context': term.get('context', ''),
                        'message': f"{term.get('classification', '').capitalize()} issue detected",
                        'rationale': term.get('rationale', ''),
                        'suggestions': term.get('suggestions', []),
                        'confidence': term.get('score', 0) / 100.0,
                        'autoFixable': bool(term.get('suggestions')),
                        'sourceText': None,
                        'ruleId': None
                    })
        
        # 4. Calculate unified statistics
        processing_time = time.time() - start_time
        
        unified_stats = statistics_to_dict(consistency_stats)
        if lexiq_result and lexiq_result.get('statistics'):
            unified_stats['lexiqStatistics'] = lexiq_result['statistics']
            unified_stats['grammarScore'] = lexiq_result['statistics'].get('grammarScore', 0)
            unified_stats['spellingIssues'] = lexiq_result['statistics'].get('spellingIssues', 0)
        
        # 5. Prepare response
        response = {
            'success': True,
            'issues': merged_issues,
            'statistics': unified_stats,
            'consistencyChecks': {
                'issues': [issue_to_dict(issue) for issue in consistency_issues],
                'statistics': statistics_to_dict(consistency_stats)
            },
            'lexiqAnalysis': lexiq_result,
            'metadata': {
                'processingTime': processing_time,
                'sourceLanguage': request.sourceLanguage,
                'targetLanguage': request.targetLanguage,
                'domain': request.domain,
                'userId': user_id,
                'projectId': request.projectId,
                'timestamp': time.time(),
                'lexiqEngineAvailable': LEXIQ_ENGINE_AVAILABLE
            }
        }
        
        # Background task: log analytics
        background_tasks.add_task(
            log_analysis_metrics,
            user_id=user_id,
            project_id=request.projectId,
            issue_count=len(merged_issues),
            processing_time=processing_time
        )
        
        logger.info(f"Integrated analysis complete in {processing_time:.2f}s")
        return response
        
    except Exception as e:
        logger.error(f"Integrated LQA analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Integrated analysis failed: {str(e)}"
        )


@router.post("/consistency-check")
async def consistency_check_only(
    request: ConsistencyOnlyRequest,
    user_id: str = Depends(authenticate_user)
):
    """
    Consistency checks only (without LexiQ semantic analysis)
    
    Performs:
    - Segment alignment
    - Glossary compliance
    - Capitalization consistency
    - Punctuation consistency
    - Number format consistency
    - Whitespace issues
    - Tag/placeholder consistency
    - Custom rule validation
    
    Args:
        request: Consistency check request
        user_id: Authenticated user ID
    
    Returns:
        Consistency check results
    """
    start_time = time.time()
    
    try:
        logger.info(f"Consistency check requested by user {user_id}")
        
        # Parse parameters
        check_types = None
        if request.checkTypes:
            check_types = [ConsistencyCheckType(ct) for ct in request.checkTypes]
        
        glossary_terms = None
        if request.glossaryTerms:
            glossary_terms = [dict_to_glossary_term(term.dict()) for term in request.glossaryTerms]
        
        custom_rules = None
        if request.customRules:
            custom_rules = [dict_to_custom_rule(rule.dict()) for rule in request.customRules]
        
        # Run consistency checks
        issues, statistics = consistency_service.check_consistency(
            source_text=request.sourceText,
            translation_text=request.translationText,
            source_language=request.sourceLanguage,
            target_language=request.targetLanguage,
            glossary_terms=glossary_terms,
            custom_rules=custom_rules,
            check_types=check_types,
            enable_cache=request.enableCache
        )
        
        processing_time = time.time() - start_time
        
        return {
            'success': True,
            'issues': [issue_to_dict(issue) for issue in issues],
            'statistics': statistics_to_dict(statistics),
            'metadata': {
                'processingTime': processing_time,
                'sourceLanguage': request.sourceLanguage,
                'targetLanguage': request.targetLanguage,
                'userId': user_id,
                'timestamp': time.time()
            }
        }
        
    except Exception as e:
        logger.error(f"Consistency check failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Consistency check failed: {str(e)}"
        )


@router.post("/lexiq-analyze")
async def lexiq_analyze_only(
    request: LexiQOnlyRequest,
    user_id: str = Depends(authenticate_user)
):
    """
    LexiQ semantic analysis only (without consistency checks)
    
    Performs:
    - Semantic type inference
    - Grammar analysis
    - Spelling validation
    - Term classification
    - Quality scoring
    
    Args:
        request: LexiQ analysis request
        user_id: Authenticated user ID
    
    Returns:
        LexiQ analysis results
    """
    if not LEXIQ_ENGINE_AVAILABLE or not lexiq_adapter:
        raise HTTPException(
            status_code=503,
            detail="LexiQ Engine is not available"
        )
    
    try:
        logger.info(f"LexiQ analysis requested by user {user_id}")
        
        result = lexiq_adapter.analyze_translation(
            translation_content=request.translationContent,
            glossary_content=request.glossaryContent,
            language=request.language,
            domain=request.domain,
            check_grammar=request.checkGrammar,
            user_id=request.userId or user_id
        )
        
        return {
            'success': True,
            'analysis': result,
            'metadata': {
                'userId': user_id,
                'timestamp': time.time()
            }
        }
        
    except Exception as e:
        logger.error(f"LexiQ analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"LexiQ analysis failed: {str(e)}"
        )


@router.post("/batch-analyze")
async def batch_analyze(
    requests: List[IntegratedLQARequest],
    background_tasks: BackgroundTasks,
    user_id: str = Depends(authenticate_user)
):
    """
    Batch analysis for multiple segments
    
    Processes multiple translation segments in a single request,
    useful for large documents or batch processing workflows.
    
    Args:
        requests: List of analysis requests
        background_tasks: FastAPI background tasks
        user_id: Authenticated user ID
    
    Returns:
        List of analysis results
    """
    if len(requests) > 100:
        raise HTTPException(
            status_code=400,
            detail="Batch size exceeds maximum of 100 segments"
        )
    
    try:
        logger.info(f"Batch analysis requested by user {user_id}: {len(requests)} segments")
        
        results = []
        for idx, req in enumerate(requests):
            try:
                result = await analyze_integrated(req, background_tasks, user_id)
                results.append({
                    'index': idx,
                    'success': True,
                    'result': result
                })
            except Exception as e:
                logger.error(f"Batch segment {idx} failed: {e}")
                results.append({
                    'index': idx,
                    'success': False,
                    'error': str(e)
                })
        
        successful = sum(1 for r in results if r['success'])
        
        return {
            'success': True,
            'totalSegments': len(requests),
            'successfulSegments': successful,
            'failedSegments': len(requests) - successful,
            'results': results
        }
        
    except Exception as e:
        logger.error(f"Batch analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Batch analysis failed: {str(e)}"
        )


@router.get("/cache-stats")
async def get_cache_stats(user_id: str = Depends(authenticate_user)):
    """Get cache statistics"""
    return {
        'cacheSize': len(consistency_service.cache),
        'userId': user_id
    }


@router.delete("/cache")
async def clear_cache(user_id: str = Depends(authenticate_user)):
    """Clear analysis cache"""
    consistency_service.cache.clear()
    return {
        'success': True,
        'message': 'Cache cleared successfully'
    }


@router.get("/health")
async def health_check():
    """Health check endpoint for integrated LQA system"""
    return {
        'status': 'healthy',
        'service': 'integrated-lqa',
        'version': '2.0.0',
        'lexiqEngineAvailable': LEXIQ_ENGINE_AVAILABLE,
        'consistencyChecksAvailable': True
    }


# Background task functions
async def log_analysis_metrics(
    user_id: str,
    project_id: Optional[str],
    issue_count: int,
    processing_time: float
):
    """Log analysis metrics for analytics"""
    try:
        logger.info(f"Analytics: user={user_id}, project={project_id}, "
                   f"issues={issue_count}, time={processing_time:.2f}s")
        # TODO: Send to analytics service
    except Exception as e:
        logger.error(f"Failed to log metrics: {e}")
