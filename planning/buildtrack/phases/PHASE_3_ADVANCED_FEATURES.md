# Phase 3: Advanced Features

**Objective:** Build supervisor/admin workflows, QR codes, and certification tracking.

**Prerequisites:** Phase 1 (Foundation), Phase 2 (Core Features)
**Enables:** Phase 4 (Polish & Demo)

---

## Overview

Phase 3 completes the "magic" of BuildTrack—turning field worker videos into company training in seconds:

- QR codes for instant module access
- Admin review queue for video uploads
- One-click "Create Module from Video"
- Supervisor dashboard
- Certification tracking with expiry warnings

After Phase 3, supervisors can review uploads, create modules, and manage team training compliance.

---

## Deliverables

- [ ] QR code generation and deep linking
- [ ] Video upload review queue
- [ ] "Create Module from Video" flow
- [ ] Supervisor dashboard
- [ ] Certification tracking
- [ ] Expiry warning notifications

---

## Tasks

### 3.1 QR Code System

**Goal:** Print QR codes → scan → open specific module on phone.

#### QR Code Generation

```typescript
// Client-side QR generation (no server needed)
import QRCode from 'qrcode';

async function generateModuleQR(
  moduleId: string,
  companySlug: string
): Promise<string> {
  // Short URL format
  const url = `${window.location.origin}/qr/${moduleId}`;

  // Generate as data URL
  const dataUrl = await QRCode.toDataURL(url, {
    width: 300,
    margin: 2,
    color: {
      dark: '#1E3A5F',  // BuildTrack Blue
      light: '#FFFFFF',
    },
  });

  return dataUrl;
}
```

#### QR Code Endpoint

```typescript
// GET /qr/:code
// Handles: authenticated → redirect to module
//          unauthenticated → redirect to login, then module

@Get('qr/:code')
async handleQRScan(
  @Param('code') code: string,
  @Req() req: Request,
  @Res() res: Response,
) {
  // Increment scan count
  await this.qrService.recordScan(code);

  // Get module from QR code
  const qr = await this.qrService.findByCode(code);
  if (!qr) {
    return res.redirect('/404?reason=invalid-qr');
  }

  // If user authenticated, go to module
  if (req.user) {
    return res.redirect(`/modules/${qr.moduleId}`);
  }

  // Otherwise, store destination and redirect to login
  // After login, user will be redirected to module
  return res.redirect(`/login?redirect=/modules/${qr.moduleId}`);
}
```

#### Mobile Deep Linking

```typescript
// app.json (Expo)
{
  "expo": {
    "scheme": "buildtrack",
    "web": {
      "bundler": "metro"
    }
  }
}

// app/qr/[code].tsx
export default function QRRedirect() {
  const { code } = useLocalSearchParams();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    async function handleQR() {
      // Fetch module info from QR code
      const response = await api.get(`/qr/${code}/info`);
      const { moduleId } = response.data;

      if (isAuthenticated) {
        router.replace(`/training/${moduleId}`);
      } else {
        // Store redirect target
        await SecureStore.setItemAsync('loginRedirect', `/training/${moduleId}`);
        router.replace('/login');
      }
    }
    handleQR();
  }, [code, isAuthenticated]);

  return <LoadingScreen message="Opening module..." />;
}
```

#### Printable QR Sheet

```typescript
// Component to generate printable QR sheet
function PrintableQRSheet({ modules }: { modules: Module[] }) {
  return (
    <div className="print:block hidden">
      <style>{`
        @media print {
          @page { size: letter; margin: 0.5in; }
          .qr-card { break-inside: avoid; }
        }
      `}</style>

      <div className="grid grid-cols-3 gap-4">
        {modules.map(module => (
          <div key={module.id} className="qr-card border p-4 text-center">
            <img src={module.qrDataUrl} alt="QR Code" className="mx-auto w-32 h-32" />
            <h3 className="font-bold mt-2">{module.title}</h3>
            <p className="text-sm text-gray-500">{module.category?.name}</p>
            <p className="text-xs mt-1">Scan to start training</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /modules/:id/qr | Generate QR code for module |
| GET | /qr/:code | Handle QR scan redirect |
| GET | /qr/:code/info | Get module info from QR code |
| GET | /modules/:id/qr/stats | Get scan statistics |

#### Acceptance Criteria

- [ ] QR codes generate client-side
- [ ] Scanning QR opens module (authenticated)
- [ ] Scanning QR prompts login then opens module (unauthenticated)
- [ ] QR works on both web and mobile
- [ ] Printable QR sheet generates correctly
- [ ] Scan count tracked per QR code

---

### 3.2 Video Upload Review Queue

**Goal:** Supervisors review employee video submissions.

#### Review Queue UI

```
┌─────────────────────────────────────────────────────────────┐
│  Video Uploads                                    [Filter ▼] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PENDING REVIEW (3)                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ┌──────┐  How to scribe cabinets to wall           │   │
│  │ │ 🎬   │  Carlos Mendez · 2 hours ago              │   │
│  │ │ 0:47 │  Category: Cabinet Install                │   │
│  │ └──────┘                                [Review →] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ┌──────┐  Quick tip: checking level on install     │   │
│  │ │ 🎬   │  Emily Davis · Yesterday                  │   │
│  │ │ 0:32 │  Category: Cabinet Install                │   │
│  │ └──────┘                                [Review →] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  RECENTLY REVIEWED                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ✅ Proper clamp placement for glue-ups             │   │
│  │    Converted to module · Dave Rodriguez · 3d ago    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Review Detail Modal

```
┌─────────────────────────────────────────────────────────────┐
│  Review Upload                                        [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │               [Video Player]                        │   │
│  │                                                     │   │
│  │                    0:47                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Title: How to scribe cabinets to uneven wall              │
│  Submitted by: Carlos Mendez                               │
│  Category: Field > Cabinet Install                         │
│  Date: Dec 10, 2024 at 2:34 PM                            │
│                                                             │
│  Description:                                              │
│  "Quick tip I learned from Dave - use a compass to trace   │
│   the wall profile, then cut with jigsaw for perfect fit"  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Actions:                                                  │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ ✨ Create Module │  │ ❌ Reject       │                 │
│  │   from this     │  │                 │                 │
│  └─────────────────┘  └─────────────────┘                 │
│                                                             │
│  Rejection reason (optional):                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /uploads/pending | List pending uploads |
| GET | /uploads/reviewed | List reviewed uploads |
| POST | /uploads/:id/approve | Approve upload |
| POST | /uploads/:id/reject | Reject upload with reason |
| POST | /uploads/:id/convert | Convert to module |

#### Acceptance Criteria

- [ ] Pending uploads listed with thumbnails
- [ ] Video plays in review modal
- [ ] Can approve or reject with note
- [ ] Status updates reflect immediately
- [ ] Submitter can see status of their uploads
- [ ] Filter by status, date, category

---

### 3.3 Create Module from Video

**Goal:** One-click conversion of video upload to training module.

#### Conversion Flow

```
1. Click "Create Module" on video upload
2. Pre-filled form appears:
   - Title (from upload title)
   - Description (from upload description)
   - Category (from upload suggestion)
   - Video (automatically attached)
3. Optionally add:
   - Additional text content
   - Checklist items
   - Quiz questions
4. Choose:
   - Save as Draft
   - Publish immediately
   - Add to specific track(s)
5. Confirm → Module created, upload marked as CONVERTED
```

#### Module Creation Form

```
┌─────────────────────────────────────────────────────────────┐
│  Create Module from Video                             [×]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  BASIC INFO                                                 │
│                                                             │
│  Title *                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ How to scribe cabinets to uneven wall              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Description                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Quick tip for getting a perfect fit when walls     │   │
│  │ aren't perfectly flat...                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Category *                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Field > Cabinet Install                         ▼  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  CONTENT BLOCKS                                            │
│                                                             │
│  ┌─ VIDEO ──────────────────────────────────────────────┐  │
│  │  🎬 From Carlos's upload (0:47)           [Preview] │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  [+ Add Text Block]  [+ Add Checklist]  [+ Add Quiz]      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ADD TO TRACKS                                             │
│  ☐ New Hire - Field Installer                              │
│  ☐ Cabinet Installation Certification                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │  Save Draft     │  │ Publish Now ✓   │                 │
│  └─────────────────┘  └─────────────────┘                 │
│                                                             │
│  Credit: "Created from Carlos Mendez's field video"        │
│  ☑ Show attribution in module                              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### API Implementation

```typescript
@Post('uploads/:id/convert')
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPERVISOR)
async convertToModule(
  @Param('id') uploadId: string,
  @Body() dto: CreateModuleFromUploadDto,
  @User() user: UserEntity,
) {
  const upload = await this.uploadsService.findOne(uploadId);

  if (upload.status !== 'PENDING' && upload.status !== 'APPROVED') {
    throw new BadRequestException('Upload cannot be converted');
  }

  // Create module with video as first content block
  const module = await this.modulesService.create({
    title: dto.title,
    description: dto.description,
    categoryId: dto.categoryId,
    companyId: user.companyId,
    status: dto.publishNow ? 'PUBLISHED' : 'DRAFT',
    sourceUploadId: uploadId,
    contentBlocks: [
      {
        type: 'VIDEO',
        sortOrder: 0,
        content: {
          url: upload.videoUrl,
          thumbnailUrl: upload.thumbnailUrl,
          duration: upload.duration,
        },
      },
      ...dto.additionalBlocks,
    ],
  });

  // Link to tracks if specified
  if (dto.trackIds?.length) {
    await this.tracksService.addModuleToTracks(module.id, dto.trackIds);
  }

  // Update upload status
  await this.uploadsService.markConverted(uploadId, module.id);

  return module;
}
```

#### Acceptance Criteria

- [ ] Form pre-populates from upload data
- [ ] Video block automatically included
- [ ] Can add additional content blocks
- [ ] Can save as draft or publish immediately
- [ ] Can add to multiple tracks at once
- [ ] Attribution shows on published module
- [ ] Upload status updates to CONVERTED

---

### 3.4 Supervisor Dashboard

**Goal:** Overview of team training status and pending actions.

#### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                              Good morning, Dave!  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│  │      3        │  │      2        │  │      5        │   │
│  │   Pending     │  │   Overdue     │  │   Expiring    │   │
│  │   Reviews     │  │   Training    │  │   Certs       │   │
│  └───────────────┘  └───────────────┘  └───────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  NEEDS ATTENTION                                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ⚠️ Carlos Mendez                                    │   │
│  │    New Hire - Shop track 4 days overdue            │   │
│  │    Progress: 60% (6/10 modules)                    │   │
│  │                              [Send Reminder] [View]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 John Smith                                       │   │
│  │    OSHA certification expires in 3 days            │   │
│  │                              [Assign Refresher]    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  TEAM PROGRESS THIS WEEK                                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Modules Completed: 23                              │   │
│  │  Videos Uploaded: 4                                 │   │
│  │  Certifications Earned: 2                          │   │
│  │                                                     │   │
│  │  Top Performer: Emily Davis (8 modules)            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  RECENT ACTIVITY                                           │
│  • Emily completed "Punch List Standards" — 2h ago        │
│  • Carlos uploaded "Cabinet scribing tip" — 3h ago        │
│  • John started "OSHA Refresh" track — Yesterday          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /dashboard/summary | Get dashboard metrics |
| GET | /dashboard/alerts | Get pending alerts |
| GET | /dashboard/team-progress | Get team progress |
| GET | /dashboard/activity | Get recent activity |

#### Dashboard Data Structure

```typescript
interface DashboardSummary {
  pendingReviews: number;
  overdueTraining: {
    count: number;
    users: {
      id: string;
      name: string;
      trackName: string;
      daysOverdue: number;
      progress: number;
    }[];
  };
  expiringCertifications: {
    count: number;
    certifications: {
      userId: string;
      userName: string;
      certificationName: string;
      expiresAt: string;
      daysUntilExpiry: number;
    }[];
  };
  weeklyStats: {
    modulesCompleted: number;
    videosUploaded: number;
    certificationsEarned: number;
    topPerformer: {
      userId: string;
      name: string;
      modulesCompleted: number;
    } | null;
  };
  recentActivity: {
    type: 'module_completed' | 'video_uploaded' | 'track_started' | 'certification_earned';
    userId: string;
    userName: string;
    description: string;
    timestamp: string;
  }[];
}
```

#### Acceptance Criteria

- [ ] Summary cards show accurate counts
- [ ] Overdue training highlights affected users
- [ ] Expiring certifications show days remaining
- [ ] Weekly stats reflect actual data
- [ ] Activity feed updates in real-time
- [ ] Actions (send reminder, assign) work

---

### 3.5 Certification Tracking

**Goal:** Track certifications with expiry warnings.

#### Certification Management

```
┌─────────────────────────────────────────────────────────────┐
│  Certifications                              [+ Add New]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  COMPANY CERTIFICATIONS                                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔒 OSHA 10-Hour Construction                        │   │
│  │    Valid for: 24 months                             │   │
│  │    Required: Yes                                    │   │
│  │    Certified: 8/12 employees                        │   │
│  │                                            [Manage] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🛠️ Table Saw Certified                              │   │
│  │    Valid for: 12 months                             │   │
│  │    Required: Shop roles                             │   │
│  │    Certified: 5/6 shop employees                    │   │
│  │                                            [Manage] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  EXPIRING SOON (next 30 days)                              │
│                                                             │
│  │ Name           │ Certification      │ Expires  │ Status│
│  ├────────────────┼───────────────────┼──────────┼───────┤
│  │ John Smith     │ OSHA 10-Hour      │ Dec 14   │ 🔴 3d │
│  │ Emily Davis    │ Table Saw         │ Dec 28   │ 🟡 17d│
│  │ Carlos Mendez  │ Forklift          │ Jan 5    │ 🟡 25d│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Employee Certification Wallet

```
┌─────────────────────────────────────────────────────────────┐
│  My Certifications                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏅 OSHA 10-Hour Construction                       │   │
│  │                                                     │   │
│  │  Issued: June 15, 2024                              │   │
│  │  Expires: June 15, 2026                             │   │
│  │  Status: ✅ Active                                  │   │
│  │                                                     │   │
│  │  [View Certificate]  [Download PDF]                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏅 Table Saw Certified                             │   │
│  │                                                     │   │
│  │  Issued: March 1, 2024                              │   │
│  │  Expires: March 1, 2025                             │   │
│  │  Status: ⚠️ Expires in 82 days                      │   │
│  │                                                     │   │
│  │  [View Certificate]  [Start Renewal]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🏅 First Aid / CPR                                 │   │
│  │                                                     │   │
│  │  Issued: September 10, 2023                         │   │
│  │  Expires: September 10, 2024                        │   │
│  │  Status: 🔴 Expired                                 │   │
│  │                                                     │   │
│  │  [Start Renewal Training]                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /certifications | List company certifications |
| POST | /certifications | Create certification type |
| GET | /certifications/:id | Get certification details |
| GET | /certifications/expiring | Get expiring certifications |
| POST | /users/:id/certifications | Issue certification to user |
| GET | /me/certifications | Get current user's certifications |

#### Expiry Notification Logic

```typescript
// Scheduled job - runs daily
async checkExpiringCertifications() {
  const thresholds = [30, 14, 7, 3, 1]; // days before expiry

  for (const days of thresholds) {
    const expiring = await this.certService.findExpiringWithin(days);

    for (const cert of expiring) {
      // Check if notification already sent for this threshold
      const alreadySent = await this.notificationService.wasNotificationSent(
        cert.userId,
        `cert_expiry_${days}d`,
        cert.certificationId
      );

      if (!alreadySent) {
        await this.notificationService.send({
          userId: cert.userId,
          type: 'certification_expiring',
          title: `${cert.certificationName} expires in ${days} day${days > 1 ? 's' : ''}`,
          body: `Complete the renewal training to maintain your certification.`,
          action: `/certifications/${cert.certificationId}/renew`,
        });
      }
    }
  }

  // Also notify supervisors of team expirations
  await this.notifySupervisorsOfTeamExpirations();
}
```

#### Acceptance Criteria

- [ ] Company can create certification types
- [ ] Certifications can be issued to employees
- [ ] Expiry dates tracked and displayed
- [ ] Warning badges show at 30, 14, 7, 3, 1 days
- [ ] Expired certifications clearly marked
- [ ] Employees see their certification wallet
- [ ] Certificate document can be viewed/downloaded

---

## Completion Checklist

| Task | Status |
|------|--------|
| 3.1 QR Code System | ⬜ |
| 3.2 Video Upload Review Queue | ⬜ |
| 3.3 Create Module from Video | ⬜ |
| 3.4 Supervisor Dashboard | ⬜ |
| 3.5 Certification Tracking | ⬜ |

---

## Phase Exit Criteria

Before moving to Phase 4, confirm:

- [ ] QR codes scan and open correct modules
- [ ] Deep linking works on mobile
- [ ] Supervisors can review and approve uploads
- [ ] Modules created from videos work correctly
- [ ] Dashboard shows accurate metrics
- [ ] Certification expiry warnings display
- [ ] All admin workflows accessible to correct roles

---

**Previous Phase:** [Phase 2: Core Features](./PHASE_2_CORE_FEATURES.md)
**Next Phase:** [Phase 4: Polish & Demo](./PHASE_4_POLISH_DEMO.md)
