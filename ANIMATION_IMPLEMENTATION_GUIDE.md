# LexiQ Animation Implementation Guide

## Overview

This guide documents all modern, haptic-simulating animations implemented in the LexiQ application, following best practices for React, accessibility, and performance.

---

## 1. Hover-Over "Pop" Animations for Validated Terms Card

### CSS Implementation

**Location**: `src/index.css` (lines 748-764)

```css
.pop-hover {
  transition: transform 0.12s cubic-bezier(0.32, 1.56, 0.64, 1),
              box-shadow 0.12s cubic-bezier(0.4, 0, 0.2, 1);
}

.pop-hover:hover,
.pop-hover:focus-visible {
  transform: scale(1.05);
  box-shadow: 0 4px 18px 0 rgba(0, 0, 0, 0.10),
              0 2px 8px 0 rgba(0, 0, 0, 0.06);
}

.pop-hover:active {
  transform: scale(0.98);
  transition: transform 0.05s;
}
```

### Component Implementation

**Location**: `src/components/lexiq/ValidatedTermsCard.tsx`

**Features**:
- ✅ Haptic feedback on click (30ms vibration)
- ✅ Keyboard accessibility (Enter/Space keys)
- ✅ ARIA labels for screen readers
- ✅ Focus-visible support
- ✅ Spring-like overshoot animation

**Usage**:
```tsx
<ValidatedTermsCard
  validCount={120}
  reviewCount={15}
  criticalCount={3}
  onClick={() => console.log('Card clicked')}
/>
```

---

## 2. Main Window Menubar: Inset Hollow Buttons + Radial Pressure Hover

### CSS Implementation

**Location**: `src/index.css` (lines 598-661)

#### Inset Hollow Button
```css
.menubar-inset-button {
  position: relative;
  background: transparent;
  border: 2px solid hsl(var(--border));
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06),
              0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

#### Radial Pressure Effect
```css
.radial-pressure-hover::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    circle 100px at var(--mouse-x, 50%) var(--mouse-y, 50%),
    hsl(var(--primary) / 0.08) 0%,
    transparent 70%
  );
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
}

.radial-pressure-hover:hover::after {
  opacity: 1;
}
```

### Component Implementation

**Location**: `src/components/lexiq/MenubarButton.tsx`

**Features**:
- ✅ Mouse-tracking radial gradient
- ✅ Inset shadow for "raised" appearance
- ✅ Smooth hover transitions
- ✅ Accessible focus states

**Usage**:
```tsx
<MenubarButton
  withRadialPressure={true}
  onClick={handleVersions}
>
  <Save className="h-4 w-4 mr-2" />
  Versions
</MenubarButton>
```

---

## 3. Adjustable Panel Arrangement with Grey-Out Animation

### CSS Implementation

**Location**: `src/index.css` (lines 710-746)

```css
.panel-greyout {
  transition: filter 0.22s ease, opacity 0.22s ease;
  filter: grayscale(0.4) brightness(0.93);
  opacity: 0.75;
  pointer-events: none;
}

@keyframes greyout-in {
  from {
    filter: grayscale(0) brightness(1);
    opacity: 1;
  }
  to {
    filter: grayscale(0.4) brightness(0.93);
    opacity: 0.75;
  }
}

@keyframes greyout-out {
  from {
    filter: grayscale(0.4) brightness(0.93);
    opacity: 0.75;
  }
  to {
    filter: grayscale(0) brightness(1);
    opacity: 1;
  }
}
```

### Hook Implementation

**Location**: `src/hooks/usePanelArrangement.tsx`

**Features**:
- ✅ State management for panel locking
- ✅ Grey-out animation triggers
- ✅ Panel swap functionality
- ✅ Reset to default arrangement

**Usage**:
```tsx
const {
  arrangement,
  lockPanel,
  unlockPanel,
  setAdjusting,
  swapPanels,
  resetArrangement
} = usePanelArrangement();

// Lock a panel
lockPanel('termValidator');

// Apply grey-out class
<div className={arrangement.termValidatorState === 'locked' ? 'panel-greyout' : ''}>
  {/* Panel content */}
</div>
```

---

## 4. Source Editor: Autosave with User Confirmation

### Hook Implementation

**Location**: `src/hooks/useEditorAutosave.tsx`

**Features**:
- ✅ Automatic saving every 5 seconds (configurable)
- ✅ LocalStorage persistence
- ✅ User confirmation before overwriting
- ✅ Unsaved changes tracking
- ✅ Manual save/restore functions

**Usage**:
```tsx
const {
  content,
  lastSaved,
  hasUnsavedChanges,
  isRestoring,
  updateContent,
  checkForAutosave,
  restoreFromAutosave,
  saveNow,
  clearAutosave
} = useEditorAutosave({
  key: 'source-editor-content',
  interval: 5000,
  onSave: (content) => console.log('Saved:', content),
  onRestore: (content) => console.log('Restored:', content)
});

// Update content (marks as unsaved)
updateContent(newText);

// Check for autosaved content
const savedContent = checkForAutosave();

// Restore with confirmation
if (savedContent && !hasUnsavedChanges) {
  restoreFromAutosave();
}

// Force restore (overwrite unsaved changes)
restoreFromAutosave(true);
```

---

## 5. QA Button: Filled-to-Outlined Transition with Waveform

### Component Implementation

**Location**: `src/components/lexiq/WaveformQAButton.tsx`

**Features**:
- ✅ Filled state (idle): Gradient background
- ✅ Outlined state (analyzing): Transparent with border
- ✅ Smooth 500ms transition
- ✅ Progress bar with Q logo gradient
- ✅ Haptic feedback (50ms on press, triple pulse on completion)
- ✅ CSS waveform animation overlay

**States**:

#### Idle (Filled)
```css
background: linear-gradient(to right, #0891b2, #14b8a6);
color: white;
border: 2px solid transparent;
```

#### Analyzing (Outlined)
```css
background: transparent;
color: #22d3ee;
border: 2px solid #06b6d4;
```

**Usage**:
```tsx
<WaveformQAButton
  onClick={runAnalysis}
  disabled={!filesUploaded}
  isAnalyzing={isAnalyzing}
  className="w-full"
/>
```

---

## Accessibility Features

### Keyboard Navigation
- All interactive elements support `Tab` navigation
- `Enter` and `Space` keys trigger actions
- `focus-visible` states for keyboard users

### Screen Readers
- ARIA labels on all interactive components
- Semantic HTML (`role="button"`, `tabindex`)
- Status announcements for state changes

### Motion Preferences
```css
@media (prefers-reduced-motion: reduce) {
  .pop-hover,
  .radial-pressure-hover,
  .panel-greyout {
    transition: none;
    animation: none;
  }
}
```

---

## Performance Optimizations

### CSS Transitions
- Hardware-accelerated properties (`transform`, `opacity`)
- Avoid layout-triggering properties (`width`, `height`, `top`, `left`)
- Use `will-change` sparingly

### React Optimizations
- `useCallback` for event handlers
- `useMemo` for expensive calculations
- Refs for DOM manipulation (avoid re-renders)

### Animation Frame Rate
- Target 60fps for smooth animations
- Use `requestAnimationFrame` for complex animations
- Throttle mouse move events

---

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| CSS Transitions | ✅ | ✅ | ✅ | ✅ |
| CSS Animations | ✅ | ✅ | ✅ | ✅ |
| Vibration API | ✅ | ✅ | ❌ | ✅ |
| CSS Variables | ✅ | ✅ | ✅ | ✅ |
| Backdrop Filter | ✅ | ✅ | ✅ | ✅ |

---

## Testing Checklist

### Visual Testing
- [ ] Pop animation triggers on hover and focus
- [ ] Radial pressure follows mouse cursor
- [ ] Grey-out animation smooth and visible
- [ ] QA button transitions from filled to outlined
- [ ] Progress bar animates smoothly

### Interaction Testing
- [ ] Haptic feedback works (Chrome/Firefox/Edge)
- [ ] Keyboard navigation functional
- [ ] Screen reader announces state changes
- [ ] Touch interactions work on mobile
- [ ] Animations respect `prefers-reduced-motion`

### Performance Testing
- [ ] Animations maintain 60fps
- [ ] No layout thrashing
- [ ] Memory usage stable
- [ ] CPU usage acceptable

---

## File Structure

```
src/
├── components/
│   └── lexiq/
│       ├── ValidatedTermsCard.tsx      # Pop animation card
│       ├── MenubarButton.tsx           # Radial pressure button
│       └── WaveformQAButton.tsx        # Filled-to-outlined transition
├── hooks/
│   ├── usePanelArrangement.tsx         # Panel state management
│   └── useEditorAutosave.tsx           # Autosave with confirmation
└── index.css                            # All animation styles
```

---

## Future Enhancements

1. **Advanced Haptics**: Integrate more complex vibration patterns
2. **3D Transforms**: Add depth with perspective transforms
3. **Particle Effects**: Enhance button clicks with particles
4. **Sound Effects**: Add subtle audio feedback
5. **Gesture Support**: Swipe/pinch gestures for mobile

---

## References

- [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
- [Vibration API](https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API)
- [CSS Transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Transitions)
- [ARIA Best Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Framer Motion](https://www.framer.com/motion/) (for future enhancements)

---

## Conclusion

All requested animations have been implemented with:
- ✅ Modern, haptic-simulating effects
- ✅ Full accessibility support
- ✅ Performance optimization
- ✅ Cross-browser compatibility
- ✅ Comprehensive documentation

The implementation follows React best practices, uses semantic HTML, and provides an engaging, professional user experience.
