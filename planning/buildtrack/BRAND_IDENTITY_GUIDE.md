# BuildTrack Brand Identity Guide

**Version:** 1.0
**Last Updated:** December 2024

---

## Table of Contents

1. [Brand Overview](#brand-overview)
2. [Brand Values](#brand-values)
3. [Visual Identity](#visual-identity)
4. [Typography](#typography)
5. [Color Palette](#color-palette)
6. [Logo Guidelines](#logo-guidelines)
7. [Voice & Tone](#voice--tone)
8. [UI/UX Principles](#uiux-principles)
9. [Demo Company Branding](#demo-company-branding)

---

## Brand Overview

### Mission Statement

BuildTrack empowers construction companies to build skilled, safe, and confident teams through field-first training that meets workers where they are—on the job site.

### Brand Positioning

**Not like school. Built for the job site.**

BuildTrack is the training platform that construction company owners and field workers actually want to use. While traditional LMS solutions feel academic and disconnected from real work, BuildTrack captures tribal knowledge directly from the field and turns it into shareable, trackable training.

### Target Audience

- **Primary:** Construction company owners (5-200 employees)
- **Secondary:** Site supervisors and foremen
- **End Users:** Field workers, shop technicians, new hires

### Unique Value Proposition

"Turn your best worker's 15-second tip into company-wide training in 60 seconds."

---

## Brand Values

### 1. Field-First
Everything we build must work with gloves on, in bright sunlight, with spotty wifi. If it doesn't work on a job site, it doesn't ship.

### 2. Respect the Craft
Construction workers are skilled professionals. Our platform treats them that way—no condescending tutorials, no unnecessary corporate speak.

### 3. Capture Tribal Knowledge
The best training already exists in the heads of your experienced workers. We help extract and preserve it.

### 4. Safety Without Lecture
Safety training that workers actually retain because it comes from peers they respect, not PowerPoints they endure.

### 5. Simple > Clever
A feature that 100% of users understand beats a feature that 10% of users love.

---

## Visual Identity

### Design Philosophy

**Industrial Clarity**—Clean, bold, and functional. Like a well-organized tool crib or a perfectly marked job site. No unnecessary decoration. Every element serves a purpose.

### Visual Principles

1. **High Contrast:** Readable in full sun, works with safety glasses
2. **Bold Typography:** Large, clear text visible at arm's length
3. **Chunky Touch Targets:** 48px minimum for mobile (gloves!)
4. **Progress = Momentum:** Visual progress indicators that feel satisfying
5. **Minimal Animation:** Performance over polish on older devices

---

## Typography

### Primary Typeface: Inter

**Why Inter:** Open source, highly legible, excellent screen rendering at all sizes, strong support for mobile interfaces.

```css
/* Font Stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Type Scale

| Use Case | Size | Weight | Line Height |
|----------|------|--------|-------------|
| Page Title | 32px / 2rem | 700 (Bold) | 1.2 |
| Section Header | 24px / 1.5rem | 600 (Semi) | 1.3 |
| Card Title | 20px / 1.25rem | 600 (Semi) | 1.4 |
| Body | 16px / 1rem | 400 (Regular) | 1.5 |
| Body Large (Mobile) | 18px / 1.125rem | 400 (Regular) | 1.5 |
| Caption | 14px / 0.875rem | 400 (Regular) | 1.4 |
| Label | 12px / 0.75rem | 500 (Medium) | 1.3 |

### Mobile Considerations

- Minimum body text: 16px (prevents iOS zoom on input focus)
- Increase touch target labels to 14px minimum
- Use Bold weight more liberally for outdoor readability

---

## Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **BuildTrack Blue** | `#1E3A5F` | 30, 58, 95 | Primary brand, headers, CTAs |
| **Safety Orange** | `#FF6B35` | 255, 107, 53 | Accents, alerts, progress |
| **Concrete Gray** | `#4A5568` | 74, 85, 104 | Body text, secondary elements |

### Supporting Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Steel Blue** | `#2D4A6E` | 45, 74, 110 | Interactive states, links |
| **Bright White** | `#FFFFFF` | 255, 255, 255 | Backgrounds, cards |
| **Off-White** | `#F7F9FC` | 247, 249, 252 | Page backgrounds |
| **Light Gray** | `#E2E8F0` | 226, 232, 240 | Borders, dividers |

### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Success Green** | `#10B981` | Completed, passed, approved |
| **Warning Amber** | `#F59E0B` | Attention, expiring soon |
| **Error Red** | `#EF4444` | Failed, overdue, critical |
| **Info Blue** | `#3B82F6` | Information, tips |

### High Contrast Mode

For outdoor/high-sun visibility:

| Element | Light Theme | High Contrast |
|---------|-------------|---------------|
| Primary Text | `#4A5568` | `#1A202C` |
| Background | `#F7F9FC` | `#FFFFFF` |
| Borders | `#E2E8F0` | `#A0AEC0` |
| Primary Button | `#1E3A5F` | `#0D2137` |

---

## Logo Guidelines

### Logo Concept

The BuildTrack logo combines:
- **Hard Hat Silhouette:** Safety and construction
- **Progress Bar:** Learning and advancement
- **Clean Typography:** Professional and modern

### Logo Variations

1. **Full Logo:** Hard hat icon + "BuildTrack" wordmark
2. **Compact Logo:** Hard hat icon + "BT" letters
3. **Icon Only:** Hard hat with integrated progress bar
4. **Wordmark Only:** "BuildTrack" text for tight spaces

### Clear Space

Minimum clear space = height of the "B" in BuildTrack on all sides

### Minimum Size

- Full Logo: 120px width minimum
- Icon Only: 32px minimum

### Logo Don'ts

- Don't stretch or distort
- Don't apply effects (drop shadows, gradients, etc.)
- Don't place on busy backgrounds without contrast
- Don't modify the colors outside approved palette

---

## Voice & Tone

### Brand Voice Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| **Direct** | Say it plainly, no jargon | "Record. Upload. Done." not "Leverage our intuitive content capture workflow" |
| **Respectful** | Workers are skilled pros | "Master the table saw" not "Learn basic saw operations" |
| **Confident** | We know our stuff | "Your team will be certified by Friday" not "We hope this helps" |
| **Practical** | Focus on outcomes | "3 workers certified this week" not "Enhanced learning metrics" |

### Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| Onboarding | Encouraging, clear | "Welcome to Apex. Let's get you up to speed." |
| Progress | Celebratory, motivating | "Nice work! 2 modules to go." |
| Reminders | Friendly, direct | "Hey Mike—3 days left on your OSHA refresh." |
| Errors | Calm, helpful | "Video upload paused. Check your connection and try again." |
| Compliance | Professional, serious | "OSHA certification expires in 14 days. Complete refresher training." |

### Word List

| Use | Avoid |
|-----|-------|
| Training | Courseware, e-learning |
| Module | Course, lesson |
| Worker, team member | Resource, headcount |
| Supervisor | Manager (unless title) |
| Progress | Performance metrics |
| Approve | Validate |
| Record | Capture content |
| Job site, field | Work environment |

---

## UI/UX Principles

### 1. Gloves-On Design

- Touch targets minimum 48px x 48px
- Important actions on thumb-accessible areas
- No hover-dependent interactions on mobile
- Spacing generous enough for imprecise taps

### 2. Progressive Disclosure

- Show essential info first
- Details on demand (expand, tap-through)
- Never overwhelm with options
- One primary action per screen

### 3. Offline-Aware (Phase 2)

- Always show last-known state
- Clear indicators when offline
- Queue actions for later sync
- Never lose user progress

### 4. Accessibility First

- WCAG 2.1 AA compliance minimum
- High contrast color combinations (4.5:1 ratio)
- Screen reader compatible
- Keyboard navigable (web)

### 5. Speed = Trust

- Target: First contentful paint < 1.5s
- Images lazy-loaded and optimized
- Skeleton loading states
- Optimistic UI updates

---

## Demo Company Branding

### Apex Custom Cabinets

For the demo/pilot, we pre-seed data for a fictional cabinetry company:

#### Company Profile

| Attribute | Value |
|-----------|-------|
| Name | Apex Custom Cabinets |
| Industry | Custom Cabinetry & Millwork |
| Size | 25-40 employees |
| Split | 60% shop, 40% field |

#### Brand Colors

| Name | Hex | Usage |
|------|-----|-------|
| **Wood Primary** | `#8B5A2B` | Primary brand, headers |
| **Dark Gray** | `#374151` | Text, secondary elements |
| **Sawdust Cream** | `#FEF3C7` | Accent, highlights |
| **Shop Green** | `#059669` | Shop-related items |
| **Field Blue** | `#2563EB` | Field-related items |

#### Core Values (displayed in app)

1. **Safety First** — Go home the same way you came in
2. **Measure Twice** — Precision is pride
3. **Clean as You Go** — A clean shop is a safe shop
4. **Pride in Craftsmanship** — Sign your work with quality

#### Visual Elements

- Logo: Stylized cabinet with "A" formed by two cabinet doors
- Imagery: Real woodworking, clean shop environments
- Icons: Tools, safety equipment, quality marks

---

## Implementation Notes

### CSS Custom Properties

```css
:root {
  /* BuildTrack Platform */
  --color-primary: #1E3A5F;
  --color-accent: #FF6B35;
  --color-text: #4A5568;
  --color-bg: #F7F9FC;
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;

  /* Typography */
  --font-family: 'Inter', -apple-system, sans-serif;
  --font-size-base: 16px;
  --line-height-base: 1.5;

  /* Spacing */
  --space-unit: 8px;
  --touch-target-min: 48px;

  /* Borders */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
}

/* Company Theming Override (runtime) */
.company-theme {
  --company-primary: var(--company-primary-color, #1E3A5F);
  --company-secondary: var(--company-secondary-color, #4A5568);
}
```

### Multi-Tenant Theming

Each company can customize:
- Primary color (logo, headers, buttons)
- Secondary color (text, accents)
- Logo image (SVG preferred, PNG fallback)
- Company name display

Platform elements (navigation, system UI) maintain BuildTrack branding while content areas adapt to company theming.

---

## Appendix: Asset Checklist

### Required for Launch

- [ ] BuildTrack logo (all variants, SVG + PNG)
- [ ] Icon set (consistent style, 24px base)
- [ ] Loading spinner animation
- [ ] Empty state illustrations
- [ ] Error state illustrations
- [ ] Favicon and app icons (iOS + Android)

### Demo Assets

- [ ] Apex Custom Cabinets logo
- [ ] Sample training thumbnails
- [ ] Sample user avatars
- [ ] QR code template
- [ ] Print-ready QR sheet

---

*This guide is a living document. Update as the brand evolves.*
