# LexiQ Enhanced System - Quick Start Guide

## 🚀 Quick Start

### Backend Setup

1. **Install Dependencies**
```bash
cd backend
pip install fastapi pandas pydantic uvicorn
```

2. **Start Backend Server**
```bash
# Create a main.py file to run the API
uvicorn main:app --reload --port 8000
```

3. **Example main.py**
```python
from fastapi import FastAPI
from backend.lexiq_api import router as lexiq_router
from backend.hot_match_api import router as hotmatch_router

app = FastAPI(title="LexiQ API", version="2.0.0")

# Include routers
app.include_router(lexiq_router)
app.include_router(hotmatch_router)

@app.get("/")
def root():
    return {"message": "LexiQ API v2.0", "status": "running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Frontend Setup

1. **Environment Variables**
Create `.env` file:
```env
VITE_API_BASE_URL=http://localhost:8000
```

2. **Start Development Server**
```bash
npm run dev
```

3. **Import Components**
```typescript
import { EnhancedDataManagementTab } from '@/components/lexiq/EnhancedDataManagementTab';
import { EnhancedTermTooltip } from '@/components/lexiq/EnhancedTermTooltip';
import { useRecommendations } from '@/hooks/useRecommendations';
import { lexiqApi } from '@/lib/lexiqApiClient';
```

---

## 📋 Common Tasks

### Task 1: Validate a Term

**Backend:**
```python
from backend.enhanced_lexiq_engine import EnhancedLexiQEngine

engine = EnhancedLexiQEngine()
result = engine.validate_term(
    term="implementation",
    domain="technology",
    language="en",
    context="The implementation phase begins next week"
)

print(f"Tier: {result.fallback_tier.value}")
print(f"Valid: {result.is_valid}")
print(f"Confidence: {result.confidence}")
```

**Frontend:**
```typescript
const validation = await lexiqApi.validateTerm(
  'implementation',
  'technology',
  'en',
  'The implementation phase begins next week'
);

console.log('Tier:', validation.fallback_tier);
console.log('Valid:', validation.is_valid);
console.log('Confidence:', validation.confidence);
```

### Task 2: Get Recommendations

**Backend:**
```python
from backend.hot_match_service import HotMatchService

service = HotMatchService()
recommendations = await service.get_context_aware_recommendations(
    term="implementation",
    domain="technology",
    language="en",
    context="The implementation phase...",
    llm_annotations=[
        {
            'term': 'deployment',
            'confidence': 0.85,
            'rationale': 'More specific for this context'
        }
    ]
)
```

**Frontend:**
```typescript
const { fetchRecommendations } = useRecommendations();

const recs = await fetchRecommendations(
  'implementation',
  'technology',
  'en',
  'The implementation phase...',
  'review'
);

console.log('Recommendations:', recs.recommendations);
```

### Task 3: Sync Term Updates

**Backend:**
```python
from backend.pandas_sync_service import PandasSyncService

sync = PandasSyncService()

# Create term
await sync.create_term({
    'term': 'deployment',
    'domain': 'technology',
    'language': 'en',
    'classification': 'valid',
    'score': 95.0
})

# Update term
await sync.update_term('term_123', {
    'classification': 'valid',
    'score': 98.0
})

# Get sync history
history = sync.get_sync_history(limit=10)
```

**Frontend:**
```typescript
// Create term
const newTerm = await lexiqApi.createTerm({
  term: 'deployment',
  domain: 'technology',
  language: 'en',
  classification: 'valid',
  score: 95.0,
  frequency: 0,
  context: '',
  rationale: ''
});

// Update term
const updated = await lexiqApi.updateTerm('term_123', {
  classification: 'valid',
  score: 98.0
});

// Get sync history
const history = await lexiqApi.getSyncHistory(10);
```

### Task 4: Use Enhanced Data Management Tab

```typescript
import { EnhancedDataManagementTab } from '@/components/lexiq/EnhancedDataManagementTab';

function MyComponent() {
  const [terms, setTerms] = useState<AnalyzedTerm[]>([]);

  return (
    <EnhancedDataManagementTab
      terms={terms}
      glossaryContent={glossaryText}
      currentFullText={fullText}
      domain="technology"
      language="en"
      onTermsUpdate={(updatedTerms) => {
        setTerms(updatedTerms);
        console.log('Terms updated:', updatedTerms);
      }}
    />
  );
}
```

### Task 5: Display Enhanced Tooltip

```typescript
import { EnhancedTermTooltip } from '@/components/lexiq/EnhancedTermTooltip';

function TermDisplay({ term }) {
  const handleReplaceInEditor = (newTerm: string) => {
    // Replace term in editor
    console.log('Replacing with:', newTerm);
  };

  const handleReplaceInGlossary = (termId: string, newTerm: string) => {
    // Update glossary
    console.log('Updating glossary:', termId, newTerm);
  };

  return (
    <Popover>
      <PopoverTrigger>
        <span className="cursor-pointer underline">{term.text}</span>
      </PopoverTrigger>
      <PopoverContent>
        <EnhancedTermTooltip
          term={term.text}
          classification={term.classification}
          score={term.score}
          rationale={term.rationale}
          context={term.context}
          domain="technology"
          language="en"
          termId={term.id}
          onReplaceInEditor={handleReplaceInEditor}
          onReplaceInGlossary={handleReplaceInGlossary}
        />
      </PopoverContent>
    </Popover>
  );
}
```

---

## 🔍 Debugging Tips

### Check Backend Health
```bash
curl http://localhost:8000/api/v2/lexiq/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "lexiq-api",
  "version": "2.0.0",
  "components": {
    "pandas_sync": 0,
    "lexiq_engine": "active",
    "hot_match": "active"
  }
}
```

### Check Frontend API Connection
```typescript
const health = await lexiqApi.healthCheck();
console.log('Backend status:', health);
```

### Enable Debug Logging

**Backend:**
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

**Frontend:**
```typescript
// In lexiqApiClient.ts, add console.log in request method
console.log('API Request:', endpoint, options);
```

---

## 🎯 Key Concepts

### Fallback Tiers
- **Tier 1:** Exact/fuzzy DataFrame match (fastest, highest confidence)
- **Tier 2:** Semantic inference (medium speed, context-aware)
- **Tier 3:** Auto-recommend (slowest, fallback option)

### Recommendation Sources
- **HotMatch:** Based on user selection history
- **LLM Annotation:** AI-generated suggestions
- **Hybrid:** Combined and ranked by context

### Sync Events
- Broadcast to all registered listeners
- Include timestamp and user info
- Stored in history (last 100)

---

## ⚠️ Common Issues

### Issue 1: CORS Errors
**Solution:** Add CORS middleware to FastAPI
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Issue 2: Import Errors
**Solution:** Ensure proper Python path
```python
import sys
sys.path.append('/path/to/backend')
```

### Issue 3: TypeScript Errors
**Solution:** Check tsconfig.json paths
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## 📊 Performance Tips

1. **Use Batch Operations**
   - Validate multiple terms at once
   - Batch update for bulk changes

2. **Cache Recommendations**
   - useRecommendations hook caches by term/domain/language
   - Clear cache when context changes significantly

3. **Optimize DataFrame Operations**
   - Use filters in queryTerms() to reduce data transfer
   - Implement pagination for large datasets

4. **Async Operations**
   - All backend operations are async
   - Use Promise.all() for parallel requests

---

## 🧪 Testing Examples

### Backend Test
```python
import pytest
from backend.enhanced_lexiq_engine import EnhancedLexiQEngine

@pytest.mark.asyncio
async def test_tier1_validation():
    engine = EnhancedLexiQEngine()
    result = engine.validate_term("test", "general", "en", "")
    assert result.fallback_tier is not None
    assert result.confidence >= 0
```

### Frontend Test
```typescript
import { render, screen } from '@testing-library/react';
import { EnhancedTermTooltip } from '@/components/lexiq/EnhancedTermTooltip';

test('renders term tooltip', () => {
  render(
    <EnhancedTermTooltip
      term="test"
      classification="review"
      score={75}
      rationale="Test rationale"
      context="Test context"
      domain="general"
      language="en"
    />
  );
  expect(screen.getByText('test')).toBeInTheDocument();
});
```

---

## 📚 Additional Resources

- **Full Documentation:** See `IMPLEMENTATION_COMPLETE.md`
- **API Reference:** Check backend docstrings
- **Component Props:** See TypeScript interfaces
- **Examples:** Review code comments

---

## 🆘 Getting Help

1. Check this guide first
2. Review IMPLEMENTATION_COMPLETE.md
3. Inspect browser console for errors
4. Check backend logs
5. Verify API endpoints with curl/Postman

---

**Last Updated:** October 25, 2025  
**Version:** 2.0.0
