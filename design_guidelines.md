# OneCG Genesys Billing Report - Design Guidelines

## Design Approach

**Selected Approach:** Design System (Linear-inspired + Material Design principles)

**Justification:** This is a utility-focused, data-heavy dashboard application requiring efficiency, clarity, and professional presentation. The design will combine Linear's clean aesthetics with Material Design's robust component patterns for enterprise applications.

**Key Design Principles:**
1. Information clarity over decoration
2. Consistent, predictable interactions
3. Efficient data presentation
4. Professional, trustworthy appearance

## Core Design Elements

### A. Typography

**Font Family:**
- Primary: Inter (via Google Fonts CDN)
- Monospace: JetBrains Mono (for tokens, timestamps, technical data)

**Type Scale:**
- Page Headers: text-2xl font-semibold (Client name header)
- Section Titles: text-lg font-medium
- Form Labels: text-sm font-medium
- Body Text: text-base font-normal
- Helper Text: text-sm font-normal
- Data/Tables: text-sm font-normal
- Buttons: text-sm font-medium

### B. Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 or p-6
- Section spacing: space-y-6
- Form field gaps: space-y-4
- Button padding: px-4 py-2
- Card padding: p-6

**Grid System:**
- Dashboard layout: Fixed sidebar (w-64) + flexible main content (flex-1)
- Form layouts: Single column, max-w-md for inputs
- Report displays: Full width with responsive tables/cards

**Container Strategy:**
- Login page: Centered card (max-w-md mx-auto)
- Dashboard: Full viewport height with sidebar + main area
- Main content area: p-8 padding, max-w-6xl mx-auto for report content

### C. Component Library

**Authentication (Login Page):**
- Centered card layout on plain background
- Card: Rounded corners (rounded-lg), shadow (shadow-lg), p-8
- Logo/Title area at top: text-2xl font-bold, mb-6
- Input fields: Full width, h-10, px-4, rounded-md, border
- Submit button: Full width, h-10, rounded-md, font-medium
- Focus states: Prominent border or ring on all interactive elements

**Dashboard Layout:**
- Two-column layout: Sidebar (fixed, w-64) + Main content (flex-1)
- Sidebar: Full height, p-4, border-r
- Main content: Full height, p-8, overflow-y-auto

**Sidebar Components:**
- "Add Client" button: w-full, px-4 py-2, rounded-md, font-medium, mb-4
- Client list: space-y-2
- Client buttons: w-full, px-4 py-3, rounded-md, text-left, font-medium, hover states
- Active client indicator: Distinct visual treatment on selected client

**Add Client Modal/Form:**
- Modal overlay: Fixed, full viewport, backdrop blur
- Modal content: Centered card, max-w-md, p-6, rounded-lg, shadow-xl
- Form fields: space-y-4
- Input labels: text-sm font-medium, mb-1
- Text inputs: w-full, h-10, px-4, rounded-md, border
- Token input: Monospace font (font-mono)
- Action buttons: flex justify-end gap-2, mt-6
- Cancel button: px-4 py-2, rounded-md
- Submit button: px-4 py-2, rounded-md, font-medium

**Main Content Area:**
- Client header: mb-6
  - Client name: text-2xl font-semibold, mb-4
  - Date selector row: flex items-end gap-4, flex-wrap
  - Dropdown labels: text-sm font-medium, mb-1
  - Dropdowns: min-w-[200px], h-10, px-4, rounded-md, border
  - Submit button: h-10, px-6, rounded-md, font-medium

**Report Display:**
- Report container: mt-8, space-y-6
- Section headers: text-lg font-medium, mb-4, pb-2, border-b
- Data presentation options:
  1. **Card Grid** (for summary metrics):
     - grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4
     - Card: p-6, rounded-lg, border
     - Label: text-sm font-medium
     - Value: text-2xl font-semibold, mt-1
  2. **Data Table** (for detailed line items):
     - Full width, rounded-lg, border, overflow-hidden
     - Header: font-medium, text-sm, px-6 py-3, border-b
     - Rows: px-6 py-4, border-b, hover states
     - Alternating row treatment for readability
  3. **Key-Value Pairs** (for subscription details):
     - space-y-3
     - Each pair: flex justify-between, py-2
     - Key: text-sm font-medium
     - Value: text-sm, font-mono for technical data

**Icons:**
- Use Heroicons (via CDN)
- Icon sizes: h-5 w-5 for inline, h-6 w-6 for buttons
- Add Client icon: Plus icon
- Client list icons: Building/Office icon
- Calendar icons for date selectors
- Loading spinner for API calls

**Loading States:**
- Spinner: Centered, h-8 w-8, animated spin
- Skeleton loaders for report data: animate-pulse, h-4, rounded, mb-2
- Loading overlay for API calls: Fixed, full viewport, backdrop blur, centered spinner

**Empty States:**
- No clients: Centered message in main area
  - Icon: h-12 w-12, mb-4
  - Message: text-lg font-medium, mb-2
  - Sub-message: text-sm, mb-4
  - CTA: "Add your first client" button
- No report data: Centered in report area with icon and message

**Error States:**
- Error alerts: p-4, rounded-md, border-l-4, mb-4
- Error icon: h-5 w-5, inline with message
- Error message: text-sm font-medium
- Retry button: text-sm, underline, mt-2

### D. Animations

**Minimal, purposeful animations only:**
- Modal fade-in: transition-opacity duration-200
- Button hover: transition-colors duration-150
- Loading spinner: animate-spin
- Sidebar client selection: transition-colors duration-150
- No page transitions, no scroll animations, no decorative effects

## Accessibility Guidelines

- All form inputs have visible labels with proper for/id associations
- Focus states are clearly visible with ring utilities
- Dropdown menus are keyboard navigable
- Loading states announced with aria-live regions
- Error messages associated with form fields via aria-describedby
- Sufficient contrast ratios maintained throughout
- Interactive elements have minimum 44x44px touch targets

## Images

**No images required** - This is a data-focused dashboard application. All visual elements are UI components, icons, and data displays. No hero section, no decorative imagery needed.