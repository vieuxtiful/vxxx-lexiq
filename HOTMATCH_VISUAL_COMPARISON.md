# Hot Match Visual Comparison

## Option 1: Blended Results (Unified Appearance)

### Description
Hot Match results appear alongside GTV flags with the same visual treatment. Both use the existing term flagging UI (yellow/amber highlights, underlines, suggestion badges).

### Pros
- Consistent, unified experience
- Less visual clutter
- Users don't need to learn a new indicator pattern
- Simpler implementation

### Cons
- Can't immediately distinguish Hot Match vs GTV recommendations
- May confuse users about which system generated which suggestion

### Visual Example (Code)
```tsx
// Both GTV and Hot Match use same styling
<span className="bg-amber-100 dark:bg-amber-900/20 border-b-2 border-amber-500 cursor-pointer">
  término
</span>
```

---

## Option 2: Visually Distinguished (Hot Match-specific styling)

### Description
Hot Match results use unique pink/magenta styling with a flame icon badge to differentiate them from GTV flags.

### Hot Match Specific Styling
- **Background**: `bg-pink-100 dark:bg-pink-900/20`
- **Border**: `border-b-2 border-pink-500`
- **Badge**: Pink flame icon with percentage
- **Hover**: Pink glow effect
- **Animation**: Subtle pulse or shimmer on initial detection

### GTV Styling (Unchanged)
- **Background**: `bg-amber-100 dark:bg-amber-900/20`
- **Border**: `border-b-2 border-amber-500`
- **Badge**: Warning triangle icon
- **Hover**: Amber glow effect

### Pros
- Clear visual distinction between recommendation types
- Reinforces Hot Match branding (pink/flame theme)
- Users can immediately identify the source of suggestions
- Enables separate interaction patterns (e.g., different tooltips)

### Cons
- More visual complexity
- Requires additional styling and components
- May feel busy if many terms are flagged

### Visual Example (Code)
```tsx
// Hot Match term
<span className="relative group">
  <span className="bg-gradient-to-r from-pink-100 to-pink-50 dark:from-pink-900/20 dark:to-pink-800/10 border-b-2 border-pink-500 cursor-pointer transition-all hover:shadow-pink-500/50 hover:shadow-lg">
    término
  </span>
  <span className="absolute -top-1 -right-1 bg-pink-600 text-white text-[10px] px-1 rounded-full flex items-center gap-0.5">
    <Flame className="h-2 w-2" />
    78%
  </span>
</span>

// GTV term (unchanged)
<span className="bg-amber-100 dark:bg-amber-900/20 border-b-2 border-amber-500 cursor-pointer">
  término
</span>
```

---

## Hybrid Option: Color-coded with Shared Pattern

### Description
Keep the same underline/highlight pattern but use color to distinguish:
- **Hot Match**: Pink underline + pink badge
- **GTV**: Amber underline + amber badge

### Visual Example (Code)
```tsx
// Hot Match
<span className="border-b-2 border-pink-500 bg-pink-50/50 dark:bg-pink-900/10">
  término
  <Badge className="ml-1 bg-pink-600 text-white">
    <Flame className="h-2 w-2 mr-0.5" />
    78%
  </Badge>
</span>

// GTV
<span className="border-b-2 border-amber-500 bg-amber-50/50 dark:bg-amber-900/10">
  término
  <Badge className="ml-1 bg-amber-600 text-white">
    <AlertTriangle className="h-2 w-2 mr-0.5" />
  </Badge>
</span>
```

---

## Recommendation

**Option 2 (Visually Distinguished)** or **Hybrid** are preferable for the following reasons:

1. **User Clarity**: Users can instantly tell which system made which recommendation
2. **Brand Reinforcement**: Pink/flame Hot Match branding creates memorable association
3. **Educational**: Helps users understand the difference between GTV (glossary-based) and Hot Match (crowd-sourced)
4. **Engagement**: The unique styling and percentage badges make Hot Match feel more dynamic and data-driven
5. **Future-proof**: Easier to add Hot Match-specific features (e.g., voting, feedback) if visually distinct

### Suggested Implementation
- Use pink gradient background with pink border for Hot Match terms
- Include flame icon + percentage badge on detected terms
- Add subtle pulse animation on first detection (1-2 seconds)
- Custom tooltip showing crowd-sourced alternatives with vote counts
- Distinct interaction: click GTV shows glossary entry, click Hot Match shows recommendation picker
