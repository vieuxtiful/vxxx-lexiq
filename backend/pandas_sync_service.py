"""
Pandas-based Data Synchronization Service
Manages reactive DataFrame synchronization for glossary operations
"""
import logging
import pandas as pd
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
import asyncio
from dataclasses import dataclass, asdict
import json

logger = logging.getLogger(__name__)


@dataclass
class SyncEvent:
    """Represents a data synchronization event"""
    event_type: str  # 'create', 'update', 'delete', 'batch_update'
    timestamp: str
    data: Dict[str, Any]
    user_id: Optional[str] = None
    session_id: Optional[str] = None


class PandasSyncService:
    """
    Manages reactive pandas DataFrame synchronization
    Handles CRUD operations with async event broadcasting
    """
    
    def __init__(self, initial_df: Optional[pd.DataFrame] = None):
        """
        Initialize Pandas Sync Service
        
        Args:
            initial_df: Initial DataFrame to manage
        """
        self.df = initial_df if initial_df is not None else self._create_empty_dataframe()
        self.event_listeners: List[Callable] = []
        self.sync_history: List[SyncEvent] = []
        self.lock = asyncio.Lock()
        
        logger.info(f"Initialized PandasSyncService with {len(self.df)} rows")
    
    def _create_empty_dataframe(self) -> pd.DataFrame:
        """Create an empty DataFrame with standard schema"""
        return pd.DataFrame(columns=[
            'id', 'term', 'target_term', 'domain', 'language',
            'classification', 'score', 'frequency', 'context',
            'rationale', 'suggestions', 'semantic_type',
            'confidence', 'created_at', 'updated_at'
        ])
    
    def register_listener(self, listener: Callable):
        """
        Register an event listener for sync events
        
        Args:
            listener: Async callback function to receive sync events
        """
        self.event_listeners.append(listener)
        logger.info(f"Registered event listener (total: {len(self.event_listeners)})")
    
    def unregister_listener(self, listener: Callable):
        """Unregister an event listener"""
        if listener in self.event_listeners:
            self.event_listeners.remove(listener)
            logger.info(f"Unregistered event listener (remaining: {len(self.event_listeners)})")
    
    async def _broadcast_event(self, event: SyncEvent):
        """
        Broadcast sync event to all registered listeners
        
        Args:
            event: SyncEvent to broadcast
        """
        self.sync_history.append(event)
        
        # Keep only last 100 events
        if len(self.sync_history) > 100:
            self.sync_history = self.sync_history[-100:]
        
        # Broadcast to all listeners
        for listener in self.event_listeners:
            try:
                if asyncio.iscoroutinefunction(listener):
                    await listener(event)
                else:
                    listener(event)
            except Exception as e:
                logger.error(f"Error broadcasting to listener: {e}")
    
    async def create_term(
        self, 
        term_data: Dict[str, Any],
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new term in the DataFrame
        
        Args:
            term_data: Dictionary containing term data
            user_id: User ID performing the operation
            session_id: Session ID
        
        Returns:
            Created term data with generated ID
        """
        async with self.lock:
            # Generate ID
            term_id = f"term_{datetime.utcnow().timestamp()}_{len(self.df)}"
            
            # Prepare row data
            row_data = {
                'id': term_id,
                'term': term_data.get('term', ''),
                'target_term': term_data.get('target_term', ''),
                'domain': term_data.get('domain', ''),
                'language': term_data.get('language', ''),
                'classification': term_data.get('classification', 'review'),
                'score': term_data.get('score', 0.0),
                'frequency': term_data.get('frequency', 0),
                'context': term_data.get('context', ''),
                'rationale': term_data.get('rationale', ''),
                'suggestions': json.dumps(term_data.get('suggestions', [])),
                'semantic_type': term_data.get('semantic_type', ''),
                'confidence': term_data.get('confidence', 0.0),
                'created_at': datetime.utcnow().isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }
            
            # Append to DataFrame
            self.df = pd.concat([self.df, pd.DataFrame([row_data])], ignore_index=True)
            
            logger.info(f"Created term: {term_id}")
            
            # Broadcast event
            event = SyncEvent(
                event_type='create',
                timestamp=datetime.utcnow().isoformat(),
                data=row_data,
                user_id=user_id,
                session_id=session_id
            )
            await self._broadcast_event(event)
            
            return row_data
    
    async def update_term(
        self,
        term_id: str,
        updates: Dict[str, Any],
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Update an existing term
        
        Args:
            term_id: ID of term to update
            updates: Dictionary of fields to update
            user_id: User ID performing the operation
            session_id: Session ID
        
        Returns:
            Updated term data or None if not found
        """
        async with self.lock:
            # Find term
            mask = self.df['id'] == term_id
            
            if not mask.any():
                logger.warning(f"Term not found: {term_id}")
                return None
            
            # Update fields
            for field, value in updates.items():
                if field in self.df.columns and field != 'id':
                    if field == 'suggestions' and isinstance(value, list):
                        value = json.dumps(value)
                    self.df.loc[mask, field] = value
            
            # Update timestamp
            self.df.loc[mask, 'updated_at'] = datetime.utcnow().isoformat()
            
            # Get updated row
            updated_row = self.df[mask].iloc[0].to_dict()
            
            logger.info(f"Updated term: {term_id}")
            
            # Broadcast event
            event = SyncEvent(
                event_type='update',
                timestamp=datetime.utcnow().isoformat(),
                data={'term_id': term_id, 'updates': updates, 'updated_row': updated_row},
                user_id=user_id,
                session_id=session_id
            )
            await self._broadcast_event(event)
            
            return updated_row
    
    async def delete_term(
        self,
        term_id: str,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> bool:
        """
        Delete a term from the DataFrame
        
        Args:
            term_id: ID of term to delete
            user_id: User ID performing the operation
            session_id: Session ID
        
        Returns:
            True if deleted, False if not found
        """
        async with self.lock:
            initial_len = len(self.df)
            self.df = self.df[self.df['id'] != term_id]
            
            if len(self.df) == initial_len:
                logger.warning(f"Term not found for deletion: {term_id}")
                return False
            
            logger.info(f"Deleted term: {term_id}")
            
            # Broadcast event
            event = SyncEvent(
                event_type='delete',
                timestamp=datetime.utcnow().isoformat(),
                data={'term_id': term_id},
                user_id=user_id,
                session_id=session_id
            )
            await self._broadcast_event(event)
            
            return True
    
    async def batch_update(
        self,
        updates: List[Dict[str, Any]],
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Perform batch update operations
        
        Args:
            updates: List of update operations, each with 'term_id' and 'updates'
            user_id: User ID performing the operation
            session_id: Session ID
        
        Returns:
            Summary of batch operation
        """
        async with self.lock:
            success_count = 0
            failed_ids = []
            
            for update_op in updates:
                term_id = update_op.get('term_id')
                update_data = update_op.get('updates', {})
                
                mask = self.df['id'] == term_id
                
                if mask.any():
                    for field, value in update_data.items():
                        if field in self.df.columns and field != 'id':
                            if field == 'suggestions' and isinstance(value, list):
                                value = json.dumps(value)
                            self.df.loc[mask, field] = value
                    
                    self.df.loc[mask, 'updated_at'] = datetime.utcnow().isoformat()
                    success_count += 1
                else:
                    failed_ids.append(term_id)
            
            result = {
                'total': len(updates),
                'success': success_count,
                'failed': len(failed_ids),
                'failed_ids': failed_ids
            }
            
            logger.info(f"Batch update: {success_count}/{len(updates)} successful")
            
            # Broadcast event
            event = SyncEvent(
                event_type='batch_update',
                timestamp=datetime.utcnow().isoformat(),
                data=result,
                user_id=user_id,
                session_id=session_id
            )
            await self._broadcast_event(event)
            
            return result
    
    async def get_term(self, term_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a single term by ID
        
        Args:
            term_id: Term ID to retrieve
        
        Returns:
            Term data or None if not found
        """
        mask = self.df['id'] == term_id
        
        if not mask.any():
            return None
        
        row = self.df[mask].iloc[0].to_dict()
        
        # Parse suggestions if stored as JSON
        if 'suggestions' in row and isinstance(row['suggestions'], str):
            try:
                row['suggestions'] = json.loads(row['suggestions'])
            except:
                row['suggestions'] = []
        
        return row
    
    async def get_all_terms(
        self,
        filters: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get all terms with optional filtering
        
        Args:
            filters: Dictionary of field filters
            limit: Maximum number of results
            offset: Number of results to skip
        
        Returns:
            List of term dictionaries
        """
        df_filtered = self.df.copy()
        
        # Apply filters
        if filters:
            for field, value in filters.items():
                if field in df_filtered.columns:
                    if isinstance(value, list):
                        df_filtered = df_filtered[df_filtered[field].isin(value)]
                    else:
                        df_filtered = df_filtered[df_filtered[field] == value]
        
        # Apply pagination
        if limit:
            df_filtered = df_filtered.iloc[offset:offset + limit]
        else:
            df_filtered = df_filtered.iloc[offset:]
        
        # Convert to list of dicts
        results = df_filtered.to_dict('records')
        
        # Parse suggestions
        for result in results:
            if 'suggestions' in result and isinstance(result['suggestions'], str):
                try:
                    result['suggestions'] = json.loads(result['suggestions'])
                except:
                    result['suggestions'] = []
        
        return results
    
    async def get_statistics(self) -> Dict[str, Any]:
        """
        Get statistics about the current DataFrame
        
        Returns:
            Dictionary with statistics
        """
        stats = {
            'total_terms': len(self.df),
            'by_classification': {},
            'by_domain': {},
            'by_language': {},
            'average_score': 0.0,
            'average_confidence': 0.0
        }
        
        if len(self.df) > 0:
            # Classification breakdown
            if 'classification' in self.df.columns:
                stats['by_classification'] = self.df['classification'].value_counts().to_dict()
            
            # Domain breakdown
            if 'domain' in self.df.columns:
                stats['by_domain'] = self.df['domain'].value_counts().to_dict()
            
            # Language breakdown
            if 'language' in self.df.columns:
                stats['by_language'] = self.df['language'].value_counts().to_dict()
            
            # Averages
            if 'score' in self.df.columns:
                stats['average_score'] = float(self.df['score'].mean())
            
            if 'confidence' in self.df.columns:
                stats['average_confidence'] = float(self.df['confidence'].mean())
        
        return stats
    
    async def export_to_csv(self, filepath: str) -> bool:
        """
        Export DataFrame to CSV file
        
        Args:
            filepath: Path to save CSV file
        
        Returns:
            True if successful
        """
        try:
            self.df.to_csv(filepath, index=False)
            logger.info(f"Exported DataFrame to {filepath}")
            return True
        except Exception as e:
            logger.error(f"Failed to export CSV: {e}")
            return False
    
    async def import_from_csv(
        self,
        filepath: str,
        replace: bool = False,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Import DataFrame from CSV file
        
        Args:
            filepath: Path to CSV file
            replace: If True, replace existing data; if False, append
            user_id: User ID performing the operation
            session_id: Session ID
        
        Returns:
            Import summary
        """
        async with self.lock:
            try:
                new_df = pd.read_csv(filepath)
                
                initial_count = len(self.df)
                
                if replace:
                    self.df = new_df
                else:
                    self.df = pd.concat([self.df, new_df], ignore_index=True)
                
                final_count = len(self.df)
                imported_count = final_count - (0 if replace else initial_count)
                
                result = {
                    'success': True,
                    'imported_count': imported_count,
                    'total_count': final_count,
                    'replaced': replace
                }
                
                logger.info(f"Imported {imported_count} terms from CSV")
                
                # Broadcast event
                event = SyncEvent(
                    event_type='batch_update',
                    timestamp=datetime.utcnow().isoformat(),
                    data={'action': 'import_csv', **result},
                    user_id=user_id,
                    session_id=session_id
                )
                await self._broadcast_event(event)
                
                return result
                
            except Exception as e:
                logger.error(f"Failed to import CSV: {e}")
                return {
                    'success': False,
                    'error': str(e)
                }
    
    def get_dataframe(self) -> pd.DataFrame:
        """Get a copy of the current DataFrame"""
        return self.df.copy()
    
    def get_sync_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get recent sync history
        
        Args:
            limit: Maximum number of events to return
        
        Returns:
            List of sync events
        """
        events = self.sync_history[-limit:]
        return [asdict(event) for event in events]
