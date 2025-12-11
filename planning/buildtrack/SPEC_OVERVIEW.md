# BuildTrack Specification Overview

**Version:** 1.0
**Last Updated:** December 2024

---

## Executive Summary

BuildTrack is a construction training platform designed to capture, organize, and deliver field-first training for construction companies. This document outlines the phased development approach for building a fully functional demo in 6-8 weeks.

### Core Philosophy

**"Most construction training apps are built like school. We built one that feels like it belongs on a job site."**

---

## Phase Structure

The development is organized into **5 phases** that build sequentially, with each phase establishing the foundation for the next:

```
Phase 0: Environment Setup
    ↓
Phase 1: Foundation (Core Infrastructure)
    ↓
Phase 2: Core Features (Employee Experience)
    ↓
Phase 3: Advanced Features (Admin & Workflows)
    ↓
Phase 4: Polish & Demo (Production Ready)
```

### Phase Dependencies

| Phase | Depends On | Enables |
|-------|------------|---------|
| Phase 0 | None | All development work |
| Phase 1 | Phase 0 | Phases 2, 3, 4 |
| Phase 2 | Phase 1 | Phase 3 (supervisors need employee flows to approve) |
| Phase 3 | Phase 1, 2 | Phase 4 |
| Phase 4 | All phases | Demo readiness |

---

## Phase Summary

### Phase 0: Environment Setup
**Goal:** Establish all development infrastructure before writing application code.

- Cloud infrastructure provisioning
- CI/CD pipeline setup
- Development environment configuration
- Database and storage setup
- Authentication provider configuration

**Deliverable:** Fully configured environments (dev, staging, prod) ready for application deployment.

📄 [Full Specification](./phases/PHASE_0_ENVIRONMENT.md)

---

### Phase 1: Foundation
**Goal:** Build core infrastructure and multi-tenant architecture.

- NestJS backend with PostgreSQL + Prisma
- Multi-tenant middleware (company isolation)
- Authentication (email/password + magic links)
- React + Vite web skeleton
- React Native (Expo) mobile skeleton
- Company model + setup wizard
- File upload system (S3 + signed URLs)
- Dynamic theming (CSS variables from company colors)

**Deliverable:** Basic working app with company registration, branding, and authentication.

📄 [Full Specification](./phases/PHASE_1_FOUNDATION.md)

---

### Phase 2: Core Features
**Goal:** Complete the employee-facing training experience.

- Core entities: JobRole, Category, TrainingTrack, Module, ContentBlock
- Onboarding tracks view (mobile)
- Module renderer (video, checklist, quiz)
- Progress tracking
- Employee video upload flow
- Pre-seed script for demo company

**Deliverable:** Employees can log in, view assigned training, complete modules, and upload field videos.

📄 [Full Specification](./phases/PHASE_2_CORE_FEATURES.md)

---

### Phase 3: Advanced Features
**Goal:** Build supervisor/admin workflows and QR code system.

- QR code generation (client-side)
- Deep linking (/qr/{code} → module after login)
- Video transcoding (AWS Lambda + ffmpeg or Cloudflare Stream)
- Admin review queue for video uploads
- One-click "Create Module from Upload"
- Supervisor dashboard (pending approvals, overdue training, expiring certs)
- Certification tracking with expiry warnings

**Deliverable:** Full admin workflow—review uploads, create modules, track compliance.

📄 [Full Specification](./phases/PHASE_3_ADVANCED_FEATURES.md)

---

### Phase 4: Polish & Demo
**Goal:** Prepare for investor/customer demos.

- Add all pre-seeded demo content (12-15 modules, 4 SOPs)
- Bug fixes and performance optimization
- Demo script rehearsal
- Record demo video
- Print QR codes for live demo
- Final UX polish

**Deliverable:** Demo-ready application with compelling 7-9 minute walkthrough.

📄 [Full Specification](./phases/PHASE_4_POLISH_DEMO.md)

---

## Tech Stack

### Backend
- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS
- **ORM:** Prisma
- **Database:** PostgreSQL 15
- **Auth:** SuperTokens or Clerk (magic links)

### Frontend Web
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **State Management:** TanStack Query
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui + Radix UI

### Mobile
- **Framework:** Expo (React Native)
- **Navigation:** Expo Router
- **Camera/QR:** Expo Camera + expo-barcode-scanner

### Infrastructure
- **Storage:** AWS S3 + CloudFront (or BunnyCDN)
- **Video:** Cloudflare Stream or AWS Lambda + ffmpeg
- **Web Hosting:** Vercel
- **Mobile Builds:** Expo EAS
- **Database Hosting:** Railway, Supabase, or AWS RDS

### Development Tools
- **Monorepo:** Turborepo (optional)
- **Testing:** Vitest (unit), Playwright (E2E)
- **Linting:** ESLint + Prettier
- **Git Hooks:** Husky + lint-staged

---

## Demo Scope

### In Demo (MVP)

| Feature | Notes |
|---------|-------|
| Multi-tenant (multiple companies) | Critical for realism |
| Company branding (logo + colors) | Instant "this is ours" feeling |
| Owner setup wizard | First-run experience is key |
| 4 roles (Owner, Admin, Supervisor, Employee) | Simplified permissions |
| Job Roles + Onboarding Tracks | 3-4 realistic tracks |
| Nested Categories (Shop / Field) | Tree view + tiles |
| Training Library with search | Global search included |
| Modules with mixed content | 10-15 pre-seeded modules |
| Employee video upload + admin review | **THE KILLER DEMO FLOW** |
| QR code → instant module on phone | Print 3 real QR codes |
| Supervisor "Pending Approvals" dashboard | Shows real workflow |
| Certifications + expiry warnings | 2-3 examples |
| SOP viewer (simple) | 3-4 real SOPs |

### Out of Demo (Phase 2+)

| Feature | Why Deferred |
|---------|--------------|
| In-module comments | Nice to have, not demo-critical |
| Versioning & re-training | Adds complexity |
| AI features | Phase 2 |
| Offline mode | Significant effort |
| Field Checklists as separate entities | Use normal checklist modules |

---

## Demo Script (7-9 minutes)

| Time | Scene | Action |
|------|-------|--------|
| 0:00-0:45 | Intro | "Most construction training apps are built like school..." |
| 0:45-1:30 | Owner Setup | 90-second wizard: logo, values, roles, categories |
| 1:30-2:30 | Employee Mobile | New hire sees onboarding, scans QR, completes module |
| 2:30-3:30 | Field Video | Employee records 15-sec tip from field, submits |
| 3:30-5:00 | Admin Review | Owner reviews upload, creates module in seconds |
| 5:00-5:45 | Live Update | Another employee sees new module appear |
| 5:45-6:30 | Dashboard | Supervisor view: pending approvals, overdue, expiring |
| 6:30-7:00 | Certifications | Digital wallet of certs + badges |
| 7:00-7:30 | Close | "This is live today. Who wants to pilot?" |

---

## Success Metrics

### Technical

- First contentful paint < 1.5s
- Time to interactive < 3s
- Video upload success rate > 95%
- Zero critical bugs in demo flow

### Demo

- Complete demo in < 9 minutes
- Audience understands value prop within 2 minutes
- "Can I try this?" question asked
- QR code scan works first time, every time

---

## Document Index

| Document | Description |
|----------|-------------|
| [BRAND_IDENTITY_GUIDE.md](./BRAND_IDENTITY_GUIDE.md) | Visual identity, colors, typography, voice |
| [SPEC_OVERVIEW.md](./SPEC_OVERVIEW.md) | This document—high-level plan |
| [phases/PHASE_0_ENVIRONMENT.md](./phases/PHASE_0_ENVIRONMENT.md) | Infrastructure setup |
| [phases/PHASE_1_FOUNDATION.md](./phases/PHASE_1_FOUNDATION.md) | Core architecture |
| [phases/PHASE_2_CORE_FEATURES.md](./phases/PHASE_2_CORE_FEATURES.md) | Employee experience |
| [phases/PHASE_3_ADVANCED_FEATURES.md](./phases/PHASE_3_ADVANCED_FEATURES.md) | Admin workflows |
| [phases/PHASE_4_POLISH_DEMO.md](./phases/PHASE_4_POLISH_DEMO.md) | Demo preparation |

---

## Getting Started

1. Review this overview to understand the full scope
2. Read the [Brand Identity Guide](./BRAND_IDENTITY_GUIDE.md) for visual direction
3. Begin with [Phase 0](./phases/PHASE_0_ENVIRONMENT.md) to set up environments
4. Progress through each phase sequentially
5. Test demo flow after each phase completes

---

*This is a planning document. Implementation details may evolve as development progresses.*
