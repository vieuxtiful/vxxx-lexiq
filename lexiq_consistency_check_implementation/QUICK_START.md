# Quick Start Guide - Enhanced Consistency Check System

## 🚀 Get Started in 5 Minutes

### Step 1: Start the Backend (2 minutes)

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install fastapi uvicorn pydantic

# Start the server
python main.py
```

**Expected Output**:
```
🚀 Starting LexiQ Backend Server...
📍 Server will be available at: http://localhost:8000
📚 API documentation: http://localhost:8000/docs
INFO:     Started server process
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Test the Backend (1 minute)

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test consistency check
curl -X POST http://localhost:8000/api/v2/lqa/consistency-check \
  -H "Content-Type: application/json" \
  -d '{
    "sourceText": "Hello world",
    "translationText": "  Hola mundo  ",
    "sourceLanguage": "en",
    "targetLanguage": "es"
  }'
```

**Expected**: JSON response with detected whitespace issues

### Step 3: Run Tests (1 minute)

```bash
# Run test suite
cd backend
python test_consistency_service.py
```

**Expected**: All 10 tests pass ✅

### Step 4: Integrate Frontend (1 minute)

**Option A: Use Enhanced LQA Sync (Recommended)**

```typescript
// In your component (e.g., EnhancedMainInterface.tsx)
import { useLQASyncEnhanced } from '@/hooks/useLQASyncEnhanced';

// Replace existing useLQASync
const { issues, statistics, isAnalyzing } = useLQASyncEnhanced(
  sourceContent,
  currentContent,
  enabled,
  sourceLanguage,
  targetLanguage,
  {
    enableConsistencyChecks: true,
    consistencyCheckMode: 'hybrid' // online, offline, or hybrid
  }
);

// Use issues and statistics as before
console.log(`Found ${issues.length} issues`);
console.log(`Quality score: ${statistics.qualityScore}`);
```

**Option B: Use Consistency Checks Separately**

```typescript
import { useConsistencyChecks } from '@/hooks/useConsistencyChecks';

const {
  issues,
  statistics,
  isAnalyzing,
  error,
  triggerCheck
} = useConsistencyChecks(
  sourceContent,
  targetContent,
  sourceLanguage,
  targetLanguage,
  { mode: 'hybrid' }
);
```

### Step 5: Deploy Edge Function (Optional)

```bash
# If using Supabase
supabase functions deploy consistency-check

# Set backend URL
supabase secrets set PYTHON_BACKEND_URL=http://your-backend-url:8000
```

## 📊 Verify It's Working

### Backend Verification

1. **Check Health**:
   ```bash
   curl http://localhost:8000/health
   ```
   Should return: `{"status": "healthy", ...}`

2. **View API Docs**:
   Open browser: http://localhost:8000/docs

3. **Test Analysis**:
   ```bash
   curl -X POST http://localhost:8000/api/v2/lqa/analyze-integrated \
     -H "Content-Type: application/json" \
     -d '{
       "sourceText": "The price is $100.",
       "translationText": "El precio es 100 euros.",
       "sourceLanguage": "en",
       "targetLanguage": "es",
       "checkGrammar": true
     }'
   ```

### Frontend Verification

1. **Check Console Logs**:
   - Open browser DevTools
   - Look for: `🔄 Enhanced LQA Sync starting...`
   - Should see: `✅ Enhanced LQA Sync complete: X issues found`

2. **Check Issues**:
   ```typescript
   console.log('Issues:', issues);
   console.log('Statistics:', statistics);
   ```

3. **Test Offline Mode**:
   - Stop backend server
   - System should automatically fallback to browser checks
   - Look for: `💻 Performing offline consistency check in browser`

## 🎯 What You Get

### Immediate Benefits

✅ **10 Check Types**:
1. Segment alignment
2. Glossary compliance
3. Capitalization
4. Punctuation
5. Number format
6. Whitespace
7. Tags/placeholders
8. Grammar (via LexiQ)
9. Spelling (via LexiQ)
10. Custom rules

✅ **Three Modes**:
- **Online**: Full backend power
- **Offline**: Browser-based checks
- **Hybrid**: Automatic fallback

✅ **Smart Features**:
- Caching (5-min TTL)
- Batching (up to 100 segments)
- Retry logic (3 attempts)
- Debouncing (2-sec delay)

## 🔧 Configuration

### Backend Configuration

**File**: `backend/main.py`

```python
# Change CORS origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-domain.com"],
    ...
)

# Change port
uvicorn.run("main:app", port=8080)
```

### Frontend Configuration

```typescript
// Configure consistency checks
const { issues } = useConsistencyChecks(
  source, target, sourceLang, targetLang,
  {
    mode: 'hybrid',           // online | offline | hybrid
    cacheEnabled: true,       // Enable caching
    cacheTTL: 300000,         // 5 minutes
    retryAttempts: 3,         // Retry on failure
    timeout: 30000            // 30 seconds
  }
);
```

## 📝 Common Use Cases

### Use Case 1: Basic Consistency Check

```typescript
const { issues, statistics } = useConsistencyChecks(
  "Hello world",
  "  Hola mundo  ",
  "en",
  "es"
);

// Check for issues
if (issues.length > 0) {
  console.log(`Found ${issues.length} issues`);
  issues.forEach(issue => {
    console.log(`- ${issue.message} (${issue.severity})`);
  });
}
```

### Use Case 2: With Glossary Terms

```typescript
const glossaryTerms = [
  {
    id: '1',
    source: 'application',
    target: 'aplicación',
    caseSensitive: false
  }
];

const { triggerCheck } = useConsistencyChecks(...);

// Trigger with glossary
await triggerCheck(glossaryTerms);
```

### Use Case 3: Batch Processing

```bash
curl -X POST http://localhost:8000/api/v2/lqa/batch-analyze \
  -H "Content-Type: application/json" \
  -d '{
    "requests": [
      {
        "sourceText": "Segment 1",
        "translationText": "Segmento 1",
        "sourceLanguage": "en",
        "targetLanguage": "es"
      },
      {
        "sourceText": "Segment 2",
        "translationText": "Segmento 2",
        "sourceLanguage": "en",
        "targetLanguage": "es"
      }
    ]
  }'
```

## 🐛 Troubleshooting

### Problem: Backend not starting

**Solution**:
```bash
# Check Python version (need 3.11+)
python --version

# Install dependencies
pip install -r requirements.txt

# Check port availability
lsof -i :8000
```

### Problem: CORS errors

**Solution**:
```python
# In backend/main.py, add your frontend URL
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your frontend URL
    ...
)
```

### Problem: Tests failing

**Solution**:
```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
pip install --upgrade -r requirements.txt

# Run tests with verbose output
python test_consistency_service.py -v
```

### Problem: Frontend not detecting backend

**Solution**:
1. Check backend is running: `curl http://localhost:8000/health`
2. Check CORS configuration
3. System will auto-fallback to offline mode
4. Check browser console for error messages

## 📚 Next Steps

1. **Read Full Documentation**: See `CONSISTENCY_CHECK_IMPLEMENTATION.md`
2. **Explore API**: Visit http://localhost:8000/docs
3. **Run Tests**: `python backend/test_consistency_service.py`
4. **Customize**: Modify check types, severity levels, etc.
5. **Deploy**: Follow deployment guide in documentation

## 💡 Tips

- **Start with hybrid mode** - Best of both worlds
- **Enable caching** - Significant performance boost
- **Use batch processing** - For large documents
- **Check API docs** - Interactive testing at /docs
- **Monitor logs** - Both backend and frontend console

## 🆘 Need Help?

- **API Documentation**: http://localhost:8000/docs
- **Full Guide**: `CONSISTENCY_CHECK_IMPLEMENTATION.md`
- **Implementation Summary**: `IMPLEMENTATION_SUMMARY.md`
- **GitHub Issues**: https://github.com/vieuxtiful/vxxx-lexiq/issues

---

**Ready to use!** 🎉

The system is production-ready and can be deployed immediately.
