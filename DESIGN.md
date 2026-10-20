# Design Direction — ProjectDesk

## 1. Identity & Mood
- **Style**: Crafted Studio Aesthetic
- **Character**: Modern, authoritative yet warm, bespoke studio craftsmanship. Designed for high-trust collaboration between independent professionals/agencies and their clients.
- **Dials**: ENERGY 2 / RHYTHM 2 / MOTION 2
- **Anti-Pattern Guard**:
  - No generic blue-purple AI gradients, no neon glows, no dark-mode-only gimmick.
  - No bloated bento templates or copy-paste cards without hierarchy.
  - Every surface and element serves a clear purpose with high tactile refinement.

## 2. Color System (OKLCH)
- **Neutral Surface (Light)**:
  - Background: Crisp Warm Porcelain (`oklch(0.988 0.003 75)`)
  - Elevated Card: Pure Linen (`oklch(1 0 0)`)
  - Border: Soft Studio Slate (`oklch(0.915 0.006 85)`)
  - Foreground: Deep Charcoal Slate (`oklch(0.18 0.02 260)`)
  - Muted Text: Balanced Graphite (`oklch(0.50 0.015 260)`)
- **Neutral Surface (Dark)**:
  - Background: Deep Ink Slate (`oklch(0.125 0.018 260)`)
  - Elevated Card: Layered Obsidian (`oklch(0.17 0.02 260)`)
  - Border: Subdued Slate Border (`oklch(0.24 0.016 260)`)
  - Foreground: Crisp Ivory Snow (`oklch(0.965 0.005 85)`)
  - Muted Text: Soft Pearl Slate (`oklch(0.68 0.015 260)`)
- **Primary Brand Accent**:
  - Warm Amber / Antique Brass (`oklch(0.62 0.16 65)` in light, `oklch(0.76 0.15 65)` in dark)
  - Purpose: Signals key actions (new project, submit, active tab indicator, primary focus) with warmth and prestige without visual fatigue.
- **Functional Semantics**:
  - Success / Paid: Rich Studio Emerald (`oklch(0.62 0.16 152)`)
  - Warning / Pending: Warm Golden Marigold (`oklch(0.68 0.15 75)`)
  - Danger / Overdue: Refined Crimson (`oklch(0.58 0.19 25)`)
  - Info / Secondary: Architectural Slate Blue (`oklch(0.58 0.12 240)`)

## 3. Typography
- **Heading & Display**: `Plus_Jakarta_Sans` — modern geometry, balanced human curves, tight tracking for headlines.
- **Body & Controls**: `Inter` — industry standard readability at small sizes.
- **Tabular & Financial Data**: `Geist_Mono` / `tabular-nums` for currency, invoice codes, dates, and percentages.

## 4. Hierarchy & Spatial Rhythm
- **Touch Targets**: Minimum 44×44 px for mobile ergonomics.
- **Mobile First Navigation**:
  - Sleek top header with contextual info + theme toggle.
  - Floating/bottom dock tab navigation with tactile pill indicators, respecting `safe-area-inset-bottom`.
- **Desktop Sidebar**:
  - Fixed studio workspace panel with logo monogram, quick project launcher, and user profile drawer.
- **Sub-Navigation (ProjectNav & PortalNav)**:
  - Segmented tactile pills with smooth horizontal overflow masking on mobile.
- **Cards & Data**:
  - Consistent padding, subtle border highlights, clean typography hierarchy instead of repetitive box layouts.
