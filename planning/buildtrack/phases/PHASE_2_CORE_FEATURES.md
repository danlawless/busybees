# Phase 2: Core Features

**Objective:** Build the complete employee-facing training experience.

**Prerequisites:** Phase 1 (Foundation)
**Enables:** Phase 3 (Admin Workflows)

---

## Overview

Phase 2 delivers the core training experience that employees interact with daily:

- Browse training library by categories
- View and complete assigned onboarding tracks
- Watch videos, complete checklists, take quizzes
- Track progress across modules
- Upload field videos for review

After Phase 2, employees can log in, see their assigned training, complete modules, and submit field videos.

---

## Deliverables

- [ ] Training library with nested categories
- [ ] Module viewer (video, text, checklist, quiz)
- [ ] Onboarding tracks with progress tracking
- [ ] Employee video upload flow
- [ ] Search functionality
- [ ] Pre-seed script for demo company data

---

## Tasks

### 2.1 Training Library

**Goal:** Browsable, searchable library of training modules.

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /categories | List root categories |
| GET | /categories/:id | Get category with children & modules |
| GET | /categories/:id/tree | Get full category tree |
| GET | /modules | List modules (paginated, filterable) |
| GET | /modules/:id | Get module with content blocks |
| GET | /modules/search | Search modules by title/description |

#### Category Tree View

```typescript
// Response structure
interface CategoryTree {
  id: string;
  name: string;
  iconName: string | null;
  moduleCount: number;
  children: CategoryTree[];
}

// Example: Apex Custom Cabinets
[
  {
    id: "shop",
    name: "Shop",
    iconName: "warehouse",
    moduleCount: 0,
    children: [
      {
        id: "power-tools",
        name: "Power Tools",
        iconName: "saw",
        moduleCount: 3,
        children: [
          { id: "table-saw", name: "Table Saw", moduleCount: 2 },
          { id: "miter-saw", name: "Miter Saw", moduleCount: 1 },
          { id: "track-saw", name: "Track Saw", moduleCount: 1 },
        ]
      },
      { id: "dust-collection", name: "Dust Collection", moduleCount: 2 },
      { id: "finishing-room", name: "Finishing Room", moduleCount: 1 },
    ]
  },
  {
    id: "field",
    name: "Field",
    iconName: "hard-hat",
    moduleCount: 0,
    children: [
      { id: "framing", name: "Framing", moduleCount: 2 },
      { id: "cabinet-install", name: "Cabinet Install", moduleCount: 3 },
      { id: "punch-list", name: "Punch List & QC", moduleCount: 2 },
    ]
  },
  { id: "safety", name: "Safety", iconName: "shield", moduleCount: 4 },
  { id: "general", name: "General", iconName: "book", moduleCount: 2 },
]
```

#### UI Components

**Web - Library Page:**
```
┌─────────────────────────────────────────────────┐
│  Training Library                    [🔍 Search] │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│  │   🏭    │  │   🏗️    │  │   🛡️    │        │
│  │  Shop   │  │  Field  │  │ Safety  │        │
│  │ 8 items │  │ 7 items │  │ 4 items │        │
│  └─────────┘  └─────────┘  └─────────┘        │
│                                                 │
│  ┌─────────┐                                   │
│  │   📖    │                                   │
│  │ General │                                   │
│  │ 2 items │                                   │
│  └─────────┘                                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Mobile - Tile Navigation:**
- Large touch targets (full-width cards)
- Breadcrumb trail for navigation
- Pull-to-refresh
- Offline indicator when cached

#### Search Implementation

```typescript
// modules/search endpoint
interface SearchParams {
  q: string;          // Search query
  categoryId?: string; // Filter by category
  limit?: number;      // Default 20
  offset?: number;     // Pagination
}

interface SearchResult {
  modules: Module[];
  total: number;
  query: string;
}

// Search indexes title and description
// Future: full-text search with pg_trgm
```

#### Acceptance Criteria

- [ ] Categories display in tree structure
- [ ] Clicking category shows children or modules
- [ ] Modules show thumbnail, title, duration
- [ ] Search returns relevant results
- [ ] Empty states show helpful messages
- [ ] Works on both web and mobile

---

### 2.2 Module Viewer

**Goal:** Render modules with mixed content types.

#### Content Block Types

**VIDEO:**
```typescript
interface VideoBlock {
  type: 'VIDEO';
  content: {
    url: string;
    thumbnailUrl?: string;
    duration?: number;  // seconds
    transcript?: string;
  };
}
```

**TEXT:**
```typescript
interface TextBlock {
  type: 'TEXT';
  content: {
    markdown: string;  // Supports basic markdown
  };
}
```

**CHECKLIST:**
```typescript
interface ChecklistBlock {
  type: 'CHECKLIST';
  content: {
    title?: string;
    items: {
      id: string;
      text: string;
      required: boolean;
    }[];
    requireAll: boolean;  // Must check all to complete
  };
}
```

**QUIZ:**
```typescript
interface QuizBlock {
  type: 'QUIZ';
  content: {
    title?: string;
    passingScore: number;  // Percentage (0-100)
    questions: {
      id: string;
      question: string;
      type: 'single' | 'multiple';
      options: {
        id: string;
        text: string;
        isCorrect: boolean;
      }[];
    }[];
  };
}
```

**IMAGE:**
```typescript
interface ImageBlock {
  type: 'IMAGE';
  content: {
    url: string;
    alt: string;
    caption?: string;
  };
}
```

#### Module Viewer Flow

```
┌─────────────────────────────────────────────────┐
│  ← Back          Table Saw Safety        ⋮     │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │            [Video Player]               │   │
│  │                                         │   │
│  │      advancement prevents skipping      │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ## Safety Checklist                           │
│  ☐ Blade guard is in place                     │
│  ☐ Push stick within reach                     │
│  ☐ Safety glasses on                           │
│  ☐ Dust collection running                     │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ## Knowledge Check                            │
│  What should you check FIRST?                  │
│  ○ Blade sharpness                             │
│  ○ Blade guard position  ← correct             │
│  ○ Wood moisture                               │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│        [ Complete Module ✓ ]                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Progress Tracking

```typescript
// API endpoint
POST /modules/:id/progress
{
  action: 'start' | 'update' | 'complete';
  data?: {
    checklistState?: Record<string, boolean>;
    quizAnswers?: Record<string, string[]>;
    timeSpentSec?: number;
  };
}

// Response
{
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  score?: number;
  completedAt?: string;
}
```

#### Completion Requirements

1. **Video:** Must watch to end (or 90% with configurable skip)
2. **Checklist:** All required items checked
3. **Quiz:** Score >= passing score
4. **Text/Image:** Scrolled to bottom or time on screen

#### Acceptance Criteria

- [ ] Video plays and tracks watch progress
- [ ] Checklist items persist state
- [ ] Quiz scores correctly and shows results
- [ ] Module cannot be completed without requirements
- [ ] Progress syncs to server
- [ ] Works offline with sync on reconnect (basic)

---

### 2.3 Onboarding Tracks

**Goal:** Guided training paths for new employees.

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /tracks | List all tracks |
| GET | /tracks/:id | Get track with modules |
| GET | /me/tracks | Get user's enrolled tracks |
| POST | /me/tracks/:id/enroll | Enroll in track |
| GET | /me/tracks/:id/progress | Get track progress |

#### Track View (Mobile Home)

```
┌─────────────────────────────────────────────────┐
│  Welcome, John! 👋                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  YOUR ONBOARDING                                │
│  ┌─────────────────────────────────────────┐   │
│  │  New Hire - Shop                        │   │
│  │  ████████████░░░░░░░░░  60%            │   │
│  │  6 of 10 modules · Due Dec 24          │   │
│  │                                         │   │
│  │  ▶ NEXT: Dust Collection Basics        │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  REQUIRED TRAINING                              │
│  ┌─────────────────────────────────────────┐   │
│  │  ⚠️ Annual OSHA Refresh                 │   │
│  │     Due in 5 days                       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  QUICK ACTIONS                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ 📹 Upload│  │ 📚 Browse│  │ 🔍 Scan  │     │
│  │  Video   │  │ Library  │  │   QR     │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Track Detail View

```
┌─────────────────────────────────────────────────┐
│  ← Back     New Hire - Shop                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ████████████░░░░░░░░░  60%                    │
│  6 of 10 complete · Est. 45 min remaining      │
│                                                 │
│  ─────────────────────────────────────────────  │
│                                                 │
│  ✅ 1. Welcome to Apex                         │
│  ✅ 2. Shop Safety Overview                    │
│  ✅ 3. Tool Crib & Checkout                    │
│  ✅ 4. Table Saw Safety                        │
│  ✅ 5. Miter Saw Basics                        │
│  ✅ 6. Track Saw Operation                     │
│  ▶  7. Dust Collection Basics     ← current   │
│  ○  8. Finishing Room Protocols                │
│  ○  9. End of Day Cleanup                      │
│  ○ 10. Quality Standards                       │
│                                                 │
│        [ Continue Training → ]                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Progress Calculation

```typescript
interface TrackProgress {
  trackId: string;
  trackName: string;
  enrolledAt: string;
  dueDate: string | null;
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
  modules: {
    total: number;
    completed: number;
    inProgress: number;
  };
  percentComplete: number;
  estimatedMinutesRemaining: number;
  currentModule: {
    id: string;
    title: string;
  } | null;
}
```

#### Acceptance Criteria

- [ ] User sees enrolled tracks on home screen
- [ ] Track shows linear progress through modules
- [ ] Completed modules show checkmark
- [ ] "Continue" goes to next incomplete module
- [ ] Due date warnings display for overdue tracks
- [ ] Completing all modules marks track complete

---

### 2.4 Employee Video Upload

**Goal:** Field workers can record and submit training videos.

#### Upload Flow

```
1. Tap "Upload Video" from home screen
2. Choose: Record new OR Select from gallery
3. Add details:
   - Title (required)
   - Description (optional)
   - Suggested category (optional dropdown)
4. Review video preview
5. Submit
6. Show success: "Thanks! Your video is under review"
```

#### Mobile UI Flow

```
┌─────────────────────────────────────────────────┐
│  ← Cancel      Upload Video                    │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │                                         │   │
│  │        [Video Preview Thumbnail]        │   │
│  │                                         │   │
│  │           0:47 duration                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Title *                                       │
│  ┌─────────────────────────────────────────┐   │
│  │ How to scribe cabinets to uneven wall   │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Description                                   │
│  ┌─────────────────────────────────────────┐   │
│  │ Quick tip for getting a perfect fit...  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  Category                                      │
│  ┌─────────────────────────────────────────┐   │
│  │ Field > Cabinet Install              ▼  │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│        [ Submit for Review ]                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /uploads | Create new video upload |
| GET | /me/uploads | List user's uploads |
| GET | /uploads/:id | Get upload status |
| DELETE | /uploads/:id | Cancel pending upload |

#### Upload Process

```typescript
// 1. Get presigned upload URL (for larger files)
POST /uploads/init
{ filename: "video.mp4", contentType: "video/mp4", size: 12345678 }
→ { uploadId: "...", uploadUrl: "/uploads/videos/..." }

// 2. Upload file directly
PUT {uploadUrl}
[binary data]

// 3. Complete upload with metadata
POST /uploads
{
  uploadId: "...",
  title: "How to scribe cabinets",
  description: "Quick tip...",
  categoryId: "cabinet-install"
}
→ { id: "...", status: "PENDING" }
```

#### Video Processing (Local)

For local development, minimal processing:

```typescript
// No transcoding in Phase 2 - direct file serve
// Thumbnail generation with ffmpeg (if available)

async function generateThumbnail(videoPath: string): Promise<string> {
  const thumbnailPath = videoPath.replace(/\.\w+$/, '_thumb.jpg');

  // ffmpeg -i video.mp4 -ss 00:00:01 -vframes 1 thumbnail.jpg
  await exec(`ffmpeg -i ${videoPath} -ss 00:00:01 -vframes 1 ${thumbnailPath}`);

  return thumbnailPath;
}
```

#### Acceptance Criteria

- [ ] Can record video from mobile camera
- [ ] Can select existing video from gallery
- [ ] Video uploads to server successfully
- [ ] Thumbnail generates (if ffmpeg available)
- [ ] Upload status shows in "My Uploads"
- [ ] Progress indicator during upload

---

### 2.5 Pre-Seed Demo Data

**Goal:** Create realistic demo data for Apex Custom Cabinets.

#### Seed Script Structure

```typescript
// scripts/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clean existing data
  await prisma.company.deleteMany();

  // Create Apex Custom Cabinets
  const company = await createApexCompany();

  // Create users
  const users = await createUsers(company.id);

  // Create categories
  const categories = await createCategories(company.id);

  // Create job roles
  const roles = await createJobRoles(company.id);

  // Create training tracks
  const tracks = await createTracks(company.id, roles);

  // Create modules
  const modules = await createModules(company.id, categories);

  // Link modules to tracks
  await linkModulesToTracks(tracks, modules);

  // Create certifications
  await createCertifications(company.id, users);

  // Create SOPs
  await createSOPs(company.id);

  console.log('✅ Seed complete!');
}
```

#### Demo Company: Apex Custom Cabinets

```typescript
const apexCompany = {
  name: 'Apex Custom Cabinets',
  slug: 'apex-cabinets',
  primaryColor: '#8B5A2B',     // Wood tone
  secondaryColor: '#374151',    // Dark gray
  coreValues: [
    'Safety First — Go home the same way you came in',
    'Measure Twice — Precision is pride',
    'Clean as You Go — A clean shop is a safe shop',
    'Pride in Craftsmanship — Sign your work with quality',
  ],
  setupComplete: true,
};
```

#### Demo Users

| Name | Email | Role | Job Role |
|------|-------|------|----------|
| Mike Thompson | mike@apex.demo | OWNER | - |
| Sarah Chen | sarah@apex.demo | ADMIN | - |
| Dave Rodriguez | dave@apex.demo | SUPERVISOR | Lead Installer |
| John Smith | john@apex.demo | EMPLOYEE | Shop Technician |
| Emily Davis | emily@apex.demo | EMPLOYEE | Field Carpenter |
| Carlos Mendez | carlos@apex.demo | EMPLOYEE | New Hire |

#### Demo Categories

```
Shop
├── Power Tools
│   ├── Table Saw
│   ├── Miter Saw
│   └── Track Saw
├── Dust Collection
└── Finishing Room

Field
├── Framing
├── Cabinet Install
└── Punch List & QC

Safety

General
```

#### Demo Modules (12-15)

| # | Title | Category | Type | Duration |
|---|-------|----------|------|----------|
| 1 | Welcome to Apex | General | Video + Text | 3 min |
| 2 | Shop Safety Overview | Safety | Video + Checklist | 8 min |
| 3 | Table Saw Safety & Operation | Power Tools > Table Saw | Video + Checklist + Quiz | 12 min |
| 4 | Miter Saw Basics | Power Tools > Miter Saw | Video + Checklist | 6 min |
| 5 | Track Saw Operation | Power Tools > Track Saw | Video | 5 min |
| 6 | How to Read Shop Drawings | General | Text + Images | 10 min |
| 7 | Dust Collection Best Practices | Dust Collection | Video + Checklist | 5 min |
| 8 | Cabinet Installation QC | Cabinet Install | Checklist | 4 min |
| 9 | Lifting & Back Safety | Safety | Video + Quiz | 7 min |
| 10 | Finishing Room Protocols | Finishing Room | Video + Checklist | 8 min |
| 11 | End of Day Cleanup | General | Checklist | 3 min |
| 12 | Punch List Standards | Punch List & QC | Text + Images | 6 min |

#### Demo Tracks

**Track 1: New Hire - Shop (0-14 days)**
1. Welcome to Apex
2. Shop Safety Overview
3. Table Saw Safety & Operation
4. Miter Saw Basics
5. Track Saw Operation
6. Dust Collection Best Practices
7. Finishing Room Protocols
8. End of Day Cleanup

**Track 2: New Hire - Field Installer (0-21 days)**
1. Welcome to Apex
2. Shop Safety Overview (yes, everyone)
3. Lifting & Back Safety
4. How to Read Shop Drawings
5. Cabinet Installation QC
6. Punch List Standards

**Track 3: Annual OSHA Refresh**
1. Shop Safety Overview
2. Lifting & Back Safety

#### Demo SOPs

| Title | Category |
|-------|----------|
| Table Saw Daily Maintenance | Power Tools |
| End-of-Day Shop Cleanup | General |
| Cabinet Install – Level & Scribe | Cabinet Install |
| How to Fill Out a Time Card | General |

#### Sample Module Content

```typescript
// Module: Table Saw Safety & Operation
{
  title: 'Table Saw Safety & Operation',
  description: 'Essential safety procedures and basic operation of the SawStop table saw.',
  estimatedMinutes: 12,
  category: 'Power Tools > Table Saw',
  contentBlocks: [
    {
      type: 'VIDEO',
      content: {
        url: '/uploads/videos/demo/table-saw-safety.mp4',
        thumbnailUrl: '/uploads/images/demo/table-saw-thumb.jpg',
        duration: 420,
      }
    },
    {
      type: 'TEXT',
      content: {
        markdown: `## Key Safety Points\n\n1. **Always** use the blade guard...\n2. Keep push sticks within arm's reach...\n3. Never reach over the blade...`
      }
    },
    {
      type: 'CHECKLIST',
      content: {
        title: 'Pre-Operation Safety Check',
        requireAll: true,
        items: [
          { id: '1', text: 'Blade guard is in place and functioning', required: true },
          { id: '2', text: 'Push stick is within reach', required: true },
          { id: '3', text: 'Safety glasses are on', required: true },
          { id: '4', text: 'Dust collection is running', required: true },
          { id: '5', text: 'No loose clothing or jewelry', required: true },
        ]
      }
    },
    {
      type: 'QUIZ',
      content: {
        title: 'Safety Knowledge Check',
        passingScore: 80,
        questions: [
          {
            id: 'q1',
            question: 'What should you check FIRST before turning on the table saw?',
            type: 'single',
            options: [
              { id: 'a', text: 'Blade sharpness', isCorrect: false },
              { id: 'b', text: 'Blade guard is in place', isCorrect: true },
              { id: 'c', text: 'Wood moisture content', isCorrect: false },
            ]
          },
          {
            id: 'q2',
            question: 'When should you use a push stick?',
            type: 'single',
            options: [
              { id: 'a', text: 'Only for small pieces', isCorrect: false },
              { id: 'b', text: 'When hands would be within 6 inches of blade', isCorrect: true },
              { id: 'c', text: 'Never, it reduces control', isCorrect: false },
            ]
          }
        ]
      }
    }
  ]
}
```

#### Run Seed

```bash
# From project root
pnpm db:seed

# Or directly
npx tsx scripts/seed.ts
```

#### Acceptance Criteria

- [ ] Seed script runs without errors
- [ ] All demo data created correctly
- [ ] Users can log in with demo accounts
- [ ] Categories display with correct nesting
- [ ] Modules have content blocks
- [ ] Tracks link to correct modules
- [ ] Can reset and re-seed cleanly

---

## Completion Checklist

| Task | Status |
|------|--------|
| 2.1 Training Library | ⬜ |
| 2.2 Module Viewer | ⬜ |
| 2.3 Onboarding Tracks | ⬜ |
| 2.4 Employee Video Upload | ⬜ |
| 2.5 Pre-Seed Demo Data | ⬜ |

---

## Phase Exit Criteria

Before moving to Phase 3, confirm:

- [ ] Categories display in nested tree view
- [ ] Modules render all content block types correctly
- [ ] Progress saves and persists across sessions
- [ ] Tracks show accurate completion percentage
- [ ] Video upload works from mobile
- [ ] Demo company has realistic, complete data
- [ ] Search returns relevant results
- [ ] All flows work on both web and mobile

---

**Previous Phase:** [Phase 1: Foundation](./PHASE_1_FOUNDATION.md)
**Next Phase:** [Phase 3: Advanced Features](./PHASE_3_ADVANCED_FEATURES.md)
