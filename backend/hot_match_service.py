"""
Hot Match Service - Manages Hot Match data and calculations
"""
import hashlib
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)


class HotMatchService:
    """Manages Hot Match data and calculations"""
    
    def __init__(self, supabase_client=None, cache_service=None):
        """
        Initialize Hot Match Service
        
        Args:
            supabase_client: Supabase client for database operations
            cache_service: Redis cache service for caching percentages
        """
        self.supabase = supabase_client
        self.cache = cache_service
        self.cache_ttl = 3600  # 1 hour cache TTL
    
    def generate_base_term_hash(self, base_term: str, domain: str) -> str:
        """
        Generate hash for the term group
        
        Args:
            base_term: The base term
            domain: Domain context
        
        Returns:
            MD5 hash string
        """
        hash_input = f"{base_term.lower()}{domain.lower()}"
        return hashlib.md5(hash_input.encode()).hexdigest()
    
    async def record_user_selection(
        self, 
        user_id: str, 
        hot_match_data: Dict[str, Any]
    ) -> bool:
        """
        Record user's term selection
        
        Args:
            user_id: User ID
            hot_match_data: Dictionary containing selection data
        
        Returns:
            True if successful, False otherwise
        """
        try:
            # Generate hash for the term group
            base_term_hash = self.generate_base_term_hash(
                hot_match_data['baseTerm'],
                hot_match_data['domain']
            )
            
            # Prepare selection data
            selection_data = {
                'user_id': user_id,
                'base_term_hash': base_term_hash,
                'base_term': hot_match_data['baseTerm'],
                'selected_term': hot_match_data['selectedTerm'],
                'rejected_terms': json.dumps(hot_match_data['rejectedTerms']),
                'domain': hot_match_data['domain'],
                'language': hot_match_data['language'],
                'project_id': hot_match_data.get('projectId'),
                'session_id': hot_match_data.get('sessionId'),
                'created_at': datetime.utcnow().isoformat()
            }
            
            # Store in database
            if self.supabase:
                result = await self._store_in_database(selection_data)
                if not result:
                    logger.error("Failed to store hot match selection in database")
                    return False
            else:
                logger.warning("No Supabase client - storing in memory only")
            
            # Update cache
            await self._update_hot_match_percentages(base_term_hash)
            
            logger.info(f"Recorded hot match selection: {hot_match_data['baseTerm']} -> {hot_match_data['selectedTerm']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to record hot match selection: {e}")
            return False
    
    async def get_hot_match_percentage(
        self, 
        base_term_hash: str, 
        term: str
    ) -> float:
        """
        Get Hot Match percentage for a specific term
        
        Args:
            base_term_hash: Hash of the base term + domain
            term: The specific term to get percentage for
        
        Returns:
            Percentage (0-100)
        """
        cache_key = f"hot_match:{base_term_hash}:{term.lower()}"
        
        # Try cache first
        if self.cache:
            cached_percentage = await self._get_from_cache(cache_key)
            if cached_percentage is not None:
                return float(cached_percentage)
        
        # Calculate from database
        percentage = await self._calculate_hot_match_percentage(base_term_hash, term)
        
        # Cache for 1 hour
        if self.cache:
            await self._set_in_cache(cache_key, str(percentage), self.cache_ttl)
        
        return percentage
    
    async def get_all_percentages_for_group(
        self, 
        base_term_hash: str, 
        terms: List[str]
    ) -> Dict[str, float]:
        """
        Get Hot Match percentages for all terms in a group
        
        Args:
            base_term_hash: Hash of the base term + domain
            terms: List of terms to get percentages for
        
        Returns:
            Dictionary mapping term to percentage
        """
        percentages = {}
        
        for term in terms:
            percentages[term] = await self.get_hot_match_percentage(
                base_term_hash, 
                term
            )
        
        return percentages
    
    async def _calculate_hot_match_percentage(
        self, 
        base_term_hash: str, 
        term: str
    ) -> float:
        """Calculate Hot Match percentage from database"""
        try:
            if not self.supabase:
                # Return mock data if no database
                return self._get_mock_percentage(term)
            
            # Query database for selections
            selections_data = await self._get_selections_from_database(base_term_hash)
            
            if not selections_data:
                return 0.0
            
            total_selections = len(selections_data)
            term_lower = term.lower()
            term_selections = len([
                s for s in selections_data 
                if s.get('selected_term', '').lower() == term_lower
            ])
            
            percentage = (term_selections / total_selections) * 100 if total_selections > 0 else 0.0
            
            logger.debug(f"Calculated percentage for '{term}': {percentage:.1f}% ({term_selections}/{total_selections})")
            
            return percentage
            
        except Exception as e:
            logger.error(f"Failed to calculate hot match percentage: {e}")
            return 0.0
    
    async def _update_hot_match_percentages(self, base_term_hash: str):
        """Update cached Hot Match percentages after new selection"""
        try:
            if not self.supabase:
                return
            
            selections_data = await self._get_selections_from_database(base_term_hash)
            
            if not selections_data:
                return
            
            # Calculate percentages for all terms in this group
            total_selections = len(selections_data)
            term_counts: Dict[str, int] = {}
            
            for selection in selections_data:
                term = selection.get('selected_term', '').lower()
                if term:
                    term_counts[term] = term_counts.get(term, 0) + 1
            
            # Update cache
            if self.cache:
                for term, count in term_counts.items():
                    percentage = (count / total_selections) * 100
                    cache_key = f"hot_match:{base_term_hash}:{term}"
                    await self._set_in_cache(cache_key, str(percentage), self.cache_ttl)
            
            logger.info(f"Updated hot match percentages for hash {base_term_hash}: {len(term_counts)} terms")
            
        except Exception as e:
            logger.error(f"Failed to update hot match percentages: {e}")
    
    async def _store_in_database(self, selection_data: Dict[str, Any]) -> bool:
        """Store selection in Supabase database"""
        try:
            # This would use your actual Supabase client
            # Example: self.supabase.table('hot_match_selections').insert(selection_data).execute()
            logger.info(f"Storing hot match selection in database: {selection_data['base_term']}")
            return True
        except Exception as e:
            logger.error(f"Database storage failed: {e}")
            return False
    
    async def _get_selections_from_database(
        self, 
        base_term_hash: str
    ) -> List[Dict[str, Any]]:
        """Get all selections for a base term hash from database"""
        try:
            # This would use your actual Supabase client
            # Example: result = self.supabase.table('hot_match_selections').select('*').eq('base_term_hash', base_term_hash).execute()
            # return result.data
            logger.debug(f"Fetching selections for hash: {base_term_hash}")
            return []
        except Exception as e:
            logger.error(f"Database query failed: {e}")
            return []
    
    async def _get_from_cache(self, key: str) -> Optional[str]:
        """Get value from cache"""
        try:
            # This would use your actual Redis cache
            # Example: return self.cache.get(key)
            return None
        except Exception as e:
            logger.error(f"Cache get failed: {e}")
            return None
    
    async def _set_in_cache(self, key: str, value: str, ttl: int):
        """Set value in cache with TTL"""
        try:
            # This would use your actual Redis cache
            # Example: self.cache.setex(key, ttl, value)
            pass
        except Exception as e:
            logger.error(f"Cache set failed: {e}")
    
    def _get_mock_percentage(self, term: str) -> float:
        """Get mock percentage for testing"""
        # Mock data based on term length (for demo purposes)
        mock_percentages = {
            'implementation': 75.0,
            'deployment': 15.0,
            'rollout': 8.0,
            'integration': 2.0,
            'treatment': 82.0,
            'therapy': 12.0,
            'intervention': 4.0,
            'management': 2.0,
        }
        
        return mock_percentages.get(term.lower(), 0.0)
    
    async def get_user_selection_history(
        self, 
        user_id: str, 
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """Get user's Hot Match selection history"""
        try:
            if not self.supabase:
                return []
            
            # This would query your database
            # Example: result = self.supabase.table('hot_match_selections').select('*').eq('user_id', user_id).limit(limit).order('created_at', desc=True).execute()
            # return result.data
            return []
        except Exception as e:
            logger.error(f"Failed to get user selection history: {e}")
            return []
    
    async def get_trending_terms(
        self, 
        domain: str, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get trending terms for a domain"""
        try:
            if not self.supabase:
                return []
            
            # This would query your database for most selected terms
            # Group by selected_term, count, order by count desc
            return []
        except Exception as e:
            logger.error(f"Failed to get trending terms: {e}")
            return []
