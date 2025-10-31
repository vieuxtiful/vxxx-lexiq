# Consistency Check Implementation Guide

## Overview

This document describes the comprehensive implementation of the enhanced Consistency Check system for LexiQ AI XLQA. The system integrates backend-powered consistency checks with the existing LQA Engine to provide robust, scalable translation quality assurance.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React/TypeScript)              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ useLQASyncEnhanced│  │  useConsistencyChecks           │ │
│  │  - Grammar        │  │   - Segment Alignment           │ │
│  │  - Spelling       │  │   - Glossary Compliance         │ │
│  │  - Semantic Types │  │   - Punctuation/Numbers         │ │
│  └──────────────────┘  │   - Whitespace/Tags             │ │
│           │             │   - Custom Rules                │ │
│           │             └──────────────────────────────────┘ │
│           │                          │                       │
│           └──────────┬───────────────┘                       │
│                      │                                       │
└──────────────────────┼───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Functions (Deno)                  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌────────────────────────────┐  │
│  │ analyze-translation  │  │  consistency-check         │  │
│  │  (LexiQ Analysis)    │  │  (Consistency Checks)      │  │
│  └──────────────────────┘  └────────────────────────────┘  │
│              │                          │                    │
└──────────────┼──────────────────────────┼────────────────────┘
               │                          │
               ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Python Backend (FastAPI)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────────┐ │
│  │            Integrated LQA API                          │ │
│  │  /api/v2/lqa/analyze-integrated                        │ │
│  │  /api/v2/lqa/consistency-check                         │ │
│  │  /api/v2/lqa/lexiq-analyze                             │ │
│  │  /api/v2/lqa/batch-analyze                             │ │
│  └────────────────────────────────────────────────────────┘ │
│                      │                                       │
│  ┌──────────────────┴────────────────────────────────────┐  │
│  │                                                        │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐  │  │
│  │  │ LexiQ Engine         │  │ Consistency Service  │  │  │
│  │  │ (lexiq_engine_01_    │  │ (consistency_check_  │  │  │
│  │  │  oct_2025.py)        │  │  service.py)         │  │  │
│  │  │                      │  │                      │  │  │
│  │  │ - Semantic Types     │  │ - Alignment Checks   │  │  │
│  │  │ - Grammar Analysis   │  │ - Glossary Checks    │  │  │
│  │  │ - Term Classification│  │ - Pattern Checks     │  │  │
│  │  │ - Quality Scoring    │  │ - Rule Validation    │  │  │
│  │  └──────────────────────┘  └──────────────────────┘  │  │
│  │                                                        │  │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │            Hot Match System                            │ │
│  │  /api/v2/hot-matches/*                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Backend Services

#### 1.1 Consistency Check Service (`backend/LexiQ_ConsistencyChecker_Type.py`)

**Purpose**: Performs comprehensive consistency checks on translation content.

**Key Features**:
- Segment alignment validation
- Glossary term compliance
- Capitalization consistency
- Punctuation consistency
- Number format validation
- Whitespace detection
- Tag/placeholder validation
- Custom rule enforcement

**Main Class**: `ConsistencyCheckService`

**Key Methods**:
```python
def check_consistency(
    source_text: str,
    translation_text: str,
    source_language: str,
    target_language: str,
    glossary_terms: Optional[List[GlossaryTerm]] = None,
    custom_rules: Optional[List[CustomRule]] = None,
    check_types: Optional[List[ConsistencyCheckType]] = None,
    enable_cache: bool = True
) -> Tuple[List[ConsistencyIssue], ConsistencyStatistics]
```

#### 1.2 Integrated LQA API (`backend/integrated_lqa_api.py`)

**Purpose**: Provides unified API endpoints combining consistency checks with LexiQ Engine analysis.

**Key Endpoints**:

1. **POST `/api/v2/lqa/analyze-integrated`**
   - Combines consistency checks + LexiQ semantic analysis
   - Returns merged issues and unified statistics

2. **POST `/api/v2/lqa/consistency-check`**
   - Consistency checks only
   - Faster for basic validation

3. **POST `/api/v2/lqa/lexiq-analyze`**
   - LexiQ semantic analysis only
   - Grammar, spelling, semantic types

4. **POST `/api/v2/lqa/batch-analyze`**
   - Batch processing for multiple segments
   - Supports up to 100 segments per request

#### 1.3 Integration with LexiQ Engine

The implementation seamlessly integrates with the existing `lexiq_engine_01_oct_2025.py`:

**Key Integration Points**:
- Uses `EnhancedLexiQEngine` for semantic analysis
- Leverages `EnhancedLexiQAPIAdapter` for API compatibility
- Combines grammar/spelling results with consistency checks
- Unified issue reporting format

### 2. Frontend Hooks

#### 2.1 useConsistencyChecks (`src/hooks/useConsistencyChecks.tsx`)

**Purpose**: Dedicated hook for consistency checks with online/offline support.

**Features**:
- Online mode: Backend API calls
- Offline mode: Browser-based checks
- Hybrid mode: Automatic fallback
- Caching support
- Retry logic

**Usage**:
```typescript
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
  { mode: 'hybrid', cacheEnabled: true }
);
```

#### 2.2 useLQASyncEnhanced (`src/hooks/useLQASyncEnhanced.tsx`)

**Purpose**: Enhanced version of useLQASync that integrates consistency checks.

**Features**:
- Backward compatible with original useLQASync
- Combines LQA analysis + consistency checks
- Unified issue reporting
- Combined statistics
- Configurable check types

**Usage**:
```typescript
const {
  issues,
  statistics,
  isAnalyzing,
  triggerAnalysis
} = useLQASyncEnhanced(
  sourceContent,
  targetContent,
  enabled,
  sourceLanguage,
  targetLanguage,
  {
    enableConsistencyChecks: true,
    consistencyCheckMode: 'hybrid',
    glossaryTerms: [...],
    customRules: [...]
  }
);
```

### 3. Supabase Edge Functions

#### 3.1 consistency-check (`supabase/functions/consistency-check/index.ts`)

**Purpose**: Edge function that proxies requests to Python backend.

**Features**:
- CORS handling
- Request validation
- Backend communication
- Fallback to basic checks if backend unavailable
- Error handling

### 4. Type Definitions

#### 4.1 Consistency Check Types (`src/types/consistencyCheck.ts`)

**Key Types**:
```typescript
type ConsistencyCheckType =
  | 'segment_alignment'
  | 'glossary_compliance'
  | 'capitalization'
  | 'punctuation'
  | 'number_format'
  | 'whitespace'
  | 'tag_placeholder'
  | 'grammar'
  | 'spelling'
  | 'custom_rule';

interface ConsistencyIssue {
  id: string;
  type: ConsistencyCheckType;
  severity: IssueSeverity;
  targetText: string;
  startPosition: number;
  endPosition: number;
  context: string;
  message: string;
  rationale: string;
  suggestions: string[];
  confidence: number;
  autoFixable: boolean;
  sourceText?: string;
  ruleId?: string;
}
```

## Deployment

### Backend Deployment

1. **Install Dependencies**:
```bash
cd backend
pip install -r requirements.txt
```

2. **Start Backend Server**:
```bash
python main.py
# Server runs on http://localhost:8000
```

3. **Configure Environment**:
```bash
export PYTHON_BACKEND_URL=http://your-backend-url:8000
```

### Frontend Integration

1. **Update Component** (e.g., `EnhancedMainInterface.tsx`):
```typescript
import { useLQASyncEnhanced } from '@/hooks/useLQASyncEnhanced';

// Replace old useLQASync with enhanced version
const { issues, statistics, isAnalyzing } = useLQASyncEnhanced(
  sourceContent,
  currentContent,
  Boolean(isBilingual && lqaSyncEnabled),
  sourceLanguage,
  selectedLanguage,
  {
    enableConsistencyChecks: true,
    consistencyCheckMode: 'hybrid'
  }
);
```

2. **Deploy Edge Function**:
```bash
supabase functions deploy consistency-check
```

## Configuration

### Backend Configuration

**File**: `backend/main.py`

```python
# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Frontend Configuration

**Consistency Check Modes**:
- `online`: Always use backend API
- `offline`: Always use browser-based checks
- `hybrid`: Try backend first, fallback to browser

**Cache Settings**:
- `cacheEnabled`: Enable/disable caching
- `cacheTTL`: Cache time-to-live in milliseconds

## Testing

### Backend Tests

```bash
# Test consistency check service
python -m pytest backend/tests/test_LexiQ_ConsistencyChecker_Type.py

# Test integrated API
python -m pytest backend/tests/test_integrated_lqa_api.py
```

### Frontend Tests

```bash
# Test hooks
npm test src/hooks/useConsistencyChecks.test.tsx
npm test src/hooks/useLQASyncEnhanced.test.tsx
```

### Manual Testing

1. **Test Consistency Checks**:
```bash
curl -X POST http://localhost:8000/api/v2/lqa/consistency-check \
  -H "Content-Type: application/json" \
  -d '{
    "sourceText": "Hello world",
    "translationText": "Hola mundo  ",
    "sourceLanguage": "en",
    "targetLanguage": "es"
  }'
```

2. **Test Integrated Analysis**:
```bash
curl -X POST http://localhost:8000/api/v2/lqa/analyze-integrated \
  -H "Content-Type: application/json" \
  -d '{
    "sourceText": "Hello world",
    "translationText": "Hola mundo",
    "sourceLanguage": "en",
    "targetLanguage": "es",
    "checkGrammar": true,
    "checkSpelling": true
  }'
```

## Performance Optimization

### Caching Strategy

1. **Content-based caching**: Hash source + target + language pair
2. **TTL**: 5 minutes default
3. **Cache invalidation**: Automatic on content change

### Batch Processing

- Process up to 100 segments per request
- Parallel processing for independent segments
- Progress tracking for large batches

### Offline Mode

- Browser-based checks for offline scenarios
- Reduced functionality but maintains core checks
- Automatic fallback on network failure

## Migration Guide

### From Original useLQASync

**Before**:
```typescript
const { issues, isAnalyzing } = useLQASync(
  sourceContent,
  targetContent,
  enabled,
  sourceLanguage,
  targetLanguage
);
```

**After**:
```typescript
const { issues, statistics, isAnalyzing } = useLQASyncEnhanced(
  sourceContent,
  targetContent,
  enabled,
  sourceLanguage,
  targetLanguage,
  { enableConsistencyChecks: true }
);
```

**Benefits**:
- More comprehensive issue detection
- Better statistics
- Configurable check types
- Online/offline support

## Troubleshooting

### Backend Not Available

**Symptom**: Frontend shows "Backend unavailable" errors

**Solution**:
1. Check backend is running: `curl http://localhost:8000/health`
2. Verify PYTHON_BACKEND_URL environment variable
3. Check CORS configuration
4. System will automatically fallback to offline mode

### Slow Performance

**Symptom**: Analysis takes too long

**Solutions**:
1. Enable caching: `{ cacheEnabled: true }`
2. Use batch processing for multiple segments
3. Reduce check types: `{ checkTypes: ['whitespace', 'number_format'] }`
4. Consider offline mode for simple checks

### Missing Issues

**Symptom**: Expected issues not detected

**Solutions**:
1. Verify check types are enabled
2. Check severity threshold settings
3. Review glossary terms and custom rules
4. Enable debug logging

## Future Enhancements

1. **Machine Learning Integration**
   - Learn from user corrections
   - Adaptive rule generation
   - Context-aware suggestions

2. **Advanced Glossary Management**
   - Fuzzy matching
   - Context-sensitive terms
   - Multi-term phrases

3. **Performance Improvements**
   - WebAssembly for browser checks
   - Streaming analysis for large documents
   - Distributed processing

4. **UI Enhancements**
   - Visual diff view
   - One-click fix all
   - Issue prioritization
   - Custom rule builder

## Support

For issues or questions:
- GitHub Issues: https://github.com/vieuxtiful/vxxx-lexiq/issues
- Documentation: See README.md
- API Docs: http://localhost:8000/docs
