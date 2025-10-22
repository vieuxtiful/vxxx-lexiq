# Hot Match System - Complete Implementation Guide

## Overview

The Hot Match system provides **crowd-sourced recommendations** for interchangeable terms during LQA (Linguistic Quality Assurance) sessions. It detects alternative terms, tracks user preferences across all LexiQ users, and displays real-time popularity percentages.

---

## Architecture

### Backend (Python)

```
backend/
├── hot_match_detector.py    # Term detection logic
├── hot_match_service.py      # Data management & calculations
└── hot_match_api.py          # FastAPI endpoints
```

### Frontend (TypeScript/React)

```
src/
├── types/
│   └── hotMatch.ts           # TypeScript interfaces
├── components/lexiq/
│   ├── HotMatchBadge.tsx     # Percentage badge component
│   ├── HotMatchDialog.tsx    # Selection dialog
│   └── HotMatchTooltip.tsx   # Tooltip with alternatives
└── hooks/
    └── useHotMatch.tsx       # React hook for API calls
```

---

## How It Works

### 1. Term Detection

When analysis completes, the system:
1. Scans analyzed terms
2. Matches against domain-specific patterns
3. Identifies interchangeable alternatives
4. Extracts context around each term

### 2. Percentage Calculation

For each alternative term:
1. Query database for all user selections
2. Calculate: `(term_selections / total_selections) * 100`
3. Cache result for 1 hour
4. Display in UI with color-coded badge

### 3. User Selection

When user chooses a term:
1. Record selection in database
2. Update cached percentages
3. Contribute to crowd-sourced data
4. Improve recommendations for all users

---

## Backend Implementation

### HotMatchDetector

Detects interchangeable terms based on domain-specific patterns.

**Key Features:**
- Pre-defined patterns for 7 domains (technology, medical, legal, finance, marketing, general)
- Context extraction around detected terms
- Confidence scoring
- Custom pattern support

**Example Usage:**
```python
from hot_match_detector import HotMatchDetector

detector = HotMatchDetector()

matches = detector.detect_interchangeable_terms(
    analyzed_terms=[
        {'text': 'implementation', 'position': 0},
        {'text': 'validation', 'position': 50}
    ],
    domain='technology',
    context='The implementation of the new framework requires validation.',
    language='en'
)

# Returns: [InterchangeableMatch(...), InterchangeableMatch(...)]
```

**Domain Patterns:**

| Domain | Example Base Term | Alternatives |
|--------|-------------------|--------------|
| Technology | implementation | deployment, rollout, integration, execution |
| Medical | treatment | therapy, intervention, management, care |
| Legal | contract | agreement, covenant, pact, arrangement |
| Finance | investment | capital allocation, funding, stake, portfolio |
| Marketing | campaign | initiative, program, effort, drive |

### HotMatchService

Manages data storage, caching, and percentage calculations.

**Key Features:**
- Hash generation for term groups
- Database integration (Supabase)
- Redis caching (1-hour TTL)
- Percentage calculation
- User history tracking

**Example Usage:**
```python
from hot_match_service import HotMatchService

service = HotMatchService(supabase_client, cache_service)

# Record user selection
await service.record_user_selection(
    user_id='user123',
    hot_match_data={
        'baseTerm': 'implementation',
        'selectedTerm': 'deployment',
        'rejectedTerms': ['rollout', 'integration'],
        'domain': 'technology',
        'language': 'en'
    }
)

# Get percentage
percentage = await service.get_hot_match_percentage(
    base_term_hash='abc123',
    term='deployment'
)
# Returns: 75.0
```

### API Endpoints

#### POST `/api/v2/hot-matches/detect`

Detect hot matches in analyzed terms.

**Request:**
```json
{
  "terms": [
    {"text": "implementation", "position": 0}
  ],
  "domain": "technology",
  "language": "en",
  "content": "The implementation requires validation.",
  "projectId": "proj123"
}
```

**Response:**
```json
{
  "hotMatches": [
    {
      "baseTerm": "implementation",
      "detectedTerm": "implementation",
      "interchangeableTerms": ["implementation", "deployment", "rollout", "integration"],
      "percentages": {
        "implementation": 75.0,
        "deployment": 15.0,
        "rollout": 8.0,
        "integration": 2.0
      },
      "domain": "technology",
      "language": "en",
      "confidence": 0.9,
      "context": "...The implementation requires validation...",
      "baseTermHash": "abc123def456"
    }
  ],
  "totalDetected": 1
}
```

#### POST `/api/v2/hot-matches/record-selection`

Record user's term preference.

**Request:**
```json
{
  "baseTerm": "implementation",
  "selectedTerm": "deployment",
  "rejectedTerms": ["rollout", "integration"],
  "domain": "technology",
  "language": "en",
  "userId": "user123",
  "projectId": "proj123",
  "sessionId": "session456"
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Selection recorded successfully"
}
```

#### GET `/api/v2/hot-matches/percentage`

Get percentage for a specific term.

**Query Parameters:**
- `hash`: Base term hash
- `term`: Term to get percentage for

**Response:**
```json
{
  "percentage": 75.0,
  "term": "deployment",
  "baseTermHash": "abc123def456"
}
```

---

## Frontend Implementation

### TypeScript Interfaces

```typescript
interface HotMatchData {
  baseTerm: string;
  detectedTerm: string;
  interchangeableTerms: string[];
  percentages: { [term: string]: number };
  domain: string;
  language: string;
  confidence: number;
  context: string;
  baseTermHash: string;
}
```

### HotMatchBadge Component

Displays percentage with color-coding.

**Color Scheme:**
- **Green** (≥80%): Highly preferred
- **Yellow** (60-79%): Moderately preferred
- **Orange** (40-59%): Less preferred
- **Blue** (<40%): Rarely used

**Usage:**
```tsx
<HotMatchBadge 
  percentage={75.0} 
  term="deployment"
  size="md"
  showIcon={true}
/>
```

### HotMatchDialog Component

Modal for user to select preferred term.

**Features:**
- Radio button selection
- Sorted by popularity (highest first)
- Shows "Currently Used" indicator
- Context preview
- Confidence indicator
- Skip option

**Usage:**
```tsx
<HotMatchDialog
  hotMatchData={hotMatchData}
  onTermSelect={(selected, rejected) => {
    console.log('Selected:', selected);
    console.log('Rejected:', rejected);
  }}
  onSkip={() => console.log('Skipped')}
  isVisible={showDialog}
/>
```

### HotMatchTooltip Component

Tooltip showing alternatives when hovering over terms.

**Features:**
- Shows current term percentage
- Lists alternative terms with percentages
- Domain context
- Non-intrusive design

**Usage:**
```tsx
<HotMatchTooltip term="implementation" hotMatchData={hotMatchData}>
  <span className="underline cursor-help">implementation</span>
</HotMatchTooltip>
```

### useHotMatch Hook

React hook for API interactions.

**Methods:**
- `detectHotMatches(request)`: Detect hot matches
- `recordSelection(request)`: Record user selection
- `getHotMatchPercentage(hash, term)`: Get percentage

**Usage:**
```tsx
const { detectHotMatches, recordSelection, isDetecting } = useHotMatch();

// Detect hot matches
const matches = await detectHotMatches({
  terms: analysisResults.terms,
  domain: currentProject.domain,
  language: currentProject.language,
  content: currentContent
});

// Record selection
await recordSelection({
  baseTerm: 'implementation',
  selectedTerm: 'deployment',
  rejectedTerms: ['rollout', 'integration'],
  domain: 'technology',
  language: 'en',
  userId: user.id
});
```

---

## Integration with EnhancedMainInterface

### Step 1: Add State Management

```tsx
const [hotMatchData, setHotMatchData] = useState<HotMatchData | null>(null);
const [showHotMatchDialog, setShowHotMatchDialog] = useState(false);
const { detectHotMatches, recordSelection } = useHotMatch();
```

### Step 2: Detect After Analysis

```tsx
useEffect(() => {
  if (analysisComplete && analysisResults) {
    checkForHotMatches();
  }
}, [analysisComplete, analysisResults]);

const checkForHotMatches = async () => {
  if (!currentProject || !analysisResults) return;

  const matches = await detectHotMatches({
    terms: analysisResults.terms,
    domain: currentProject.domain,
    language: currentProject.language,
    content: currentContent,
    projectId: currentProject.id
  });

  if (matches.length > 0) {
    setHotMatchData(matches[0]); // Show first match
    setShowHotMatchDialog(true);
  }
};
```

### Step 3: Handle Selection

```tsx
const handleHotMatchSelection = async (
  selectedTerm: string, 
  rejectedTerms: string[]
) => {
  if (!hotMatchData || !currentProject || !user) return;

  await recordSelection({
    baseTerm: hotMatchData.baseTerm,
    selectedTerm,
    rejectedTerms,
    domain: currentProject.domain,
    language: currentProject.language,
    userId: user.id,
    projectId: currentProject.id
  });

  setShowHotMatchDialog(false);
  setHotMatchData(null);
};
```

### Step 4: Render Dialog

```tsx
<HotMatchDialog
  hotMatchData={hotMatchData}
  onTermSelect={handleHotMatchSelection}
  onSkip={() => {
    setShowHotMatchDialog(false);
    setHotMatchData(null);
  }}
  isVisible={showHotMatchDialog}
/>
```

---

## Integration with EnhancedLiveAnalysisPanel

### Add Hot Match Badges to Terms

```tsx
import { HotMatchBadge } from './HotMatchBadge';
import { HotMatchTooltip } from './HotMatchTooltip';

const renderTermWithHotMatch = (term: any, hotMatchData?: HotMatchData) => {
  const percentage = hotMatchData?.percentages[term.text] || 0;
  
  return (
    <HotMatchTooltip term={term.text} hotMatchData={hotMatchData}>
      <div className="flex items-center gap-2">
        <span>{term.text}</span>
        {percentage > 0 && (
          <HotMatchBadge 
            percentage={percentage} 
            term={term.text}
            size="sm"
          />
        )}
      </div>
    </HotMatchTooltip>
  );
};
```

---

## Database Schema

### hot_match_selections Table

```sql
CREATE TABLE hot_match_selections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  base_term_hash VARCHAR(32) NOT NULL,
  base_term VARCHAR(255) NOT NULL,
  selected_term VARCHAR(255) NOT NULL,
  rejected_terms JSONB NOT NULL,
  domain VARCHAR(100) NOT NULL,
  language VARCHAR(10) NOT NULL,
  project_id UUID REFERENCES projects(id),
  session_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_base_term_hash (base_term_hash),
  INDEX idx_user_id (user_id),
  INDEX idx_domain (domain),
  INDEX idx_created_at (created_at)
);
```

---

## Caching Strategy

### Redis Keys

```
hot_match:{base_term_hash}:{term} -> percentage (float)
```

**TTL**: 1 hour (3600 seconds)

**Invalidation**: On new selection for that term group

---

## Testing

### Backend Tests

```python
# test_hot_match_detector.py
def test_detect_interchangeable_terms():
    detector = HotMatchDetector()
    matches = detector.detect_interchangeable_terms(
        analyzed_terms=[{'text': 'implementation'}],
        domain='technology',
        context='The implementation is complete.',
        language='en'
    )
    assert len(matches) > 0
    assert matches[0].base_term == 'implementation'
    assert 'deployment' in matches[0].alternatives
```

### Frontend Tests

```typescript
// HotMatchBadge.test.tsx
describe('HotMatchBadge', () => {
  it('renders with correct percentage', () => {
    render(<HotMatchBadge percentage={75} term="deployment" />);
    expect(screen.getByText('75% Hot Match')).toBeInTheDocument();
  });

  it('shows green color for high percentage', () => {
    const { container } = render(<HotMatchBadge percentage={85} term="deployment" />);
    expect(container.firstChild).toHaveClass('bg-green-100');
  });
});
```

---

## Performance Considerations

### Backend
- **Caching**: 1-hour TTL reduces database queries
- **Batch Queries**: Get all percentages in one query
- **Indexing**: Database indexes on hash and user_id

### Frontend
- **Lazy Loading**: Only detect hot matches after analysis
- **Debouncing**: Prevent rapid API calls
- **Memoization**: Cache hot match data per session

---

## Future Enhancements

1. **Machine Learning**: Use ML to detect context-specific preferences
2. **User Profiles**: Personalized recommendations based on history
3. **Team Preferences**: Organization-level term preferences
4. **Analytics Dashboard**: Visualize trending terms and adoption rates
5. **Bulk Operations**: Apply preferences across multiple projects
6. **Export/Import**: Share term preferences between teams

---

## Conclusion

The Hot Match system provides:

✅ **Crowd-Sourced Intelligence**: Learn from all LexiQ users  
✅ **Real-Time Percentages**: See what terms are most popular  
✅ **Non-Intrusive UI**: Badges and tooltips don't disrupt workflow  
✅ **Domain-Specific**: Patterns tailored to industry context  
✅ **Scalable Architecture**: Caching and efficient database design  
✅ **Extensible**: Easy to add new domains and patterns  

This system enhances the LQA experience by providing data-driven recommendations while maintaining the existing scoring and analysis workflow! 🔥
