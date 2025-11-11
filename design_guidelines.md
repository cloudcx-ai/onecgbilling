# CloudCX Monitoring Solution - Design Guidelines

## Design Approach

**System Selected:** Carbon Design System (IBM)
**Justification:** This monitoring dashboard is information-dense, enterprise-focused, and requires clear data visualization. Carbon excels at technical applications with complex data displays, status indicators, and form-heavy interfaces.

## Core Design Elements

### Typography
- **Font Family:** IBM Plex Sans (primary), IBM Plex Mono (code/endpoints)
- **Scale:**
  - Page Headers: text-2xl (24px), font-semibold
  - Section Headers: text-lg (18px), font-medium
  - Body Text: text-sm (14px), font-normal
  - Data/Tables: text-sm (14px), font-normal
  - Labels: text-xs (12px), uppercase, tracking-wide, font-medium
  - Monospace Data (endpoints, IPs): font-mono, text-sm

### Layout System
**Spacing Primitives:** Use Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-4 or p-6
- Section gaps: gap-6 or gap-8
- Form field spacing: space-y-4
- Table cell padding: px-4 py-3
- Card/panel padding: p-6

**Grid Structure:**
- Main dashboard: Two-column layout on desktop (lg:grid-cols-2), single column on mobile
- Full-width data tables that scroll horizontally on mobile
- Sidebar navigation: 240px fixed width on desktop, collapsible hamburger on mobile

## Component Library

### Navigation
- **Top Bar:** Fixed header with logo, main navigation tabs, user/settings icon
- **Tabs:** Underline-style for section switching (Targets, Results, Logs)
- **Breadcrumbs:** For navigating between detail views

### Data Display
- **Tables:** 
  - Striped rows for readability (alternate row background)
  - Sticky headers on scroll
  - Sortable columns with arrow indicators
  - Hover state on rows
  - Action buttons in final column (Edit, Delete icons)
  
- **Status Pills:**
  - UP: Small rounded pill, subtle background
  - DOWN: Small rounded pill, alert background
  - PENDING: Subtle neutral background
  - Include icon prefix (checkmark, alert icon)

- **Metric Cards:**
  - Bordered cards with rounded corners (rounded-lg)
  - Large number display for key metrics (uptime %, response time)
  - Small label text above numbers
  - Sparkline graphs for trends (optional)

### Forms
- **Input Fields:**
  - Full-width within form containers
  - Clear labels above inputs
  - Helper text below for guidance
  - Error states with inline validation messages
  - Consistent height (h-10)

- **Form Layouts:**
  - Vertical stacking of fields with space-y-4
  - Group related fields with subtle dividers or headings
  - Action buttons right-aligned at bottom
  - Primary button + secondary/cancel button pattern

### Cards & Panels
- Bordered containers with rounded-lg
- Subtle shadow on hover for interactive cards
- Header section with title and optional action button
- Content padding of p-6
- Footer section for metadata or actions

### Buttons
- **Primary:** Solid fill, medium weight text
- **Secondary:** Outlined style
- **Danger:** For delete actions
- **Icon Buttons:** For table actions, minimal padding
- Consistent height (h-10) and padding (px-4)

### Real-time Updates
- **WebSocket Indicators:**
  - Small pulsing dot showing live connection status
  - Toast notifications for state changes (slide-in from top-right)
  - Auto-dismissing success/error messages

### Log Viewer
- **Monospace Display:** Full-width code block style
- **Filtering Controls:** Inline search, time range selector
- **Auto-scroll Toggle:** Checkbox to follow new logs
- **Line Numbers:** Optional left gutter
- **Syntax Highlighting:** For structured log formats (JSON)

## Dashboard-Specific Patterns

### Overview Dashboard
- Top row: Summary metrics (4 cards showing total targets, active checks, uptime %, avg response time)
- Middle section: Target status table (sortable, filterable)
- Bottom section: Recent alerts/events timeline

### Target Management
- Split view: List on left, details/form on right
- Quick actions in table rows (test now, edit, disable, delete)
- Expandable rows for detailed configuration

### Results Detail View
- Target header with current status
- Chart showing response time over last 24h/7d/30d
- Table of recent check results below chart
- Filters for status (all, UP, DOWN) and time range

### CloudWatch Logs Interface
- Log group selector (dropdown)
- Query input field with pattern examples
- Time range picker (last hour, 6h, 24h, custom)
- Results in scrollable monospace container
- Export/download button

## Accessibility & Polish
- All interactive elements keyboard accessible (tab navigation)
- Focus indicators visible on all form fields and buttons
- ARIA labels for icon-only buttons
- Consistent spacing maintains visual rhythm throughout
- Responsive breakpoints: mobile (base), tablet (md: 768px), desktop (lg: 1024px)

## Animation Principles
**Minimal & Purposeful:**
- Toast notifications: Slide-in transition (300ms ease-out)
- Status changes: Subtle fade transition between states
- Loading states: Simple spinner, no elaborate animations
- No page transitions or scroll-triggered effects

This design prioritizes clarity, efficiency, and data comprehension—essential for a monitoring tool where quick status assessment and troubleshooting are critical.