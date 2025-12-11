# Phase 1: Foundation

**Objective:** Build core infrastructure, multi-tenant architecture, and authentication.

**Prerequisites:** Phase 0 (Environment Setup)
**Enables:** Phases 2, 3, 4

---

## Overview

Phase 1 establishes the architectural foundation that everything else builds upon:

- Multi-tenant data isolation
- Authentication with magic links
- Company branding and setup wizard
- Basic web and mobile shells

After Phase 1, a company owner can sign up, configure their company branding, and invite team members.

---

## Deliverables

- [ ] NestJS API with multi-tenant middleware
- [ ] Authentication (email/password + magic links)
- [ ] Company registration and setup wizard
- [ ] File upload service (local storage)
- [ ] Dynamic company theming
- [ ] React web app shell with routing
- [ ] Expo mobile app shell with routing
- [ ] Basic role-based access control

---

## Data Model

### Complete Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// COMPANY (Tenant)
// ============================================

model Company {
  id              String   @id @default(uuid())
  name            String
  slug            String   @unique
  logoUrl         String?
  primaryColor    String   @default("#1E3A5F")
  secondaryColor  String   @default("#4A5568")
  coreValues      String[] @default([])
  setupComplete   Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  users           User[]
  jobRoles        JobRole[]
  categories      Category[]
  modules         Module[]
  tracks          TrainingTrack[]
  certifications  Certification[]
  videoUploads    VideoUpload[]
  sops            SOP[]

  @@index([slug])
}

// ============================================
// USER & AUTH
// ============================================

model User {
  id              String    @id @default(uuid())
  email           String    @unique
  name            String
  role            UserRole  @default(EMPLOYEE)
  avatarUrl       String?
  passwordHash    String?   // null if magic link only
  lastLoginAt     DateTime?
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Tenant
  companyId       String
  company         Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)

  // Relations
  jobRoleId       String?
  jobRole         JobRole?  @relation(fields: [jobRoleId], references: [id])
  enrollments     TrackEnrollment[]
  progress        ModuleProgress[]
  certifications  UserCertification[]
  videoUploads    VideoUpload[]
  approvals       ModuleApproval[]

  @@unique([email, companyId])
  @@index([companyId])
  @@index([email])
}

model MagicLink {
  id        String   @id @default(uuid())
  token     String   @unique
  email     String
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([token])
  @@index([email])
}

model Session {
  id        String   @id @default(uuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([token])
  @@index([userId])
}

enum UserRole {
  OWNER
  ADMIN
  SUPERVISOR
  EMPLOYEE
}

// ============================================
// JOB ROLES & TRAINING TRACKS
// ============================================

model JobRole {
  id          String   @id @default(uuid())
  name        String
  description String?
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  users       User[]
  tracks      TrainingTrack[]

  @@unique([name, companyId])
  @@index([companyId])
}

model TrainingTrack {
  id          String   @id @default(uuid())
  name        String
  description String?
  durationDays Int     @default(14)  // Expected completion time
  isRequired  Boolean  @default(false)
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  // Which job roles this track applies to
  jobRoles    JobRole[]
  modules     TrackModule[]
  enrollments TrackEnrollment[]

  @@index([companyId])
}

model TrackModule {
  id        String   @id @default(uuid())
  sortOrder Int      @default(0)
  isRequired Boolean @default(true)

  trackId   String
  track     TrainingTrack @relation(fields: [trackId], references: [id], onDelete: Cascade)

  moduleId  String
  module    Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@unique([trackId, moduleId])
}

model TrackEnrollment {
  id          String    @id @default(uuid())
  startedAt   DateTime  @default(now())
  completedAt DateTime?
  dueDate     DateTime?

  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  trackId     String
  track       TrainingTrack @relation(fields: [trackId], references: [id], onDelete: Cascade)

  @@unique([userId, trackId])
  @@index([userId])
  @@index([trackId])
}

// ============================================
// CATEGORIES & MODULES
// ============================================

model Category {
  id          String   @id @default(uuid())
  name        String
  description String?
  iconName    String?  // Icon identifier (e.g., "power-tools", "safety")
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  // Self-referential for nesting
  parentId    String?
  parent      Category?  @relation("CategoryHierarchy", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryHierarchy")

  modules     Module[]

  @@unique([name, companyId, parentId])
  @@index([companyId])
  @@index([parentId])
}

model Module {
  id          String       @id @default(uuid())
  title       String
  description String?
  thumbnailUrl String?
  status      ModuleStatus @default(DRAFT)
  estimatedMinutes Int     @default(5)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  publishedAt DateTime?

  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  categoryId  String?
  category    Category? @relation(fields: [categoryId], references: [id])

  // Created from video upload?
  sourceUploadId String? @unique
  sourceUpload   VideoUpload? @relation(fields: [sourceUploadId], references: [id])

  contentBlocks ContentBlock[]
  trackModules  TrackModule[]
  progress      ModuleProgress[]
  qrCodes       QRCode[]

  @@index([companyId])
  @@index([categoryId])
  @@index([status])
}

enum ModuleStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

model ContentBlock {
  id        String           @id @default(uuid())
  type      ContentBlockType
  sortOrder Int              @default(0)
  content   Json             // Type-specific content

  moduleId  String
  module    Module @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@index([moduleId])
}

enum ContentBlockType {
  VIDEO
  TEXT
  CHECKLIST
  QUIZ
  IMAGE
}

// ============================================
// PROGRESS TRACKING
// ============================================

model ModuleProgress {
  id            String    @id @default(uuid())
  status        ProgressStatus @default(NOT_STARTED)
  startedAt     DateTime?
  completedAt   DateTime?
  score         Int?      // Quiz score if applicable
  timeSpentSec  Int       @default(0)

  userId        String
  user          User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  moduleId      String
  module        Module    @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  checklistState Json?    // Track which items checked

  @@unique([userId, moduleId])
  @@index([userId])
  @@index([moduleId])
}

enum ProgressStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  FAILED
}

// ============================================
// VIDEO UPLOADS (Employee Submissions)
// ============================================

model VideoUpload {
  id          String            @id @default(uuid())
  title       String
  description String?
  videoUrl    String
  thumbnailUrl String?
  duration    Int?              // Seconds
  status      VideoUploadStatus @default(PENDING)
  createdAt   DateTime          @default(now())
  reviewedAt  DateTime?
  reviewNote  String?

  companyId   String
  company     Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  uploadedById String
  uploadedBy   User   @relation(fields: [uploadedById], references: [id])

  categoryId  String?
  suggestedCategory Category? @relation(fields: [categoryId], references: [id])

  // If converted to module
  module      Module?

  @@index([companyId])
  @@index([status])
}

enum VideoUploadStatus {
  PENDING
  APPROVED
  REJECTED
  CONVERTED  // Turned into a module
}

model ModuleApproval {
  id        String   @id @default(uuid())
  action    ApprovalAction
  note      String?
  createdAt DateTime @default(now())

  approverId String
  approver   User   @relation(fields: [approverId], references: [id])

  moduleId  String
}

enum ApprovalAction {
  APPROVED
  REJECTED
  REQUESTED_CHANGES
}

// ============================================
// CERTIFICATIONS
// ============================================

model Certification {
  id              String   @id @default(uuid())
  name            String
  description     String?
  validityMonths  Int      @default(12)
  isRequired      Boolean  @default(false)
  createdAt       DateTime @default(now())

  companyId       String
  company         Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  userCertifications UserCertification[]

  @@index([companyId])
}

model UserCertification {
  id          String    @id @default(uuid())
  issuedAt    DateTime  @default(now())
  expiresAt   DateTime
  documentUrl String?   // Certificate PDF/image

  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  certificationId String
  certification   Certification @relation(fields: [certificationId], references: [id], onDelete: Cascade)

  @@unique([userId, certificationId])
  @@index([userId])
  @@index([expiresAt])
}

// ============================================
// SOPs
// ============================================

model SOP {
  id          String   @id @default(uuid())
  title       String
  description String?
  content     String   // Markdown content
  documentUrl String?  // Optional PDF
  version     String   @default("1.0")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  companyId   String
  company     Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)

  categoryId  String?

  @@index([companyId])
}

// ============================================
// QR CODES
// ============================================

model QRCode {
  id        String   @id @default(uuid())
  code      String   @unique  // Short code for URL
  scans     Int      @default(0)
  createdAt DateTime @default(now())

  moduleId  String
  module    Module   @relation(fields: [moduleId], references: [id], onDelete: Cascade)

  @@index([code])
}
```

---

## Tasks

### 1.1 NestJS API Setup

**Goal:** Configure NestJS with essential middleware and modules.

#### Project Structure

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── company.decorator.ts
│   │   │   └── user.decorator.ts
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── middleware/
│   │   │   └── tenant.middleware.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── companies/
│   │   ├── users/
│   │   ├── storage/
│   │   └── health/
│   └── config/
│       └── configuration.ts
├── test/
└── package.json
```

#### Key Files

**main.ts:**
```typescript
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  );

  // CORS for web/mobile
  app.enableCors({
    origin: ['http://localhost:5173', 'exp://'],
    credentials: true,
  });

  // Serve uploaded files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

**tenant.middleware.ts:**
```typescript
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Company ID can come from:
    // 1. JWT token (authenticated users)
    // 2. Subdomain (company.buildtrack.app)
    // 3. Header (X-Company-ID) for API access

    const companyId = req.user?.companyId
      || req.headers['x-company-id']
      || this.extractFromSubdomain(req);

    if (companyId) {
      req['companyId'] = companyId;
    }

    next();
  }

  private extractFromSubdomain(req: Request): string | null {
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];
    // In production, lookup company by slug
    return null;
  }
}
```

#### Acceptance Criteria

- [ ] API starts on port 3000
- [ ] Health check endpoint returns 200
- [ ] Validation pipe rejects invalid requests
- [ ] CORS allows requests from web and mobile

---

### 1.2 Authentication Module

**Goal:** Email/password + magic link authentication.

#### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Create new company + owner |
| POST | /auth/login | Email/password login |
| POST | /auth/magic-link | Request magic link email |
| GET | /auth/magic-link/:token | Verify magic link |
| POST | /auth/refresh | Refresh session token |
| POST | /auth/logout | Invalidate session |
| GET | /auth/me | Get current user |

#### Auth Flow

```
1. Company Registration:
   POST /auth/register { companyName, email, password?, name }
   → Creates Company + User (OWNER role)
   → Returns session token

2. Magic Link (Demo-friendly):
   POST /auth/magic-link { email }
   → Generates token, stores in MagicLink table
   → (Dev: logs to console instead of email)
   → Returns { message: "Link sent" }

   GET /auth/magic-link/:token
   → Validates token, creates session
   → Returns { token, user }

3. Standard Login:
   POST /auth/login { email, password }
   → Validates credentials
   → Returns { token, user }
```

#### Token Strategy

```typescript
// JWT payload
interface JwtPayload {
  sub: string;      // userId
  email: string;
  companyId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

// Token expiry
ACCESS_TOKEN_EXPIRY = '15m'
REFRESH_TOKEN_EXPIRY = '7d'
MAGIC_LINK_EXPIRY = '15m'
```

#### Acceptance Criteria

- [ ] New company can register
- [ ] Magic link login works (logs to console in dev)
- [ ] Password login works
- [ ] JWT tokens have correct payload
- [ ] Sessions can be refreshed
- [ ] Protected routes reject invalid tokens

---

### 1.3 Company Setup Wizard

**Goal:** First-run experience for new company owners.

#### Wizard Steps

1. **Company Basics** (required)
   - Company name
   - Logo upload (optional)
   - Primary color
   - Secondary color

2. **Core Values** (optional)
   - Add 3-5 company values
   - Examples provided

3. **Job Roles** (required, minimum 1)
   - Name
   - Description

4. **Categories** (optional, can skip)
   - Pre-populated suggestions based on industry
   - Can add custom

5. **Complete**
   - Summary
   - "Get Started" button

#### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /companies/me | Get current company |
| PATCH | /companies/me | Update company |
| POST | /companies/me/complete-setup | Mark setup complete |
| POST | /companies/me/logo | Upload logo |
| GET | /companies/me/setup-status | Get wizard progress |

#### Wizard State

```typescript
interface SetupStatus {
  step: 'basics' | 'values' | 'roles' | 'categories' | 'complete';
  basics: {
    name: boolean;
    logo: boolean;
    colors: boolean;
  };
  values: {
    count: number;
  };
  roles: {
    count: number;
  };
  categories: {
    count: number;
  };
}
```

#### Acceptance Criteria

- [ ] Wizard guides owner through setup
- [ ] Logo upload works and displays
- [ ] Colors update and preview live
- [ ] Can skip optional steps
- [ ] Setup marked complete when finished
- [ ] Subsequent logins skip wizard

---

### 1.4 File Upload Service

**Goal:** Handle file uploads with local storage.

#### Service Implementation

```typescript
@Injectable()
export class StorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
  }

  async upload(
    file: Express.Multer.File,
    options: {
      type: 'images' | 'videos' | 'documents';
      companyId: string;
      userId?: string;
    }
  ): Promise<UploadResult> {
    const filename = `${uuid()}${path.extname(file.originalname)}`;
    const relativePath = `${options.type}/${options.companyId}/${filename}`;
    const fullPath = path.join(this.uploadDir, relativePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    return {
      url: `/uploads/${relativePath}`,
      filename,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async delete(url: string): Promise<void> {
    const fullPath = path.join(
      this.uploadDir,
      url.replace('/uploads/', '')
    );
    await fs.unlink(fullPath);
  }

  // Generate thumbnail for images
  async generateThumbnail(
    sourcePath: string,
    options: { width: number; height: number }
  ): Promise<string> {
    // Use sharp for image processing
    // Returns thumbnail URL
  }
}
```

#### File Validation

```typescript
// Max sizes
const FILE_LIMITS = {
  images: 10 * 1024 * 1024,    // 10MB
  videos: 500 * 1024 * 1024,   // 500MB
  documents: 50 * 1024 * 1024, // 50MB
};

// Allowed types
const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  videos: ['video/mp4', 'video/quicktime', 'video/webm'],
  documents: ['application/pdf', 'text/plain', 'text/markdown'],
};
```

#### Acceptance Criteria

- [ ] Files upload to correct subdirectory
- [ ] File validation rejects invalid types/sizes
- [ ] Uploaded files accessible via URL
- [ ] Files organized by company ID
- [ ] Cleanup deletes files correctly

---

### 1.5 Dynamic Theming

**Goal:** Company branding applies throughout the app.

#### Theme Provider (Web)

```typescript
// hooks/useCompanyTheme.ts
export function useCompanyTheme(company: Company | null) {
  useEffect(() => {
    if (!company) return;

    const root = document.documentElement;
    root.style.setProperty('--company-primary', company.primaryColor);
    root.style.setProperty('--company-secondary', company.secondaryColor);

    return () => {
      root.style.removeProperty('--company-primary');
      root.style.removeProperty('--company-secondary');
    };
  }, [company]);
}
```

#### CSS Variables

```css
:root {
  /* BuildTrack defaults */
  --color-primary: #1E3A5F;
  --color-secondary: #4A5568;

  /* Company overrides */
  --company-primary: var(--color-primary);
  --company-secondary: var(--color-secondary);
}

/* Usage */
.btn-primary {
  background-color: var(--company-primary);
}

.text-brand {
  color: var(--company-primary);
}
```

#### Mobile Theme (React Native)

```typescript
// contexts/ThemeContext.tsx
export const ThemeContext = createContext<Theme>(defaultTheme);

export function ThemeProvider({ company, children }) {
  const theme = useMemo(() => ({
    ...defaultTheme,
    colors: {
      ...defaultTheme.colors,
      primary: company?.primaryColor || defaultTheme.colors.primary,
      secondary: company?.secondaryColor || defaultTheme.colors.secondary,
    },
  }), [company]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}
```

#### Acceptance Criteria

- [ ] Company colors apply on login
- [ ] Logo displays in header/nav
- [ ] Theme persists across page navigation
- [ ] Default theme used before company loads
- [ ] Theme works on both web and mobile

---

### 1.6 React Web Shell

**Goal:** Basic web application structure with routing.

#### Project Setup

```bash
cd apps
pnpm create vite web --template react-ts
cd web
pnpm add @tanstack/react-query react-router-dom
pnpm add -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### Route Structure

```typescript
// src/routes.tsx
import { createBrowserRouter } from 'react-router-dom';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/magic-link/:token',
    element: <MagicLinkPage />,
  },

  // Protected routes
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      {
        path: 'setup',
        element: <SetupWizard />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'training',
        element: <TrainingLibrary />,
      },
      {
        path: 'modules/:id',
        element: <ModuleViewer />,
      },
      {
        path: 'team',
        element: <TeamPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);
```

#### Page Structure

```
src/
├── components/
│   ├── ui/           # shadcn/ui components
│   ├── layout/       # Header, Sidebar, Footer
│   └── forms/        # Reusable form components
├── pages/
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── MagicLinkPage.tsx
│   ├── setup/
│   │   └── SetupWizard.tsx
│   ├── dashboard/
│   │   └── Dashboard.tsx
│   └── training/
│       └── TrainingLibrary.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useCompany.ts
│   └── useCompanyTheme.ts
├── lib/
│   ├── api.ts        # API client
│   └── utils.ts
├── contexts/
│   └── AuthContext.tsx
└── routes.tsx
```

#### Acceptance Criteria

- [ ] Vite dev server runs on port 5173
- [ ] Routing works without page reload
- [ ] Auth guard redirects unauthenticated users
- [ ] API calls work with auth token
- [ ] Tailwind styles apply correctly

---

### 1.7 Expo Mobile Shell

**Goal:** Basic React Native app with navigation.

#### Project Setup

```bash
cd apps
npx create-expo-app mobile --template expo-template-blank-typescript
cd mobile
npx expo install expo-router expo-camera expo-barcode-scanner
```

#### Navigation Structure

```
app/
├── _layout.tsx          # Root layout
├── (auth)/
│   ├── _layout.tsx
│   ├── login.tsx
│   └── magic-link.tsx
├── (app)/
│   ├── _layout.tsx      # Tab navigator
│   ├── index.tsx        # Home/Dashboard
│   ├── training/
│   │   ├── index.tsx    # Library
│   │   └── [id].tsx     # Module viewer
│   ├── upload.tsx       # Video upload
│   └── profile.tsx      # User profile
└── qr/
    └── [code].tsx       # QR code deep link
```

#### Key Screens

1. **Login** - Email input, magic link request
2. **Home** - Welcome, assigned tracks, quick actions
3. **Training Library** - Categories, search, modules
4. **Module Viewer** - Video player, checklist, quiz
5. **Video Upload** - Camera, record, submit
6. **Profile** - Progress, certifications, settings

#### Acceptance Criteria

- [ ] Expo Go can run the app
- [ ] Tab navigation works
- [ ] Auth state persists (SecureStore)
- [ ] Camera permissions work
- [ ] Deep links work (exp://...)

---

### 1.8 Role-Based Access Control

**Goal:** Basic permission system for the 4 roles.

#### Permission Matrix

| Action | Owner | Admin | Supervisor | Employee |
|--------|-------|-------|------------|----------|
| View company settings | ✅ | ✅ | ❌ | ❌ |
| Edit company settings | ✅ | ❌ | ❌ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ |
| Create modules | ✅ | ✅ | ❌ | ❌ |
| Approve uploads | ✅ | ✅ | ✅ | ❌ |
| View all progress | ✅ | ✅ | ✅ | ❌ |
| Upload videos | ✅ | ✅ | ✅ | ✅ |
| Complete training | ✅ | ✅ | ✅ | ✅ |

#### Guard Implementation

```typescript
// guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<UserRole[]>(
      'roles',
      context.getHandler()
    );

    if (!requiredRoles) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return requiredRoles.includes(user.role);
  }
}

// Usage
@Roles(UserRole.OWNER, UserRole.ADMIN)
@Get('users')
getUsers() { ... }
```

#### Acceptance Criteria

- [ ] Roles decorator works on endpoints
- [ ] Unauthorized returns 403
- [ ] Owner can access all endpoints
- [ ] Employee cannot access admin endpoints

---

## Completion Checklist

| Task | Status |
|------|--------|
| 1.1 NestJS API Setup | ⬜ |
| 1.2 Authentication Module | ⬜ |
| 1.3 Company Setup Wizard | ⬜ |
| 1.4 File Upload Service | ⬜ |
| 1.5 Dynamic Theming | ⬜ |
| 1.6 React Web Shell | ⬜ |
| 1.7 Expo Mobile Shell | ⬜ |
| 1.8 Role-Based Access Control | ⬜ |

---

## Phase Exit Criteria

Before moving to Phase 2, confirm:

- [ ] New company can register and complete setup wizard
- [ ] Magic link login works end-to-end
- [ ] Company logo and colors display correctly
- [ ] Web app loads and navigates without errors
- [ ] Mobile app runs in Expo Go
- [ ] Role-based endpoints respect permissions
- [ ] All endpoints have proper validation

---

**Previous Phase:** [Phase 0: Environment](./PHASE_0_ENVIRONMENT.md)
**Next Phase:** [Phase 2: Core Features](./PHASE_2_CORE_FEATURES.md)
