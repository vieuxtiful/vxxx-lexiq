## 📋 OVERVIEW

## 🎯 IMPLEMENTATION PHASES

### PHASE 1: Extract and Verify Source Files
### PHASE 2: Add useConsistencyGrade Hook
### PHASE 3: Add ConsistencyCheckerIndicator Component
### PHASE 4: Add ConsistencyMetricsCard Component
### PHASE 5: Integrate with EnhancedMainInterface
### PHASE 6: Integrate with EnhancedStatisticsTab
### PHASE 7: Testing and Verification

---

## PHASE 1: EXTRACT AND VERIFY SOURCE FILES

### Step 1.1: Extract Implementation Archive


**Files**:
- `src/hooks/useConsistencyGrade.tsx`
- `src/components/lexiq/ConsistencyCheckerIndicator.tsx`
- `src/components/lexiq/ConsistencyMetricsCard.tsx`
- `CONSISTENCY_INDICATOR_ARCHITECTURE.md`
- `CONSISTENCY_INDICATOR_INTEGRATION_GUIDE.md`

**Verification Command**:
```bash
find /tmp/consistency_indicator -type f | wc -l
# Should output: 5
```

### Step 1.2: Verify Prerequisites

**Action**: Confirm enhanced consistency check system is installed

```bash
cd /path/to/vxxx-lexiq

# Verify required files exist
test -f src/hooks/useConsistencyChecks.tsx && echo "✅ useConsistencyChecks exists"
test -f src/hooks/useLQASyncEnhanced.tsx && echo "✅ useLQASyncEnhanced exists"
test -f src/types/consistencyCheck.ts && echo "✅ consistencyCheck types exist"
test -f backend/consistency_check_service.py && echo "✅ Backend service exists"
```

**All checks must pass** before proceeding.

---

## PHASE 2: ADD USECONSISTENCYGRADE HOOK

### Step 2.1: Copy Hook File

**Action**: CREATE NEW FILE

**Target File**: `src/hooks/useConsistencyGrade.tsx`

**Source File**: `/tmp/consistency_indicator/src/hooks/useConsistencyGrade.tsx`

**Instructions**:
1. Copy source file to target location
2. Verify file is ~300 lines
3. Verify imports are correct

```bash
cp /tmp/consistency_indicator/src/hooks/useConsistencyGrade.tsx \
   src/hooks/useConsistencyGrade.tsx

# Verify
wc -l src/hooks/useConsistencyGrade.tsx
# Should output: ~300 lines
```

### Step 2.2: Verify Hook Imports

**Action**: Check import paths are correct

**File**: `src/hooks/useConsistencyGrade.tsx`

**Expected Imports**:
```typescript
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLQASyncEnhanced, EnhancedLQASyncIssue, EnhancedLQAStatistics } from './useLQASyncEnhanced';
import type { ConsistencyIssue } from '@/types/consistencyCheck';
```

**If import paths differ** in your project, adjust accordingly:
```typescript
// Example adjustments
import { useLQASyncEnhanced } from './useLQASyncEnhanced';
import type { ConsistencyIssue } from '../types/consistencyCheck';
```

### Step 2.3: Test Hook Import

**Action**: Verify hook can be imported

```bash
# If using TypeScript compiler
npx tsc --noEmit src/hooks/useConsistencyGrade.tsx
# Should have no errors
```

**Key Exports**:
- `useConsistencyGrade` (main hook)
- `PanelMetrics` (interface)
- `IssueSeverityBreakdown` (interface)
- `UseConsistencyGradeReturn` (interface)

---

## PHASE 3: ADD CONSISTENCYCHECKERINDICATOR COMPONENT

### Step 3.1: Copy Component File

**Action**: CREATE NEW FILE

**Target File**: `src/components/lexiq/ConsistencyCheckerIndicator.tsx`

**Source File**: `/tmp/consistency_indicator/src/components/lexiq/ConsistencyCheckerIndicator.tsx`

**Instructions**:
1. Copy source file to target location
2. Verify file is ~350 lines
3. Verify imports are correct

```bash
cp /tmp/consistency_indicator/src/components/lexiq/ConsistencyCheckerIndicator.tsx \
   src/components/lexiq/ConsistencyCheckerIndicator.tsx

# Verify
wc -l src/components/lexiq/ConsistencyCheckerIndicator.tsx
# Should output: ~350 lines
```

### Step 3.2: Verify Component Imports

**Action**: Check import paths are correct

**File**: `src/components/lexiq/ConsistencyCheckerIndicator.tsx`

**Expected Imports**:
```typescript
import React, { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertCircle, AlertTriangle, XCircle, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
```

**If using different UI library paths**, adjust imports accordingly.

### Step 3.3: Test Component Compilation

**Action**: Verify component compiles

```bash
npx tsc --noEmit src/components/lexiq/ConsistencyCheckerIndicator.tsx
# Should have no errors
```

**Key Features**:
- Quality score display (0-100)
- Color-coded by grade (green/yellow/orange/red)
- Issue count with severity breakdown
- Tooltip with detailed info
- Analyzing state with animation
- Compact mode option
- Trend indicator option

---

## PHASE 4: ADD CONSISTENCYMETRICSCARD COMPONENT

### Step 4.1: Copy Component File

**Action**: CREATE NEW FILE

**Target File**: `src/components/lexiq/ConsistencyMetricsCard.tsx`

**Source File**: `/tmp/consistency_indicator/src/components/lexiq/ConsistencyMetricsCard.tsx`

**Instructions**:
1. Copy source file to target location
2. Verify file is ~550 lines
3. Verify imports are correct

```bash
cp /tmp/consistency_indicator/src/components/lexiq/ConsistencyMetricsCard.tsx \
   src/components/lexiq/ConsistencyMetricsCard.tsx

# Verify
wc -l src/components/lexiq/ConsistencyMetricsCard.tsx
# Should output: ~550 lines
```

### Step 4.2: Verify Component Imports

**Action**: Check import paths are correct

**File**: `src/components/lexiq/ConsistencyMetricsCard.tsx`

**Expected Imports**:
```typescript
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { /* icons */ } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PanelMetrics } from '@/hooks/useConsistencyGrade';
import type { EnhancedLQASyncIssue, EnhancedLQAStatistics } from '@/hooks/useLQASyncEnhanced';
```

**Adjust import paths** if needed for your project structure.

### Step 4.3: Test Component Compilation

**Action**: Verify component compiles

```bash
npx tsc --noEmit src/components/lexiq/ConsistencyMetricsCard.tsx
# Should have no errors
```

**Key Features**:
- Overall quality score display
- Per-panel breakdown (Source Editor / Term Validator)
- Issue type distribution
- Tabbed interface (Overview / Source / Target)
- Detailed issue list with expand/collapse
- Auto-fix buttons (if available)
- Refresh functionality
- Progress bars and charts

---

## PHASE 5: INTEGRATE WITH ENHANCEDMAININTERFACE

### Step 5.1: Locate EnhancedMainInterface

**Action**: Find the EnhancedMainInterface component

```bash
cd /path/to/vxxx-lexiq

# Find the file
find src -name "EnhancedMainInterface.tsx"
```

**Expected Location**: `src/components/lexiq/EnhancedMainInterface.tsx`

### Step 5.2: Add Imports to EnhancedMainInterface

**Action**: MODIFY EXISTING FILE

**File**: `src/components/lexiq/EnhancedMainInterface.tsx`

**Location**: Top of file (with other imports)

**Add These Imports**:
```typescript
import { ConsistencyCheckerIndicator } from './ConsistencyCheckerIndicator';
import { useConsistencyGrade } from '@/hooks/useConsistencyGrade';
```

**Example**:
```typescript
// Existing imports
import { useLQASync } from '@/hooks/useLQASync';
import { useHotMatch } from '@/hooks/useHotMatch';

// NEW: Add these imports
import { ConsistencyCheckerIndicator } from './ConsistencyCheckerIndicator';
import { useConsistencyGrade } from '@/hooks/useConsistencyGrade';
```

### Step 5.3: Add useConsistencyGrade Hook

**Action**: MODIFY EXISTING FILE

**File**: `src/components/lexiq/EnhancedMainInterface.tsx`

**Location**: After existing hooks (around line 100-200, after `useLQASync`, `useHotMatch`, etc.)

**Add This Code**:
```typescript
// Add after existing hooks
const {
  overallScore,
  totalIssues,
  issuesBySeverity,
  sourceEditorMetrics,
  termValidatorMetrics,
  allIssues,
  statistics,
  isAnalyzing: isConsistencyAnalyzing,
  lastAnalyzed,
  refreshAnalysis
} = useConsistencyGrade(
  sourceContent,
  currentContent,
  sourceLanguage,
  selectedLanguage,
  Boolean(isBilingual && lqaSyncEnabled && sourceContent.trim() && currentContent.trim())
);
```

**Variable Names**:
- `sourceContent` - Source editor content (should already exist)
- `currentContent` - Target/term validator content (should already exist)
- `sourceLanguage` - Source language code (should already exist)
- `selectedLanguage` - Target language code (should already exist)
- `isBilingual` - Bilingual mode flag (should already exist)
- `lqaSyncEnabled` - LQA sync enabled flag (should already exist)

**If variable names differ**, adjust accordingly.

### Step 5.4: Locate Main Editor Area Header

**Action**: Find the Main Editor Area header section

**File**: `src/components/lexiq/EnhancedMainInterface.tsx`

**Search For**:
```typescript
{/* Main Editor Area */}
```

or

```typescript
<ResizablePanel defaultSize={80}>
  <div className="h-full flex flex-col">
    {/* Undo/Redo Controls & Sync Mode */}
    <div className="flex items-center justify-between px-6 py-3 border-b bg-card/50">
```

**This is the header** where we'll add the indicator.

### Step 5.5: Add ConsistencyCheckerIndicator

**Action**: MODIFY EXISTING FILE

**File**: `src/components/lexiq/EnhancedMainInterface.tsx`

**Location**: Main Editor Area header (found in Step 5.4)

**Current Code** (approximately):
```typescript
<div className="flex items-center justify-between px-6 py-3 border-b bg-card/50">
  <div className="flex items-center gap-4">
    <h3 className="text-lg font-semibold">
      {currentProject?.project_type === 'bilingual' ? 'Dual Editor' : 'Editor'}
    </h3>
  </div>
  
  {/* Existing Undo/Redo controls */}
  <div className="flex items-center gap-2">
    {/* ... existing controls ... */}
  </div>
</div>
```

**Replace With**:
```typescript
<div className="flex items-center justify-between px-6 py-3 border-b bg-card/50">
  <div className="flex items-center gap-4">
    <h3 className="text-lg font-semibold">
      {currentProject?.project_type === 'bilingual' ? 'Dual Editor' : 'Editor'}
    </h3>
    
    {/* NEW: Consistency Checker Indicator */}
    {isBilingual && lqaSyncEnabled && (
      <ConsistencyCheckerIndicator
        qualityScore={overallScore}
        totalIssues={totalIssues}
        criticalIssues={issuesBySeverity.critical}
        majorIssues={issuesBySeverity.major}
        minorIssues={issuesBySeverity.minor}
        infoIssues={issuesBySeverity.info}
        isAnalyzing={isConsistencyAnalyzing}
        onViewDetails={() => setActiveTab('statistics')}
        compact={false}
        showTrend={false}
      />
    )}
  </div>
  
  {/* Existing Undo/Redo controls */}
  <div className="flex items-center gap-2">
    {/* ... existing controls ... */}
  </div>
</div>
```

**Note**: `setActiveTab` should already exist in the component. If the function name is different, adjust accordingly.

### Step 5.6: Verify EnhancedMainInterface Compiles

**Action**: Compile and check for errors

```bash
npx tsc --noEmit src/components/lexiq/EnhancedMainInterface.tsx
# Should have no errors
```

---

## PHASE 6: INTEGRATE WITH ENHANCEDSTATISTICSTAB

### Step 6.1: Locate EnhancedStatisticsTab

**Action**: Find the EnhancedStatisticsTab component

```bash
find src -name "EnhancedStatisticsTab.tsx"
```

**Expected Location**: `src/components/lexiq/EnhancedStatisticsTab.tsx`

### Step 6.2: Add Imports to EnhancedStatisticsTab

**Action**: MODIFY EXISTING FILE

**File**: `src/components/lexiq/EnhancedStatisticsTab.tsx`

**Location**: Top of file (with other imports)

**Add This Import**:
```typescript
import { ConsistencyMetricsCard } from './ConsistencyMetricsCard';
```

### Step 6.3: Update Props Interface

**Action**: MODIFY EXISTING FILE

**File**: `src/components/lexiq/EnhancedStatisticsTab.tsx`

**Location**: Props interface definition

**Find**:
```typescript
interface EnhancedStatisticsTabProps {
  // ... existing props ...
}
```

**Add**:
```typescript
interface EnhancedStatisticsTabProps {
  // ... existing props ...
  
  // NEW: Add consistency metrics prop
  consistencyMetrics?: {
    overallScore: number;
    sourceEditorMetrics: any;
    termValidatorMetrics: any;
    allIssues: any[];
    statistics: any;
    isAnalyzing: boolean;
    lastAnalyzed: Date | null;
    onRefresh: () => void;
  };
}
```

### Step 6.4: Pass Props from EnhancedMainInterface

**Action**: MODIFY EXISTING FILE

**File**: `src/components/lexiq/EnhancedMainInterface.tsx`

**Location**: Where EnhancedStatisticsTab is rendered

**Find**:
```typescript
<EnhancedStatisticsTab
  // ... existing props ...
/>
```

**Add**:
```typescript
<EnhancedStatisticsTab
  // ... existing props ...
  
  // NEW: Pass consistency metrics
  consistencyMetrics={{
    overallScore,
    sourceEditorMetrics,
    termValidatorMetrics,
    allIssues,
    statistics,
    isAnalyzing: isConsistencyAnalyzing,
    lastAnalyzed,
    onRefresh: refreshAnalysis
  }}
/>
```

### Step 6.5: Add ConsistencyMetricsCard to StatisticsTab

**Action**: MODIFY EXISTING FILE

**File**: `src/components/lexiq/EnhancedStatisticsTab.tsx`

**Location**: Where other cards are rendered (look for existing cards like `ValidatedTermsCard`, etc.)

**Add**:
```typescript
{/* Existing cards */}
<ValidatedTermsCard />
{/* ... other cards ... */}

{/* NEW: Consistency Metrics Card */}
{consistencyMetrics && (
  <ConsistencyMetricsCard
    overallScore={consistencyMetrics.overallScore}
    sourceEditorMetrics={consistencyMetrics.sourceEditorMetrics}
    termValidatorMetrics={consistencyMetrics.termValidatorMetrics}
    allIssues={consistencyMetrics.allIssues}
    statistics={consistencyMetrics.statistics}
    isAnalyzing={consistencyMetrics.isAnalyzing}
    lastAnalyzed={consistencyMetrics.lastAnalyzed}
    onRefresh={consistencyMetrics.onRefresh}
  />
)}
```

### Step 6.6: Verify EnhancedStatisticsTab Compiles

**Action**: Compile and check for errors

```bash
npx tsc --noEmit src/components/lexiq/EnhancedStatisticsTab.tsx
# Should have no errors
```

---

## PHASE 7: TESTING AND VERIFICATION

### Step 7.1: Compile Full Project

**Action**: Compile entire project

```bash
npm run build
# or
yarn build
```

**Expected**: No compilation errors

### Step 7.2: Start Development Server

**Action**: Start the application

```bash
npm run dev
# or
yarn dev
```

**Expected**: Application starts without errors

### Step 7.3: Manual Testing

**Action**: Test the integration manually

**Test Steps**:

1. **Open Application**
   - Navigate to http://localhost:5173 (or your dev server URL)

2. **Open/Create Bilingual Project**
   - Must be bilingual mode
   - Enable LQA Sync

3. **Enter Test Content**
   
   **Source Editor**:
   ```
   The price is $100. Click <button>here</button> to continue.
   ```
   
   **Term Validator**:
   ```
     El precio es 100 euros. Haga clic aquí para continuar.  
   ```
   (Note: Leading/trailing spaces, number mismatch, missing tags)

4. **Verify Indicator Appears**
   - Should appear in Main Editor Area header
   - Next to "Dual Editor" title
   - Shows quality score (should be < 90 due to issues)
   - Shows issue count (should be 3+)
   - Color-coded (likely orange or red)

5. **Check Indicator Details**
   - Hover over indicator
   - Tooltip should show:
     - Quality score
     - Issue breakdown by severity
     - Critical, Major, Minor counts

6. **Click "View Details"**
   - Should navigate to Statistics Tab
   - ConsistencyMetricsCard should be visible

7. **Verify ConsistencyMetricsCard**
   - Shows overall score
   - Shows per-panel breakdown
   - Source Editor metrics displayed
   - Term Validator metrics displayed
   - Issue list visible
   - Can expand/collapse issues

8. **Test Tabs**
   - Click "Overview" tab - shows summary
   - Click "Source" tab - shows source panel details
   - Click "Target" tab - shows target panel details

9. **Test Real-time Updates**
   - Go back to editor
   - Fix an issue (e.g., remove leading space)
   - Wait 2 seconds
   - Indicator should update
   - Score should improve

### Step 7.4: Console Verification

**Action**: Check browser console

**Expected Logs**:
```
📊 Consistency Grade Metrics: {
  overallScore: 85,
  overallGrade : "B"
  totalIssues: 3,
  sourceScore: 90,
  targetScore: 80,
  issuesBySeverity: {...},
  issuesByType: {...}
}
```

### Step 7.5: Visual Verification Checklist

**Indicator (Main Editor Area)**:
- [ ] Appears in header next to title
- [ ] Shows quality score (0-100)
- [ ] Shows grade (A, B, C, D, F)
- [ ] Shows issue count
- [ ] Color-coded correctly (green/yellow/orange/red)
- [ ] Tooltip works on hover
- [ ] "View Details" button works
- [ ] Updates within 2 seconds of content change
- [ ] Shows "Analyzing..." state during analysis

**ConsistencyMetricsCard (Statistics Tab)**:
- [ ] Displays overall score
- [ ] Shows progress bar
- [ ] Displays per-panel breakdown
- [ ] Source Editor metrics correct
- [ ] Term Validator metrics correct
- [ ] Issue type distribution shown
- [ ] Tabs work (Overview/Source/Target)
- [ ] Issue list displays correctly
- [ ] Can expand/collapse issues
- [ ] Severity badges correct
- [ ] Refresh button works (if backend running)

---

## TROUBLESHOOTING

### Issue 1: Indicator Not Showing

**Symptom**: ConsistencyCheckerIndicator doesn't appear

**Checks**:
1. Verify `isBilingual` is true
2. Verify `lqaSyncEnabled` is true
3. Verify both source and target have content
4. Check conditional rendering: `{isBilingual && lqaSyncEnabled && (...)}`
5. Check browser console for errors

**Solution**:
```typescript
// Add debug logging
console.log('Indicator visibility:', {
  isBilingual,
  lqaSyncEnabled,
  hasSource: !!sourceContent.trim(),
  hasTarget: !!currentContent.trim()
});
```

### Issue 2: TypeScript Errors

**Symptom**: Compilation errors

**Common Errors**:
- Import path issues
- Missing type definitions
- Props mismatch

**Solution**:
1. Check import paths match your project structure
2. Verify all types are exported/imported correctly
3. Check props match interface definitions

### Issue 3: Scores Not Updating

**Symptom**: Quality score doesn't change when content changes

**Checks**:
1. Wait 2 seconds (debounce delay)
2. Check backend is running (for online mode)
3. Check browser console for errors
4. Verify hook is receiving updated content

**Solution**:
```typescript
// Add debug logging in useConsistencyGrade
useEffect(() => {
  console.log('Content changed:', {
    sourceLength: sourceContent.length,
    targetLength: targetContent.length
  });
}, [sourceContent, targetContent]);
```

### Issue 4: Card Not Showing in Statistics Tab

**Symptom**: ConsistencyMetricsCard doesn't appear

**Checks**:
1. Verify `consistencyMetrics` prop is passed
2. Verify prop is not null/undefined
3. Check conditional rendering
4. Verify tab is active

**Solution**:
```typescript
// Add debug logging
console.log('Consistency metrics:', consistencyMetrics);
```

### Issue 5: Styling Issues

**Symptom**: Components look broken or unstyled

**Checks**:
1. Verify Tailwind CSS is configured
2. Verify shadcn/ui components are installed
3. Check for CSS conflicts

**Solution**:
```bash
# Reinstall UI components if needed
npx shadcn-ui@latest add badge button card progress tabs
```

---

## VERIFICATION CHECKLIST

### Files Created
- [ ] `src/hooks/useConsistencyGrade.tsx` (300 lines)
- [ ] `src/components/lexiq/ConsistencyCheckerIndicator.tsx` (350 lines)
- [ ] `src/components/lexiq/ConsistencyMetricsCard.tsx` (550 lines)

### Files Modified
- [ ] `src/components/lexiq/EnhancedMainInterface.tsx` (imports + hook + indicator)
- [ ] `src/components/lexiq/EnhancedStatisticsTab.tsx` (imports + props + card)

### Compilation
- [ ] No TypeScript errors
- [ ] Project builds successfully
- [ ] Dev server starts without errors

### Functionality
- [ ] Indicator appears in Main Editor Area
- [ ] Indicator shows correct score
- [ ] Indicator shows correct issue count
- [ ] Indicator color-coded correctly
- [ ] Tooltip works
- [ ] "View Details" navigates to Statistics Tab
- [ ] ConsistencyMetricsCard appears in Statistics Tab
- [ ] Card shows correct metrics
- [ ] Tabs work (Overview/Source/Target)
- [ ] Issues display correctly
- [ ] Real-time updates work (2s delay)

### Visual Quality
- [ ] Indicator styled correctly
- [ ] Card styled correctly
- [ ] Responsive design works
- [ ] Dark mode works (if applicable)
- [ ] Animations work (analyzing state)

---

## POST-IMPLEMENTATION

### Step 1: Commit Changes

```bash
git add src/hooks/useConsistencyGrade.tsx
git add src/components/lexiq/ConsistencyCheckerIndicator.tsx
git add src/components/lexiq/ConsistencyMetricsCard.tsx
git add src/components/lexiq/EnhancedMainInterface.tsx
git add src/components/lexiq/EnhancedStatisticsTab.tsx
git add CONSISTENCY_INDICATOR_ARCHITECTURE.md
git add CONSISTENCY_INDICATOR_INTEGRATION_GUIDE.md

git commit -m "feat: Add ConsistencyCheckerIndicator and ConsistencyMetricsCard

- Add useConsistencyGrade hook for per-panel quality metrics
- Add ConsistencyCheckerIndicator for live quality display in Main Editor Area
- Add ConsistencyMetricsCard for detailed metrics in Statistics Tab
- Integrate with EnhancedMainInterface and EnhancedStatisticsTab
- Real-time quality monitoring with 2s debounce
- Per-panel breakdown (Source Editor / Term Validator)
- Issue distribution and detailed analysis
- Fully backward compatible, no breaking changes"
```

### Step 2: Documentation

Copy documentation files to repository root:

```bash
cp /tmp/consistency_indicator/CONSISTENCY_INDICATOR_ARCHITECTURE.md ./
cp /tmp/consistency_indicator/CONSISTENCY_INDICATOR_INTEGRATION_GUIDE.md ./
```

### Step 3: Update Main README

Add section to main README:

```markdown
## Consistency Checker Indicator

Real-time quality monitoring in the Main Editor Area with detailed per-panel insights.

### Features

- Live quality score display (0-100)
- Color-coded by grade (Excellent/Good/Fair/Poor)
- Issue count with severity breakdown
- Per-panel metrics (Source Editor / Term Validator)
- Detailed analysis in Statistics Tab
- Real-time updates (2-second debounce)

### Usage

1. Enable bilingual mode
2. Enable LQA Sync
3. Indicator appears in Main Editor Area header
4. Click "View Details" to see full metrics in Statistics Tab

See [CONSISTENCY_INDICATOR_INTEGRATION_GUIDE.md](CONSISTENCY_INDICATOR_INTEGRATION_GUIDE.md) for details.
```

---

## CONFIGURATION OPTIONS

### Indicator Customization

```typescript
<ConsistencyCheckerIndicator
  qualityScore={85}              // 0-100
  totalIssues={5}                // Total count
  criticalIssues={1}             // Critical count
  majorIssues={2}                // Major count
  minorIssues={2}                // Minor count
  infoIssues={0}                 // Info count (optional)
  isAnalyzing={false}            // Show analyzing state
  onViewDetails={() => {}}       // Navigate callback (optional)
  compact={false}                // Compact mode (optional)
  showTrend={false}              // Show trend (optional)
  previousScore={80}             // For trend (optional)
/>
```

### Card Customization

```typescript
<ConsistencyMetricsCard
  overallScore={85}              // Overall quality
  sourceEditorMetrics={{...}}    // Source metrics
  termValidatorMetrics={{...}}   // Target metrics
  allIssues={[...]}              // All issues
  statistics={{...}}             // LQA stats (optional)
  isAnalyzing={false}            // Analyzing state
  lastAnalyzed={new Date()}      // Timestamp (optional)
  onRefresh={() => {}}           // Refresh callback (optional)
  onFixIssue={(id) => {}}        // Fix callback (optional)
  onDismissIssue={(id) => {}}    // Dismiss callback (optional)
/>
```

---
