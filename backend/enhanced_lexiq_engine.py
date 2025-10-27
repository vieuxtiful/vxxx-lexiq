"""
Enhanced LexiQ Engine - Multi-tiered fallback system for terminology validation
"""
import logging
import pandas as pd
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class FallbackTier(Enum):
    """Fallback tier levels"""
    TIER_1_DATAFRAME = "tier_1_dataframe"
    TIER_2_SEMANTIC = "tier_2_semantic"
    TIER_3_AUTO_RECOMMEND = "tier_3_auto_recommend"


@dataclass
class TermValidationResult:
    """Result of term validation"""
    term: str
    is_valid: bool
    confidence: float
    fallback_tier: FallbackTier
    rationale: str
    recommended_term: Optional[str] = None
    semantic_type: Optional[str] = None
    domain_match: bool = False
    language_match: bool = False


@dataclass
class SemanticInferenceResult:
    """Result of semantic type inference"""
    semantic_type: str
    confidence: float
    context_keywords: List[str]
    domain_relevance: float


class EnhancedLexiQEngine:
    """
    Enhanced LexiQ Engine with multi-tiered fallback mechanism
    
    Tier 1: DataFrame lookup (domain/language match)
    Tier 2: Semantic type inference & context matching
    Tier 3: Auto-recommend from central suggestion pool
    """
    
    def __init__(
        self, 
        glossary_df: Optional[pd.DataFrame] = None,
        suggestion_pool: Optional[List[Dict[str, Any]]] = None
    ):
        """
        Initialize Enhanced LexiQ Engine
        
        Args:
            glossary_df: Pandas DataFrame with glossary terms
            suggestion_pool: Central suggestion pool for recommendations
        """
        self.glossary_df = glossary_df if glossary_df is not None else pd.DataFrame()
        self.suggestion_pool = suggestion_pool or []
        
        # Domain-specific keywords for semantic inference
        self.domain_keywords = {
            'technology': [
                'implementation', 'deployment', 'framework', 'architecture',
                'database', 'API', 'interface', 'authentication', 'configuration',
                'optimization', 'validation', 'module', 'component'
            ],
            'medical': [
                'treatment', 'diagnosis', 'medication', 'procedure', 'symptom',
                'patient', 'physician', 'examination', 'therapy', 'intervention'
            ],
            'legal': [
                'contract', 'litigation', 'compliance', 'regulation', 'liability',
                'jurisdiction', 'plaintiff', 'defendant', 'statute', 'ordinance'
            ],
            'finance': [
                'investment', 'revenue', 'expenditure', 'profit', 'asset',
                'liability', 'transaction', 'portfolio', 'capital', 'equity'
            ],
            'marketing': [
                'campaign', 'engagement', 'conversion', 'audience', 'brand',
                'content', 'strategy', 'analytics', 'ROI', 'demographic'
            ]
        }
        
        # Semantic type patterns
        self.semantic_patterns = {
            'technical_term': ['system', 'process', 'method', 'technique', 'protocol'],
            'action_verb': ['implement', 'execute', 'deploy', 'configure', 'optimize'],
            'entity': ['user', 'client', 'server', 'database', 'application'],
            'attribute': ['secure', 'efficient', 'scalable', 'robust', 'reliable'],
            'measurement': ['performance', 'throughput', 'latency', 'capacity', 'load']
        }
    
    def validate_term(
        self, 
        term: str, 
        domain: str, 
        language: str,
        context: str = ""
    ) -> TermValidationResult:
        """
        Validate a term using multi-tiered fallback mechanism
        
        Args:
            term: Term to validate
            domain: Domain context
            language: Language code
            context: Surrounding text context
        
        Returns:
            TermValidationResult with validation details
        """
        logger.info(f"Validating term '{term}' for domain '{domain}', language '{language}'")
        
        # Tier 1: Check DataFrame for domain/language match
        tier1_result = self._tier1_dataframe_lookup(term, domain, language)
        if tier1_result:
            logger.info(f"✓ Tier 1 match found for '{term}'")
            return tier1_result
        
        # Tier 2: Semantic type inference & context matching
        tier2_result = self._tier2_semantic_inference(term, domain, language, context)
        if tier2_result and tier2_result.confidence >= 0.6:
            logger.info(f"✓ Tier 2 semantic match found for '{term}' (confidence: {tier2_result.confidence:.2f})")
            return tier2_result
        
        # Tier 3: Auto-recommend from central suggestion pool
        tier3_result = self._tier3_auto_recommend(term, domain, language, context)
        logger.info(f"✓ Tier 3 recommendation generated for '{term}'")
        return tier3_result
    
    def _tier1_dataframe_lookup(
        self, 
        term: str, 
        domain: str, 
        language: str
    ) -> Optional[TermValidationResult]:
        """
        Tier 1: Check DataFrame for exact or fuzzy match
        
        Args:
            term: Term to look up
            domain: Domain context
            language: Language code
        
        Returns:
            TermValidationResult if found, None otherwise
        """
        if self.glossary_df.empty:
            return None
        
        # Normalize term for comparison
        term_lower = term.lower().strip()
        
        # Check if required columns exist
        required_cols = ['term', 'domain', 'language']
        if not all(col in self.glossary_df.columns for col in required_cols):
            logger.warning("DataFrame missing required columns for Tier 1 lookup")
            return None
        
        # Exact match with domain and language
        exact_match = self.glossary_df[
            (self.glossary_df['term'].str.lower() == term_lower) &
            (self.glossary_df['domain'].str.lower() == domain.lower()) &
            (self.glossary_df['language'].str.lower() == language.lower())
        ]
        
        if not exact_match.empty:
            row = exact_match.iloc[0]
            return TermValidationResult(
                term=term,
                is_valid=True,
                confidence=1.0,
                fallback_tier=FallbackTier.TIER_1_DATAFRAME,
                rationale="Exact match found in glossary DataFrame",
                domain_match=True,
                language_match=True,
                semantic_type=row.get('semantic_type', None)
            )
        
        # Fuzzy match (same domain, different language or vice versa)
        fuzzy_match = self.glossary_df[
            (self.glossary_df['term'].str.lower() == term_lower) &
            ((self.glossary_df['domain'].str.lower() == domain.lower()) |
             (self.glossary_df['language'].str.lower() == language.lower()))
        ]
        
        if not fuzzy_match.empty:
            row = fuzzy_match.iloc[0]
            domain_match = row['domain'].lower() == domain.lower()
            language_match = row['language'].lower() == language.lower()
            
            return TermValidationResult(
                term=term,
                is_valid=True,
                confidence=0.8,
                fallback_tier=FallbackTier.TIER_1_DATAFRAME,
                rationale=f"Partial match found (domain: {domain_match}, language: {language_match})",
                domain_match=domain_match,
                language_match=language_match,
                semantic_type=row.get('semantic_type', None)
            )
        
        return None
    
    def _tier2_semantic_inference(
        self, 
        term: str, 
        domain: str, 
        language: str,
        context: str
    ) -> Optional[TermValidationResult]:
        """
        Tier 2: Semantic type inference and context matching
        
        Args:
            term: Term to analyze
            domain: Domain context
            language: Language code
            context: Surrounding text context
        
        Returns:
            TermValidationResult if confidence is sufficient
        """
        # Perform semantic inference
        semantic_result = self._infer_semantic_type(term, domain, context)
        
        if semantic_result.confidence < 0.6:
            return None
        
        # Check domain relevance
        domain_relevant = semantic_result.domain_relevance >= 0.5
        
        rationale_parts = [
            f"Semantic type: {semantic_result.semantic_type}",
            f"Confidence: {semantic_result.confidence:.2f}",
            f"Domain relevance: {semantic_result.domain_relevance:.2f}"
        ]
        
        if semantic_result.context_keywords:
            rationale_parts.append(f"Context keywords: {', '.join(semantic_result.context_keywords[:3])}")
        
        return TermValidationResult(
            term=term,
            is_valid=domain_relevant,
            confidence=semantic_result.confidence,
            fallback_tier=FallbackTier.TIER_2_SEMANTIC,
            rationale=" | ".join(rationale_parts),
            semantic_type=semantic_result.semantic_type,
            domain_match=domain_relevant,
            language_match=True  # Assume language match for semantic inference
        )
    
    def _tier3_auto_recommend(
        self, 
        term: str, 
        domain: str, 
        language: str,
        context: str
    ) -> TermValidationResult:
        """
        Tier 3: Auto-recommend from central suggestion pool
        
        Args:
            term: Term to find recommendation for
            domain: Domain context
            language: Language code
            context: Surrounding text context
        
        Returns:
            TermValidationResult with recommendation
        """
        # Filter suggestion pool by domain and language
        filtered_suggestions = [
            s for s in self.suggestion_pool
            if s.get('domain', '').lower() == domain.lower() and
               s.get('language', '').lower() == language.lower()
        ]
        
        # If no domain-specific suggestions, use general pool
        if not filtered_suggestions:
            filtered_suggestions = [
                s for s in self.suggestion_pool
                if s.get('language', '').lower() == language.lower()
            ]
        
        # Find best match based on similarity (simple implementation)
        best_match = None
        best_score = 0.0
        
        term_lower = term.lower()
        for suggestion in filtered_suggestions:
            suggestion_term = suggestion.get('term', '').lower()
            
            # Simple similarity: check if terms share words
            term_words = set(term_lower.split())
            suggestion_words = set(suggestion_term.split())
            
            if term_words & suggestion_words:  # Intersection
                similarity = len(term_words & suggestion_words) / max(len(term_words), len(suggestion_words))
                if similarity > best_score:
                    best_score = similarity
                    best_match = suggestion
        
        if best_match and best_score >= 0.3:
            return TermValidationResult(
                term=term,
                is_valid=False,
                confidence=best_score,
                fallback_tier=FallbackTier.TIER_3_AUTO_RECOMMEND,
                rationale=f"Auto-recommended from suggestion pool (similarity: {best_score:.2f})",
                recommended_term=best_match.get('term'),
                semantic_type=best_match.get('semantic_type'),
                domain_match=best_match.get('domain', '').lower() == domain.lower(),
                language_match=True
            )
        
        # No recommendation found
        return TermValidationResult(
            term=term,
            is_valid=False,
            confidence=0.0,
            fallback_tier=FallbackTier.TIER_3_AUTO_RECOMMEND,
            rationale="No suitable recommendation found in suggestion pool",
            domain_match=False,
            language_match=True
        )
    
    def _infer_semantic_type(
        self, 
        term: str, 
        domain: str, 
        context: str
    ) -> SemanticInferenceResult:
        """
        Infer semantic type of a term based on patterns and context
        
        Args:
            term: Term to analyze
            domain: Domain context
            context: Surrounding text context
        
        Returns:
            SemanticInferenceResult with inference details
        """
        term_lower = term.lower()
        context_lower = context.lower()
        
        # Extract context keywords
        context_keywords = []
        domain_keywords_list = self.domain_keywords.get(domain.lower(), [])
        
        for keyword in domain_keywords_list:
            if keyword in context_lower:
                context_keywords.append(keyword)
        
        # Calculate domain relevance
        domain_relevance = len(context_keywords) / max(len(domain_keywords_list), 1)
        domain_relevance = min(domain_relevance * 2, 1.0)  # Scale up but cap at 1.0
        
        # Determine semantic type
        semantic_type = 'unknown'
        confidence = 0.5
        
        for sem_type, patterns in self.semantic_patterns.items():
            for pattern in patterns:
                if pattern in term_lower or term_lower in pattern:
                    semantic_type = sem_type
                    confidence = 0.8
                    break
            if confidence > 0.5:
                break
        
        # Boost confidence if domain keywords present
        if context_keywords:
            confidence = min(confidence + 0.1 * len(context_keywords), 1.0)
        
        return SemanticInferenceResult(
            semantic_type=semantic_type,
            confidence=confidence,
            context_keywords=context_keywords,
            domain_relevance=domain_relevance
        )
    
    def batch_validate_terms(
        self, 
        terms: List[Dict[str, Any]], 
        domain: str, 
        language: str
    ) -> List[TermValidationResult]:
        """
        Validate multiple terms in batch
        
        Args:
            terms: List of term dictionaries with 'text' and 'context'
            domain: Domain context
            language: Language code
        
        Returns:
            List of TermValidationResult objects
        """
        results = []
        
        for term_data in terms:
            term_text = term_data.get('text', '')
            context = term_data.get('context', '')
            
            result = self.validate_term(term_text, domain, language, context)
            results.append(result)
        
        logger.info(f"Batch validated {len(results)} terms")
        return results
    
    def update_glossary_dataframe(self, new_df: pd.DataFrame):
        """Update the internal glossary DataFrame"""
        self.glossary_df = new_df
        logger.info(f"Updated glossary DataFrame with {len(new_df)} entries")
    
    def add_to_suggestion_pool(self, suggestions: List[Dict[str, Any]]):
        """Add new suggestions to the central pool"""
        self.suggestion_pool.extend(suggestions)
        logger.info(f"Added {len(suggestions)} suggestions to pool (total: {len(self.suggestion_pool)})")
