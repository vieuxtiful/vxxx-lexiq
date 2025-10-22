"""
Hot Match Detector - Identifies interchangeable terms during LQA sessions
"""
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class InterchangeableMatch:
    """Represents a detected interchangeable term match"""
    base_term: str
    detected_term: str
    alternatives: List[str]
    context: str
    confidence: float
    domain: str


class HotMatchDetector:
    """Detects interchangeable terms during LQA sessions"""
    
    def __init__(self):
        self.interchangeable_patterns = {
            'technology': {
                'implementation': ['deployment', 'rollout', 'integration', 'execution'],
                'framework': ['architecture', 'structure', 'scaffold', 'platform'],
                'validation': ['verification', 'authentication', 'certification', 'confirmation'],
                'configuration': ['setup', 'settings', 'parameters', 'options'],
                'optimization': ['enhancement', 'improvement', 'refinement', 'tuning'],
                'interface': ['UI', 'user interface', 'frontend', 'GUI'],
                'database': ['data store', 'repository', 'storage', 'datastore'],
                'authentication': ['login', 'sign-in', 'authorization', 'access control'],
                'endpoint': ['API', 'service', 'route', 'resource'],
                'module': ['component', 'package', 'library', 'plugin'],
            },
            'medical': {
                'treatment': ['therapy', 'intervention', 'management', 'care'],
                'diagnosis': ['assessment', 'evaluation', 'identification', 'examination'],
                'medication': ['drug', 'pharmaceutical', 'medicine', 'prescription'],
                'procedure': ['operation', 'surgery', 'intervention', 'technique'],
                'symptom': ['sign', 'indication', 'manifestation', 'presentation'],
                'patient': ['individual', 'subject', 'case', 'client'],
                'physician': ['doctor', 'clinician', 'practitioner', 'medical professional'],
                'examination': ['checkup', 'assessment', 'evaluation', 'screening'],
            },
            'legal': {
                'contract': ['agreement', 'covenant', 'pact', 'arrangement'],
                'litigation': ['lawsuit', 'legal action', 'proceedings', 'case'],
                'compliance': ['adherence', 'conformity', 'observance', 'accordance'],
                'regulation': ['rule', 'law', 'statute', 'ordinance'],
                'liability': ['responsibility', 'accountability', 'obligation', 'duty'],
                'jurisdiction': ['authority', 'domain', 'territory', 'purview'],
                'plaintiff': ['claimant', 'complainant', 'petitioner', 'litigant'],
                'defendant': ['respondent', 'accused', 'party'],
            },
            'finance': {
                'investment': ['capital allocation', 'funding', 'stake', 'portfolio'],
                'revenue': ['income', 'earnings', 'proceeds', 'receipts'],
                'expenditure': ['expense', 'cost', 'outlay', 'spending'],
                'profit': ['gain', 'return', 'earnings', 'surplus'],
                'asset': ['holding', 'property', 'resource', 'capital'],
                'liability': ['debt', 'obligation', 'commitment', 'payable'],
                'transaction': ['deal', 'trade', 'exchange', 'operation'],
                'portfolio': ['holdings', 'investments', 'assets', 'collection'],
            },
            'marketing': {
                'campaign': ['initiative', 'program', 'effort', 'drive'],
                'engagement': ['interaction', 'involvement', 'participation', 'activity'],
                'conversion': ['acquisition', 'sale', 'signup', 'registration'],
                'audience': ['market', 'demographic', 'target group', 'consumers'],
                'brand': ['trademark', 'identity', 'label', 'name'],
                'content': ['material', 'copy', 'messaging', 'collateral'],
                'strategy': ['plan', 'approach', 'tactic', 'methodology'],
            },
            'general': {
                'utilize': ['use', 'employ', 'apply', 'leverage'],
                'facilitate': ['enable', 'support', 'assist', 'help'],
                'implement': ['execute', 'deploy', 'apply', 'carry out'],
                'optimize': ['improve', 'enhance', 'refine', 'perfect'],
                'analyze': ['examine', 'study', 'evaluate', 'assess'],
                'demonstrate': ['show', 'illustrate', 'display', 'exhibit'],
                'establish': ['create', 'set up', 'form', 'institute'],
                'maintain': ['preserve', 'sustain', 'keep', 'uphold'],
            }
        }
    
    def detect_interchangeable_terms(
        self, 
        analyzed_terms: List[Dict[str, Any]], 
        domain: str, 
        context: str,
        language: str = 'en'
    ) -> List[InterchangeableMatch]:
        """
        Detect potential interchangeable terms in current analysis
        
        Args:
            analyzed_terms: List of analyzed term dictionaries
            domain: Domain context (e.g., 'technology', 'medical')
            context: Full text context
            language: Language code (default: 'en')
        
        Returns:
            List of InterchangeableMatch objects
        """
        matches: List[InterchangeableMatch] = []
        
        # Normalize domain
        domain_lower = domain.lower()
        
        # Check domain-specific patterns first
        if domain_lower in self.interchangeable_patterns:
            matches.extend(
                self._check_domain_patterns(
                    analyzed_terms, 
                    domain_lower, 
                    context
                )
            )
        
        # Always check general patterns
        if domain_lower != 'general':
            matches.extend(
                self._check_domain_patterns(
                    analyzed_terms, 
                    'general', 
                    context
                )
            )
        
        logger.info(f"Detected {len(matches)} hot matches in domain '{domain}'")
        
        return matches
    
    def _check_domain_patterns(
        self, 
        analyzed_terms: List[Dict[str, Any]], 
        domain: str, 
        context: str
    ) -> List[InterchangeableMatch]:
        """Check terms against domain-specific patterns"""
        matches: List[InterchangeableMatch] = []
        patterns = self.interchangeable_patterns.get(domain, {})
        
        for term_data in analyzed_terms:
            term_text = term_data.get('text', '').lower().strip()
            
            if not term_text:
                continue
            
            # Check if term matches any base term or alternative
            for base_term, alternatives in patterns.items():
                all_terms = [base_term] + alternatives
                
                if term_text in [t.lower() for t in all_terms]:
                    # Extract context window around the term
                    term_context = self._extract_context(
                        context, 
                        term_text, 
                        window=50
                    )
                    
                    # Calculate confidence based on exact match vs fuzzy
                    confidence = 0.9 if term_text == base_term.lower() else 0.8
                    
                    # Filter out the detected term from alternatives
                    filtered_alternatives = [
                        alt for alt in alternatives 
                        if alt.lower() != term_text
                    ]
                    
                    # Only add if there are alternatives
                    if filtered_alternatives:
                        matches.append(InterchangeableMatch(
                            base_term=base_term,
                            detected_term=term_text,
                            alternatives=filtered_alternatives,
                            context=term_context,
                            confidence=confidence,
                            domain=domain
                        ))
                    
                    break  # Found match, move to next term
        
        return matches
    
    def _extract_context(
        self, 
        full_text: str, 
        term: str, 
        window: int = 50
    ) -> str:
        """Extract context window around a term"""
        try:
            term_lower = term.lower()
            text_lower = full_text.lower()
            
            # Find term position
            pos = text_lower.find(term_lower)
            
            if pos == -1:
                return full_text[:100]  # Return first 100 chars if not found
            
            # Extract window
            start = max(0, pos - window)
            end = min(len(full_text), pos + len(term) + window)
            
            context = full_text[start:end]
            
            # Add ellipsis if truncated
            if start > 0:
                context = '...' + context
            if end < len(full_text):
                context = context + '...'
            
            return context
        except Exception as e:
            logger.error(f"Failed to extract context: {e}")
            return full_text[:100]
    
    def add_custom_pattern(
        self, 
        domain: str, 
        base_term: str, 
        alternatives: List[str]
    ):
        """Add a custom interchangeable pattern"""
        if domain not in self.interchangeable_patterns:
            self.interchangeable_patterns[domain] = {}
        
        self.interchangeable_patterns[domain][base_term] = alternatives
        logger.info(f"Added custom pattern: {base_term} -> {alternatives} in domain '{domain}'")
    
    def get_patterns_for_domain(self, domain: str) -> Dict[str, List[str]]:
        """Get all patterns for a specific domain"""
        return self.interchangeable_patterns.get(domain.lower(), {})
