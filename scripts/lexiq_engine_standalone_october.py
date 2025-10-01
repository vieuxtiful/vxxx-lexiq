#!/usr/bin/env python3
"""
LexiQ Engine - Enhanced October Release
Enhanced with grammar checking, semantic type exposure, and improved UI integration
Based on the recommendations for UI and Codebase improvements
"""

import os
import sys
import json
import time
import pickle
import logging
import hashlib
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, asdict
from collections import defaultdict, Counter
import re
import math

# Core dependencies
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# Optional dependencies with graceful fallbacks
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    print("Redis not available - using fallback caching")

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False
    print("Sentence transformers not available - using TF-IDF only")

try:
    import faiss
    FAISS_AVAILABLE = True
except ImportError:
    FAISS_AVAILABLE = False
    print("FAISS not available - using standard similarity search")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# ENHANCED REDIS CACHE SERVICE WITH USER PREFERENCES
# ============================================================================

class RedisCacheService:
    """Enhanced Redis-powered caching service with user preferences support"""
    
    def __init__(self, host='localhost', port=6379, db=0, prefix='lexiq:'):
        self.redis_client = None
        self.prefix = prefix
        self.fallback_cache = {}
        
        if REDIS_AVAILABLE:
            try:
                self.redis_client = redis.Redis(
                    host=host, port=port, db=db, 
                    decode_responses=True, socket_connect_timeout=3
                )
                # Test connection
                self.redis_client.ping()
                logger.info("Redis cache service initialized successfully")
            except Exception as e:
                logger.warning(f"Redis unavailable, using fallback: {e}")
                self.redis_client = None
    
    def _build_key(self, category: str, key: str) -> str:
        return f"{self.prefix}{category}:{hash(key) & 0xFFFFFFFF}"
    
    def set(self, category: str, key: str, value: Any, expire: int = 3600) -> bool:
        """Store computed Lambda Calculus results"""
        try:
            cache_key = self._build_key(category, key)
            serialized = pickle.dumps(value)
            
            if self.redis_client:
                return self.redis_client.setex(cache_key, expire, serialized)
            else:
                self.fallback_cache[cache_key] = (serialized, time.time() + expire)
                return True
        except Exception as e:
            logger.error(f"Cache set failed: {e}")
            return False
    
    def get(self, category: str, key: str) -> Optional[Any]:
        """Retrieve cached Lambda Calculus computations"""
        try:
            cache_key = self._build_key(category, key)
            
            if self.redis_client:
                cached = self.redis_client.get(cache_key)
                return pickle.loads(cached) if cached else None
            else:
                if cache_key in self.fallback_cache:
                    data, expiry = self.fallback_cache[cache_key]
                    if time.time() < expiry:
                        return pickle.loads(data)
                    else:
                        del self.fallback_cache[cache_key]
                return None
        except Exception as e:
            logger.error(f"Cache get failed: {e}")
            return None
    
    # NEW: User preferences management
    def set_user_preference(self, user_id: str, preference_key: str, value: Any) -> bool:
        """Store user-specific preferences"""
        return self.set('user_preferences', f"{user_id}:{preference_key}", value, expire=86400*30)  # 30 days
    
    def get_user_preference(self, user_id: str, preference_key: str, default: Any = None) -> Any:
        """Retrieve user-specific preferences"""
        result = self.get('user_preferences', f"{user_id}:{preference_key}")
        return result if result is not None else default
    
    def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get all preferences for a user"""
        preferences = {}
        # This is a simplified implementation - in production, you'd want to scan keys
        common_prefs = ['language', 'domain', 'grammar_checking_enabled', 'analysis_depth']
        for pref in common_prefs:
            value = self.get_user_preference(user_id, pref)
            if value is not None:
                preferences[pref] = value
        return preferences

# ============================================================================
# ENHANCED GRAMMAR ANALYSIS SERVICE
# ============================================================================

class GrammarAnalysisService:
    """Grammar analysis service for enhanced text quality checking"""
    
    def __init__(self, redis_cache_service=None):
        self.redis_cache = redis_cache_service
        self.grammar_rules = self._initialize_grammar_rules()
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def _initialize_grammar_rules(self) -> Dict[str, Any]:
        """Initialize grammar checking rules"""
        return {
            'subject_verb_agreement': {
                'patterns': [
                    r'\b(he|she|it)\s+(are|were)\b',  # Singular subject with plural verb
                    r'\b(they|we|you)\s+(is|was)\b'   # Plural subject with singular verb
                ],
                'severity': 'high'
            },
            'article_usage': {
                'patterns': [
                    r'\ba\s+[aeiou]',  # "a" before vowel sound
                    r'\ban\s+[^aeiou]'  # "an" before consonant sound
                ],
                'severity': 'medium'
            },
            'punctuation': {
                'patterns': [
                    r'\s+[,.;:]',  # Space before punctuation
                    r'[.!?]\s*[a-z]'  # Lowercase after sentence end
                ],
                'severity': 'low'
            },
            'redundancy': {
                'patterns': [
                    r'\b(\w+)\s+\1\b',  # Repeated words
                    r'\bvery\s+very\b'  # Double intensifiers
                ],
                'severity': 'medium'
            }
        }
    
    def analyze_grammar(self, text: str, language: str = 'en') -> Dict[str, Any]:
        """Analyze text for grammar issues"""
        cache_key = f"grammar:{language}:{hash(text)}"
        
        if self.redis_cache:
            cached = self.redis_cache.get('grammar_analysis', cache_key)
            if cached:
                return cached
        
        issues = []
        
        for rule_name, rule_config in self.grammar_rules.items():
            for pattern in rule_config['patterns']:
                matches = list(re.finditer(pattern, text, re.IGNORECASE))
                for match in matches:
                    issues.append({
                        'rule': rule_name,
                        'severity': rule_config['severity'],
                        'start_pos': match.start(),
                        'end_pos': match.end(),
                        'matched_text': match.group(),
                        'suggestion': self._get_grammar_suggestion(rule_name, match.group())
                    })
        
        result = {
            'text': text,
            'language': language,
            'issues': issues,
            'grammar_score': self._calculate_grammar_score(text, issues),
            'total_issues': len(issues),
            'issue_breakdown': self._categorize_issues(issues)
        }
        
        if self.redis_cache:
            self.redis_cache.set('grammar_analysis', cache_key, result, 3600)
        
        return result
    
    def _get_grammar_suggestion(self, rule_name: str, matched_text: str) -> str:
        """Generate grammar correction suggestions"""
        suggestions = {
            'subject_verb_agreement': {
                'he are': 'he is',
                'she are': 'she is',
                'it are': 'it is',
                'they is': 'they are',
                'we is': 'we are'
            },
            'article_usage': {
                'a a': 'an a',
                'a e': 'an e',
                'a i': 'an i',
                'a o': 'an o',
                'a u': 'an u'
            }
        }
        
        rule_suggestions = suggestions.get(rule_name, {})
        return rule_suggestions.get(matched_text.lower(), f"Check {rule_name}")
    
    def _calculate_grammar_score(self, text: str, issues: List[Dict]) -> float:
        """Calculate overall grammar quality score"""
        if not text.strip():
            return 0.0
        
        word_count = len(text.split())
        if word_count == 0:
            return 0.0
        
        # Weight issues by severity
        severity_weights = {'high': 3, 'medium': 2, 'low': 1}
        total_penalty = sum(severity_weights.get(issue['severity'], 1) for issue in issues)
        
        # Calculate score (0-100)
        max_penalty = word_count * 0.1  # Allow 10% penalty per word as maximum
        score = max(0, 100 - (total_penalty / max_penalty * 100))
        
        return min(100, score)
    
    def _categorize_issues(self, issues: List[Dict]) -> Dict[str, int]:
        """Categorize issues by type and severity"""
        breakdown = defaultdict(int)
        for issue in issues:
            breakdown[issue['rule']] += 1
            breakdown[f"severity_{issue['severity']}"] += 1
        return dict(breakdown)

# ============================================================================
# ENHANCED SEMANTIC TYPE SYSTEM WITH EXPOSURE
# ============================================================================

class SemanticTypeSystem:
    """Enhanced semantic type system with detailed type information exposure"""
    
    def __init__(self, redis_cache_service=None):
        self.redis_cache = redis_cache_service
        self.base_types = {
            'Entity', 'Property', 'Event', 'State', 'Process', 
            'Agent', 'Patient', 'Location', 'Time', 'Manner'
        }
        self.type_constructors = {
            '→': lambda a, b: f"({a}→{b})"  # Function types
        }
        self.type_hierarchy = self._initialize_type_hierarchy()
        self.logger = logging.getLogger(self.__class__.__name__)
        
    def _initialize_type_hierarchy(self) -> Dict[str, Any]:
        """Initialize enhanced semantic type hierarchy"""
        return {
            'Entity': {
                'subtypes': ['PhysicalEntity', 'AbstractEntity', 'Agent', 'Patient'],
                'properties': ['countable', 'identifiable', 'concrete'],
                'composition_rules': ['can_be_modified_by_Property'],
                'ui_category': 'noun',
                'color_code': '#4CAF50',
                'description': 'Concrete or abstract objects, people, places, or concepts'
            },
            'Property': {
                'subtypes': ['Attribute', 'Quality', 'Characteristic'],
                'properties': ['gradable', 'comparative', 'descriptive'],
                'composition_rules': ['can_modify_Entity', 'can_modify_Event'],
                'ui_category': 'adjective',
                'color_code': '#2196F3',
                'description': 'Qualities, attributes, or characteristics of entities'
            },
            'Event': {
                'subtypes': ['Action', 'Process', 'State', 'Achievement'],
                'properties': ['temporal', 'dynamic', 'causative'],
                'composition_rules': ['can_have_Agent', 'can_have_Patient'],
                'ui_category': 'verb',
                'color_code': '#FF9800',
                'description': 'Actions, processes, or states that occur over time'
            },
            'Agent': {
                'subtypes': ['Human', 'Organization', 'System'],
                'properties': ['intentional', 'active', 'responsible'],
                'composition_rules': ['can_perform_Event'],
                'ui_category': 'actor',
                'color_code': '#9C27B0',
                'description': 'Entities that can perform actions or cause events'
            }
        }
    
    def infer_semantic_type(self, term: str, language: str = 'en', 
                          context: Optional[str] = None) -> Dict[str, Any]:
        """Enhanced semantic type inference with detailed UI information"""
        cache_key = f"semantic_type_enhanced:{language}:{term}:{hash(context) if context else 'none'}"
        
        if self.redis_cache:
            cached = self.redis_cache.get('semantic_types', cache_key)
            if cached:
                return cached
        
        # Use embedding-based type inference
        embedding_based_type = self._infer_type_from_embeddings(term, language)
        
        # Use morphological and syntactic cues
        morphological_type = self._infer_type_from_morphology(term, language)
        
        # Use contextual information if available
        contextual_type = self._infer_type_from_context(term, context, language) if context else None
        
        # Combine evidence
        final_type = self._resolve_type_conflict(
            embedding_based_type, morphological_type, contextual_type
        )
        
        # Get type hierarchy information
        type_info = self.type_hierarchy.get(final_type['type'], {})
        
        result = {
            'term': term,
            'language': language,
            'semantic_type': final_type['type'],
            'confidence': final_type['confidence'],
            'evidence': {
                'embedding_based': embedding_based_type,
                'morphological': morphological_type,
                'contextual': contextual_type
            },
            'type_properties': type_info.get('properties', []),
            'composition_rules': type_info.get('composition_rules', []),
            'subtypes': type_info.get('subtypes', []),
            # NEW: UI-specific information
            'ui_information': {
                'category': type_info.get('ui_category', 'unknown'),
                'color_code': type_info.get('color_code', '#757575'),
                'description': type_info.get('description', 'No description available'),
                'display_name': final_type['type'].replace('_', ' ').title()
            },
            'analysis_metadata': {
                'agreement_level': final_type.get('agreement_level', 0),
                'inference_method': 'hybrid',
                'processing_time': time.time()
            }
        }
        
        if self.redis_cache:
            self.redis_cache.set('semantic_types', cache_key, result, 86400)
        
        return result
    
    def _infer_type_from_embeddings(self, term: str, language: str) -> Dict[str, Any]:
        """Enhanced embedding-based type inference"""
        term_lower = term.lower()
        
        # Enhanced patterns with confidence scoring
        patterns = {
            'Event': {
                'suffixes': ['tion', 'ment', 'ance', 'ence', 'ing', 'age', 'ure', 'al'],
                'prefixes': ['re', 'pre', 'un', 'de'],
                'confidence_base': 0.75
            },
            'Agent': {
                'suffixes': ['er', 'or', 'ist', 'ant', 'ent', 'ian', 'eer'],
                'prefixes': ['co', 'sub', 'super'],
                'confidence_base': 0.8
            },
            'Property': {
                'suffixes': ['ity', 'ness', 'ism', 'ship', 'hood', 'able', 'ible', 'ful'],
                'prefixes': ['un', 'in', 'dis', 'non'],
                'confidence_base': 0.7
            }
        }
        
        for type_name, pattern_info in patterns.items():
            confidence = pattern_info['confidence_base']
            
            # Check suffixes
            for suffix in pattern_info['suffixes']:
                if term_lower.endswith(suffix):
                    confidence += 0.1
                    return {'type': type_name, 'confidence': min(confidence, 0.95), 'method': 'morphological_enhanced'}
            
            # Check prefixes
            for prefix in pattern_info['prefixes']:
                if term_lower.startswith(prefix):
                    confidence += 0.05
        
        return {'type': 'Entity', 'confidence': 0.6, 'method': 'default'}
    
    def _infer_type_from_morphology(self, term: str, language: str) -> Dict[str, Any]:
        """Enhanced morphological analysis with language-specific rules"""
        morphology_rules = {
            'en': {
                'Event': [r'.*tion$', r'.*ment$', r'.*ance$', r'.*ence$', r'.*ing$', r'.*ure$'],
                'Agent': [r'.*er$', r'.*or$', r'.*ist$', r'.*ian$', r'.*eer$'],
                'Property': [r'.*ity$', r'.*ness$', r'.*ism$', r'.*ty$', r'.*able$', r'.*ful$']
            },
            'es': {
                'Event': [r'.*ción$', r'.*miento$', r'.*anza$', r'.*encia$', r'.*ura$'],
                'Agent': [r'.*dor$', r'.*dora$', r'.*ista$', r'.*ante$', r'.*ero$'],
                'Property': [r'.*idad$', r'.*ez$', r'.*ismo$', r'.*ura$', r'.*able$']
            },
            'fr': {
                'Event': [r'.*tion$', r'.*ment$', r'.*ance$', r'.*ence$', r'.*ure$'],
                'Agent': [r'.*eur$', r'.*euse$', r'.*iste$', r'.*ant$', r'.*ier$'],
                'Property': [r'.*ité$', r'.*esse$', r'.*isme$', r'.*able$', r'.*eux$']
            }
        }
        
        rules = morphology_rules.get(language, morphology_rules['en'])
        for type_name, patterns in rules.items():
            for pattern in patterns:
                if re.match(pattern, term.lower()):
                    return {'type': type_name, 'confidence': 0.85, 'method': 'morphological_pattern'}
        
        return {'type': 'Entity', 'confidence': 0.5, 'method': 'default'}
    
    def _infer_type_from_context(self, term: str, context: str, language: str) -> Dict[str, Any]:
        """Enhanced contextual type inference"""
        context_lower = context.lower()
        
        # Enhanced contextual patterns
        context_patterns = {
            'Property': [
                r'\bis\s+' + re.escape(term.lower()),
                r'\bwas\s+' + re.escape(term.lower()),
                r'\bvery\s+' + re.escape(term.lower()),
                r'\bmore\s+' + re.escape(term.lower()),
                r'\bless\s+' + re.escape(term.lower())
            ],
            'Event': [
                r'\b' + re.escape(term.lower()) + r'\s+(?:will|can|did|does)',
                r'\bto\s+' + re.escape(term.lower()),
                r'\b(?:will|can|did|does)\s+' + re.escape(term.lower())
            ],
            'Agent': [
                r'\b' + re.escape(term.lower()) + r'\s+(?:performs|executes|does)',
                r'\bthe\s+' + re.escape(term.lower()) + r'\s+(?:who|that)'
            ]
        }
        
        for type_name, patterns in context_patterns.items():
            for pattern in patterns:
                if re.search(pattern, context_lower):
                    return {'type': type_name, 'confidence': 0.75, 'method': 'contextual_pattern'}
        
        return {'type': 'Entity', 'confidence': 0.5, 'method': 'contextual_default'}
    
    def _resolve_type_conflict(self, *type_evidences) -> Dict[str, Any]:
        """Enhanced conflict resolution with weighted voting"""
        type_votes = {}
        total_confidence = 0
        method_weights = {
            'morphological_enhanced': 1.2,
            'morphological_pattern': 1.1,
            'contextual_pattern': 1.0,
            'default': 0.5
        }
        
        for evidence in type_evidences:
            if evidence:
                type_name = evidence['type']
                confidence = evidence['confidence']
                method = evidence.get('method', 'default')
                weight = method_weights.get(method, 1.0)
                
                weighted_confidence = confidence * weight
                type_votes[type_name] = type_votes.get(type_name, 0) + weighted_confidence
                total_confidence += weighted_confidence
        
        if type_votes:
            best_type = max(type_votes.items(), key=lambda x: x[1])
            avg_confidence = best_type[1] / total_confidence if total_confidence > 0 else 0.5
            
            return {
                'type': best_type[0],
                'confidence': min(avg_confidence, 0.95),
                'agreement_level': len([v for v in type_votes.values() if v > 0]) / max(len(type_evidences), 1)
            }
        else:
            return {'type': 'Entity', 'confidence': 0.5, 'agreement_level': 0}

# ============================================================================
# ENHANCED DATA CLASSES FOR UI COMPATIBILITY
# ============================================================================

@dataclass
class AnalyzedTerm:
    """Enhanced analyzed term with grammar and semantic type information"""
    text: str
    startPosition: int
    endPosition: int
    classification: str  # 'valid', 'review', 'critical', 'spelling', 'grammar'
    score: float
    frequency: int
    context: str
    rationale: str
    suggestions: Optional[List[str]] = None
    # NEW: Enhanced fields
    semantic_type: Optional[Dict[str, Any]] = None
    grammar_issues: Optional[List[Dict[str, Any]]] = None
    ui_metadata: Optional[Dict[str, Any]] = None

@dataclass 
class AnalysisStatistics:
    """Enhanced analysis statistics with grammar metrics"""
    totalTerms: int
    validTerms: int
    reviewTerms: int
    criticalTerms: int
    qualityScore: float
    confidenceMin: float
    confidenceMax: float
    coverage: float
    # NEW: Grammar statistics
    grammarScore: Optional[float] = None
    grammarIssues: Optional[int] = None
    spellingIssues: Optional[int] = None

@dataclass
class AnalysisResult:
    """Enhanced analysis result with grammar analysis"""
    terms: List[AnalyzedTerm]
    statistics: AnalysisStatistics
    # NEW: Grammar analysis results
    grammar_analysis: Optional[Dict[str, Any]] = None
    processing_metadata: Optional[Dict[str, Any]] = None

# ============================================================================
# ENHANCED LEXIQ ENGINE
# ============================================================================

class LexiQEngine:
    """Enhanced LexiQ Engine with grammar checking and semantic type exposure"""
    
    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}
        self.performance_stats = {
            'total_analyses': 0,
            'cache_hits': 0,
            'average_processing_time': 0.0,
            'grammar_analyses': 0
        }
        
        # Initialize services
        self.redis_cache = RedisCacheService(**(self.config.get('redis_config', {})))
        self.semantic_embedding_service = SemanticEmbeddingService()
        self.semantic_type_system = SemanticTypeSystem(self.redis_cache)
        self.grammar_service = GrammarAnalysisService(self.redis_cache)
        
        self.logger = logging.getLogger(self.__class__.__name__)
        self.logger.info("Enhanced LexiQ Engine initialized with grammar checking capabilities")
    
    def analyze_text(self, text: str, glossary_content: str = "", 
                    language: str = 'en', domain: str = 'general',
                    check_grammar: bool = False, user_id: str = None) -> AnalysisResult:
        """
        Enhanced analyze_text method with grammar checking flag
        """
        start_time = time.time()
        
        try:
            # Load user preferences if user_id provided
            user_prefs = {}
            if user_id and self.redis_cache:
                user_prefs = self.redis_cache.get_user_preferences(user_id)
                # Override parameters with user preferences
                language = user_prefs.get('language', language)
                domain = user_prefs.get('domain', domain)
                check_grammar = user_prefs.get('grammar_checking_enabled', check_grammar)
            
            # Extract terms from text
            terms = self._extract_terms(text)
            
            # Perform grammar analysis if requested
            grammar_analysis = None
            if check_grammar:
                grammar_analysis = self.grammar_service.analyze_grammar(text, language)
                self.performance_stats['grammar_analyses'] += 1
            
            # Analyze each term
            analyzed_terms = []
            for i, term in enumerate(terms):
                # Find term position in text
                start_pos = text.find(term)
                end_pos = start_pos + len(term)
                
                # Get context around the term
                context = self._get_context(text, start_pos, end_pos)
                
                # Analyze term with enhanced semantic types
                analysis = self.analyze_term_with_types(term, context, language)
                
                # Check for grammar issues affecting this term
                term_grammar_issues = []
                if grammar_analysis:
                    term_grammar_issues = [
                        issue for issue in grammar_analysis['issues']
                        if issue['start_pos'] <= start_pos <= issue['end_pos'] or
                           issue['start_pos'] <= end_pos <= issue['end_pos']
                    ]
                
                # Map to UI format with enhanced information
                classification = self._map_to_ui_classification(analysis, term_grammar_issues)
                
                analyzed_term = AnalyzedTerm(
                    text=term,
                    startPosition=start_pos,
                    endPosition=end_pos,
                    classification=classification['category'],
                    score=classification['score'],
                    frequency=1,
                    context=context,
                    rationale=classification['rationale'],
                    suggestions=classification.get('suggestions', []),
                    # NEW: Enhanced fields
                    semantic_type=analysis.get('semantic_type'),
                    grammar_issues=term_grammar_issues,
                    ui_metadata=classification.get('ui_metadata', {})
                )
                
                analyzed_terms.append(analyzed_term)
            
            # Calculate enhanced statistics
            statistics = self._calculate_statistics(analyzed_terms, grammar_analysis)
            
            # Update performance stats
            processing_time = time.time() - start_time
            self._update_performance_stats(processing_time)
            
            return AnalysisResult(
                terms=analyzed_terms, 
                statistics=statistics,
                grammar_analysis=grammar_analysis,
                processing_metadata={
                    'processing_time': processing_time,
                    'language': language,
                    'domain': domain,
                    'grammar_checked': check_grammar,
                    'user_preferences_applied': bool(user_prefs)
                }
            )
            
        except Exception as e:
            self.logger.error(f"Enhanced analysis failed: {e}")
            return AnalysisResult(
                terms=[],
                statistics=AnalysisStatistics(
                    totalTerms=0, validTerms=0, reviewTerms=0, criticalTerms=0,
                    qualityScore=0.0, confidenceMin=0.0, confidenceMax=0.0, coverage=0.0,
                    grammarScore=0.0, grammarIssues=0, spellingIssues=0
                )
            )
    
    def analyze_grammar(self, text: str, language: str = 'en') -> Dict[str, Any]:
        """
        NEW: Dedicated grammar analysis endpoint
        """
        return self.grammar_service.analyze_grammar(text, language)
    
    def _extract_terms(self, text: str) -> List[str]:
        """Enhanced term extraction with better filtering"""
        # Enhanced word extraction with compound terms
        words = re.findall(r'\b\w+(?:[-\']\w+)*\b', text.lower())
        
        # Enhanced stop words list
        stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
            'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
            'before', 'after', 'above', 'below', 'between', 'among', 'this', 'that',
            'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
            'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our',
            'their', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
            'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
            'should', 'may', 'might', 'must', 'can', 'shall'
        }
        
        # Filter terms with enhanced criteria
        terms = []
        for word in words:
            if (len(word) > 2 and 
                word not in stop_words and 
                not word.isdigit() and 
                not re.match(r'^[^\w\s]+$', word)):  # Not just punctuation
                terms.append(word)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_terms = []
        for term in terms:
            if term not in seen:
                seen.add(term)
                unique_terms.append(term)
        
        return unique_terms[:100]  # Increased limit for better coverage
    
    def _map_to_ui_classification(self, analysis: Dict[str, Any], 
                                 grammar_issues: List[Dict] = None) -> Dict[str, Any]:
        """Enhanced classification mapping with grammar consideration"""
        confidence = analysis.get('overall_confidence', 0.5)
        semantic_type = analysis.get('semantic_type', {})
        
        # Factor in grammar issues
        has_grammar_issues = bool(grammar_issues)
        grammar_severity = 'none'
        if grammar_issues:
            severities = [issue['severity'] for issue in grammar_issues]
            if 'high' in severities:
                grammar_severity = 'high'
            elif 'medium' in severities:
                grammar_severity = 'medium'
            else:
                grammar_severity = 'low'
        
        # Enhanced classification logic
        if has_grammar_issues and grammar_severity == 'high':
            category = 'grammar'
            rationale = f"Grammar issues detected: {', '.join([issue['rule'] for issue in grammar_issues])}"
            confidence *= 0.7  # Reduce confidence for grammar issues
        elif confidence >= 0.8 and not has_grammar_issues:
            category = 'valid'
            rationale = f"High confidence term with semantic type: {semantic_type.get('semantic_type', 'Unknown')}"
        elif confidence >= 0.6:
            category = 'review'
            rationale = f"Medium confidence term requiring review. Type: {semantic_type.get('semantic_type', 'Unknown')}"
        elif confidence >= 0.4:
            category = 'critical'
            rationale = f"Low confidence term requiring attention. Type: {semantic_type.get('semantic_type', 'Unknown')}"
        else:
            category = 'spelling'
            rationale = f"Very low confidence - possible spelling error or unknown term"
        
        # Enhanced UI metadata
        ui_metadata = {
            'semantic_type_info': semantic_type.get('ui_information', {}),
            'confidence_level': 'high' if confidence >= 0.8 else 'medium' if confidence >= 0.6 else 'low',
            'has_grammar_issues': has_grammar_issues,
            'grammar_severity': grammar_severity,
            'analysis_timestamp': time.time()
        }
        
        return {
            'category': category,
            'score': confidence,
            'rationale': rationale,
            'suggestions': self._generate_suggestions(analysis),
            'ui_metadata': ui_metadata
        }
    
    def _generate_suggestions(self, analysis: Dict[str, Any]) -> List[str]:
        """Enhanced suggestion generation"""
        suggestions = []
        
        # Add suggestions based on similarity analysis
        similarity_analysis = analysis.get('similarity_analysis', [])
        for result in similarity_analysis[:3]:
            if result.get('overall_score', 0) > 0.6:
                suggestions.append(result['candidate'])
        
        # Add semantic type-based suggestions
        semantic_type = analysis.get('semantic_type', {})
        if semantic_type:
            type_name = semantic_type.get('semantic_type')
            if type_name in ['Event', 'Action']:
                suggestions.extend(['action', 'process', 'activity'])
            elif type_name in ['Property', 'Attribute']:
                suggestions.extend(['quality', 'characteristic', 'feature'])
        
        return list(set(suggestions))  # Remove duplicates
    
    def _calculate_statistics(self, analyzed_terms: List[AnalyzedTerm], 
                            grammar_analysis: Dict[str, Any] = None) -> AnalysisStatistics:
        """Enhanced statistics calculation with grammar metrics"""
        if not analyzed_terms:
            return AnalysisStatistics(
                totalTerms=0, validTerms=0, reviewTerms=0, criticalTerms=0,
                qualityScore=0.0, confidenceMin=0.0, confidenceMax=0.0, coverage=0.0,
                grammarScore=0.0, grammarIssues=0, spellingIssues=0
            )
        
        total_terms = len(analyzed_terms)
        valid_terms = len([t for t in analyzed_terms if t.classification == 'valid'])
        review_terms = len([t for t in analyzed_terms if t.classification == 'review'])
        critical_terms = len([t for t in analyzed_terms if t.classification == 'critical'])
        spelling_issues = len([t for t in analyzed_terms if t.classification == 'spelling'])
        
        scores = [t.score for t in analyzed_terms]
        quality_score = (sum(scores) / len(scores)) * 100 if scores else 0.0
        confidence_min = min(scores) if scores else 0.0
        confidence_max = max(scores) if scores else 0.0
        coverage = (valid_terms / total_terms) * 100 if total_terms > 0 else 0.0
        
        # Grammar statistics
        grammar_score = grammar_analysis.get('grammar_score', 100.0) if grammar_analysis else 100.0
        grammar_issues = grammar_analysis.get('total_issues', 0) if grammar_analysis else 0
        
        return AnalysisStatistics(
            totalTerms=total_terms,
            validTerms=valid_terms,
            reviewTerms=review_terms,
            criticalTerms=critical_terms,
            qualityScore=quality_score,
            confidenceMin=confidence_min,
            confidenceMax=confidence_max,
            coverage=coverage,
            grammarScore=grammar_score,
            grammarIssues=grammar_issues,
            spellingIssues=spelling_issues
        )
    
    def analyze_term_with_types(self, term: str, context: str = "", 
                              language: str = 'en') -> Dict[str, Any]:
        """Enhanced term analysis with detailed semantic type information"""
        # Get enhanced semantic type with UI information
        type_info = self.semantic_type_system.infer_semantic_type(term, language, context)
        
        # Enhanced similarity analysis (placeholder - would use actual similarity model)
        similarity_analysis = [
            {'candidate': f"{term}_variant1", 'overall_score': 0.8},
            {'candidate': f"{term}_variant2", 'overall_score': 0.7},
            {'candidate': f"{term}_variant3", 'overall_score': 0.6}
        ]
        
        return {
            'term': term,
            'language': language,
            'semantic_type': type_info,
            'similarity_analysis': similarity_analysis[:3],
            'overall_confidence': type_info.get('confidence', 0.5),
            'analysis_enhanced': True
        }
    
    def _update_performance_stats(self, processing_time: float):
        """Enhanced performance statistics tracking"""
        self.performance_stats['total_analyses'] += 1
        
        current_avg = self.performance_stats['average_processing_time']
        total_analyses = self.performance_stats['total_analyses']
        
        new_avg = ((current_avg * (total_analyses - 1)) + processing_time) / total_analyses
        self.performance_stats['average_processing_time'] = new_avg
    
    def get_performance_statistics(self) -> Dict[str, Any]:
        """Enhanced performance statistics"""
        return {
            'engine_stats': self.performance_stats,
            'cache_statistics': {
                'redis_available': REDIS_AVAILABLE,
                'cache_size': 'dynamic'
            },
            'feature_flags': {
                'grammar_checking': True,
                'semantic_types': True,
                'user_preferences': True,
                'enhanced_ui': True
            }
        }

# ============================================================================
# ENHANCED SEMANTIC EMBEDDING SERVICE
# ============================================================================

class SemanticEmbeddingService:
    """Enhanced semantic embedding service with improved caching"""
    
    def __init__(self, model_name='all-MiniLM-L6-v2', multilingual_model='paraphrase-multilingual-MiniLM-L12-v2'):
        self.model_name = model_name
        self.multilingual_model = multilingual_model
        self.model = None
        self.multilingual_model_instance = None
        self.embedding_cache = {}
        self.logger = logging.getLogger(self.__class__.__name__)
        
        self._initialize_models()
    
    def _initialize_models(self):
        """Initialize sentence transformer models with error handling"""
        if SENTENCE_TRANSFORMERS_AVAILABLE:
            try:
                self.model = SentenceTransformer(self.model_name)
                self.multilingual_model_instance = SentenceTransformer(self.multilingual_model)
                self.logger.info("Enhanced semantic embedding models initialized successfully")
            except Exception as e:
                self.logger.error(f"Failed to initialize semantic models: {e}")
        else:
            self.logger.warning("Sentence transformers not available - using fallback methods")
    
    def get_embedding(self, text: str, use_multilingual: bool = False) -> Optional[np.ndarray]:
        """Enhanced embedding generation with caching"""
        cache_key = f"{text}:{use_multilingual}"
        if cache_key in self.embedding_cache:
            return self.embedding_cache[cache_key]
        
        model = self.multilingual_model_instance if use_multilingual else self.model
        
        if model is None:
            # Fallback to simple hash-based embedding
            return self._generate_fallback_embedding(text)
        
        try:
            embedding = model.encode(text)
            self.embedding_cache[cache_key] = embedding
            return embedding
        except Exception as e:
            self.logger.error(f"Failed to get embedding: {e}")
            return self._generate_fallback_embedding(text)
    
    def _generate_fallback_embedding(self, text: str) -> np.ndarray:
        """Generate simple fallback embedding when models are unavailable"""
        # Simple hash-based embedding for fallback
        hash_value = hash(text)
        return np.array([float((hash_value >> i) & 1) for i in range(384)])

# ============================================================================
# ENHANCED API COMPATIBILITY LAYER
# ============================================================================

class LexiQAPIAdapter:
    """Enhanced API adapter with new endpoints"""
    
    def __init__(self, engine: LexiQEngine):
        self.engine = engine
    
    def analyze_translation(self, translation_content: str, glossary_content: str = "",
                          language: str = 'en', domain: str = 'general',
                          check_grammar: bool = False, user_id: str = None) -> Dict[str, Any]:
        """
        Enhanced main API endpoint with grammar checking support
        """
        try:
            result = self.engine.analyze_text(
                text=translation_content,
                glossary_content=glossary_content,
                language=language,
                domain=domain,
                check_grammar=check_grammar,
                user_id=user_id
            )
            
            return {
                'terms': [asdict(term) for term in result.terms],
                'statistics': asdict(result.statistics),
                'grammar_analysis': result.grammar_analysis,
                'processing_metadata': result.processing_metadata
            }
            
        except Exception as e:
            logger.error(f"Enhanced API analysis failed: {e}")
            return {
                'error': str(e),
                'terms': [],
                'statistics': {
                    'totalTerms': 0, 'validTerms': 0, 'reviewTerms': 0, 'criticalTerms': 0,
                    'qualityScore': 0.0, 'confidenceMin': 0.0, 'confidenceMax': 0.0, 'coverage': 0.0,
                    'grammarScore': 0.0, 'grammarIssues': 0, 'spellingIssues': 0
                }
            }
    
    def analyze_grammar(self, text: str, language: str = 'en') -> Dict[str, Any]:
        """
        NEW: Dedicated grammar analysis endpoint
        """
        try:
            return self.engine.analyze_grammar(text, language)
        except Exception as e:
            logger.error(f"Grammar analysis failed: {e}")
            return {
                'error': str(e),
                'text': text,
                'language': language,
                'issues': [],
                'grammar_score': 0.0,
                'total_issues': 0
            }
    
    def set_user_preference(self, user_id: str, preference_key: str, value: Any) -> Dict[str, Any]:
        """
        NEW: Set user preferences
        """
        try:
            success = self.engine.redis_cache.set_user_preference(user_id, preference_key, value)
            return {'success': success, 'user_id': user_id, 'preference': preference_key}
        except Exception as e:
            logger.error(f"Failed to set user preference: {e}")
            return {'success': False, 'error': str(e)}
    
    def get_user_preferences(self, user_id: str) -> Dict[str, Any]:
        """
        NEW: Get user preferences
        """
        try:
            preferences = self.engine.redis_cache.get_user_preferences(user_id)
            return {'success': True, 'user_id': user_id, 'preferences': preferences}
        except Exception as e:
            logger.error(f"Failed to get user preferences: {e}")
            return {'success': False, 'error': str(e), 'preferences': {}}

# ============================================================================
# FACTORY FUNCTIONS
# ============================================================================

def create_enhanced_lexiq_engine(config_path: Optional[str] = None) -> LexiQEngine:
    """Factory function to create enhanced LexiQ Engine"""
    config = {
        'use_semantic_similarity': True,
        'cache_enabled': True,
        'similarity_threshold': 0.7,
        'grammar_checking_enabled': True,
        'redis_config': {
            'host': 'localhost',
            'port': 6379
        }
    }
    
    if config_path and Path(config_path).exists():
        with open(config_path, 'r') as f:
            user_config = json.load(f)
            config.update(user_config)
    
    return LexiQEngine(config)

# ============================================================================
# MAIN EXECUTION
# ============================================================================

if __name__ == "__main__":
    # Example usage with enhanced features
    engine = create_enhanced_lexiq_engine()
    api_adapter = LexiQAPIAdapter(engine)
    
    # Example analysis with grammar checking
    sample_text = "The cybersecurity framework implementation requires comprehensive validation and testing procedures. This are very important for security."
    
    print("=== Enhanced LexiQ Analysis with Grammar Checking ===")
    result = api_adapter.analyze_translation(
        translation_content=sample_text,
        language='en',
        domain='technology',
        check_grammar=True,
        user_id='demo_user'
    )
    
    print(json.dumps(result, indent=2, default=str))
    
    # Example grammar-only analysis
    print("\n=== Grammar Analysis Only ===")
    grammar_result = api_adapter.analyze_grammar(sample_text, 'en')
    print(json.dumps(grammar_result, indent=2, default=str))
    
    # Performance statistics
    stats = engine.get_performance_statistics()
    print("\n=== Enhanced Performance Statistics ===")
    print(json.dumps(stats, indent=2, default=str))
