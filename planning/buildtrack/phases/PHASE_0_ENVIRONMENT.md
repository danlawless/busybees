# Phase 0: Environment Setup

**Objective:** Establish all local development infrastructure before writing application code.

**Prerequisites:** None
**Enables:** All subsequent phases

---

## Overview

Phase 0 focuses on setting up a fully local development environment. No cloud services or remote databases—everything runs on the developer's machine. This enables:

- Fast iteration without network latency
- No cloud costs during development
- Full offline development capability
- Easy onboarding for new developers

---

## Deliverables

- [ ] Local PostgreSQL database running
- [ ] Local file storage configured
- [ ] Development environment with hot reload
- [ ] Database migrations and seeding working
- [ ] Basic CI checks (linting, type checking)
- [ ] Documentation for developer onboarding

---

## Tasks

### 0.1 Project Initialization

**Goal:** Create the monorepo structure with all packages configured.

#### Directory Structure

```
buildtrack/
├── apps/
│   ├── api/               # NestJS backend
│   ├── web/               # React + Vite frontend
│   └── mobile/            # Expo React Native app
├── packages/
│   ├── database/          # Prisma schema + migrations
│   ├── shared/            # Shared types + utilities
│   └── ui/                # Shared UI components (optional)
├── docker/
│   └── docker-compose.yml # Local services
├── scripts/
│   └── seed.ts            # Database seeding
├── .env.example
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── README.md
```

#### Commands

```bash
# Initialize project
mkdir buildtrack && cd buildtrack
pnpm init

# Create workspace configuration
cat > pnpm-workspace.yaml << 'EOF'
packages:
  - 'apps/*'
  - 'packages/*'
EOF

# Initialize turbo (optional, for faster builds)
pnpm add -Dw turbo
```

#### Acceptance Criteria

- [ ] Running `pnpm install` completes without errors
- [ ] All packages are linked correctly
- [ ] TypeScript builds across all packages

---

### 0.2 Local Database Setup

**Goal:** PostgreSQL running locally via Docker with persistent data.

#### Docker Compose Configuration

Create `docker/docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: buildtrack-db
    environment:
      POSTGRES_USER: buildtrack
      POSTGRES_PASSWORD: buildtrack_dev
      POSTGRES_DB: buildtrack
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U buildtrack']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

#### Environment Variables

Create `.env.example`:

```bash
# Database
DATABASE_URL="postgresql://buildtrack:buildtrack_dev@localhost:5432/buildtrack"

# App
NODE_ENV=development
PORT=3000

# File Storage (local)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=104857600  # 100MB

# Auth (local development)
JWT_SECRET=local-dev-secret-change-in-production
MAGIC_LINK_SECRET=local-magic-link-secret

# Frontend
VITE_API_URL=http://localhost:3000
```

#### Commands

```bash
# Start database
docker compose -f docker/docker-compose.yml up -d

# Verify connection
docker exec -it buildtrack-db psql -U buildtrack -c "SELECT 1"

# Stop database
docker compose -f docker/docker-compose.yml down

# Reset database (delete volume)
docker compose -f docker/docker-compose.yml down -v
```

#### Acceptance Criteria

- [ ] `docker compose up -d` starts PostgreSQL successfully
- [ ] Database accepts connections on localhost:5432
- [ ] Data persists across container restarts

---

### 0.3 Prisma Setup

**Goal:** Database schema management with Prisma.

#### Initialize Prisma Package

```bash
# Create database package
mkdir -p packages/database
cd packages/database
pnpm init
pnpm add prisma @prisma/client
pnpm add -D typescript @types/node

# Initialize Prisma
npx prisma init
```

#### Initial Schema

Create `packages/database/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Core tenant model
model Company {
  id          String   @id @default(uuid())
  name        String
  slug        String   @unique
  logoUrl     String?
  primaryColor String  @default("#1E3A5F")
  secondaryColor String @default("#4A5568")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  users       User[]
  jobRoles    JobRole[]
  categories  Category[]
  modules     Module[]
  tracks      TrainingTrack[]
}

// Placeholder - full schema in Phase 1
model User {
  id          String   @id @default(uuid())
  email       String   @unique
  name        String
  role        UserRole @default(EMPLOYEE)
  companyId   String
  company     Company  @relation(fields: [companyId], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum UserRole {
  OWNER
  ADMIN
  SUPERVISOR
  EMPLOYEE
}

// Placeholder models - detailed in Phase 1
model JobRole {
  id        String  @id @default(uuid())
  name      String
  companyId String
  company   Company @relation(fields: [companyId], references: [id])
}

model Category {
  id        String  @id @default(uuid())
  name      String
  companyId String
  company   Company @relation(fields: [companyId], references: [id])
}

model Module {
  id        String  @id @default(uuid())
  title     String
  companyId String
  company   Company @relation(fields: [companyId], references: [id])
}

model TrainingTrack {
  id        String  @id @default(uuid())
  name      String
  companyId String
  company   Company @relation(fields: [companyId], references: [id])
}
```

#### Package.json Scripts

```json
{
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:seed": "tsx ../scripts/seed.ts",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset"
  }
}
```

#### Acceptance Criteria

- [ ] `pnpm db:push` creates tables in PostgreSQL
- [ ] `pnpm db:generate` generates Prisma client
- [ ] `pnpm db:studio` opens Prisma Studio at localhost:5555

---

### 0.4 Local File Storage

**Goal:** Store uploaded files locally during development.

#### Storage Service (placeholder for Phase 1)

Create `apps/api/src/storage/local-storage.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuid } from 'uuid';

@Injectable()
export class LocalStorageService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || './uploads';
    this.ensureDir();
  }

  private async ensureDir() {
    await fs.mkdir(this.uploadDir, { recursive: true });
    await fs.mkdir(path.join(this.uploadDir, 'videos'), { recursive: true });
    await fs.mkdir(path.join(this.uploadDir, 'images'), { recursive: true });
    await fs.mkdir(path.join(this.uploadDir, 'documents'), { recursive: true });
  }

  async uploadFile(
    file: Buffer,
    originalName: string,
    type: 'videos' | 'images' | 'documents'
  ): Promise<string> {
    const ext = path.extname(originalName);
    const filename = `${uuid()}${ext}`;
    const filepath = path.join(this.uploadDir, type, filename);

    await fs.writeFile(filepath, file);

    // Return local URL (served by static middleware)
    return `/uploads/${type}/${filename}`;
  }

  async deleteFile(filepath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filepath.replace('/uploads/', ''));
    await fs.unlink(fullPath);
  }

  getFilePath(url: string): string {
    return path.join(this.uploadDir, url.replace('/uploads/', ''));
  }
}
```

#### Static File Serving

In `apps/api/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve uploaded files
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  await app.listen(3000);
}
```

#### Directory Structure

```
uploads/
├── videos/     # Training videos, employee uploads
├── images/     # Logos, thumbnails, module images
└── documents/  # SOPs, PDFs
```

#### Acceptance Criteria

- [ ] Files can be uploaded and saved to `./uploads/`
- [ ] Uploaded files are accessible via `http://localhost:3000/uploads/...`
- [ ] Different file types go to appropriate subdirectories

---

### 0.5 Development Scripts

**Goal:** Easy-to-use commands for common development tasks.

#### Root package.json

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "dev:api": "pnpm --filter api dev",
    "dev:web": "pnpm --filter web dev",
    "dev:mobile": "pnpm --filter mobile start",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "db:up": "docker compose -f docker/docker-compose.yml up -d",
    "db:down": "docker compose -f docker/docker-compose.yml down",
    "db:reset": "docker compose -f docker/docker-compose.yml down -v && docker compose -f docker/docker-compose.yml up -d",
    "db:studio": "pnpm --filter database db:studio",
    "db:seed": "pnpm --filter database db:seed",
    "setup": "pnpm install && pnpm db:up && pnpm --filter database db:push && pnpm db:seed"
  }
}
```

#### turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {}
  }
}
```

#### Acceptance Criteria

- [ ] `pnpm setup` configures entire development environment
- [ ] `pnpm dev` starts all services with hot reload
- [ ] `pnpm db:studio` opens Prisma Studio

---

### 0.6 Basic CI Checks

**Goal:** Automated linting and type checking on commits.

#### ESLint Configuration

Create `.eslintrc.js`:

```javascript
module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es2022: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',
  },
  ignorePatterns: ['dist/', 'node_modules/', '.turbo/'],
};
```

#### Prettier Configuration

Create `.prettierrc`:

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

#### Husky + lint-staged

```bash
pnpm add -Dw husky lint-staged
npx husky init
```

Create `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"
pnpm lint-staged
```

Create `.lintstagedrc`:

```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md,yml}": ["prettier --write"]
}
```

#### Acceptance Criteria

- [ ] `pnpm lint` runs ESLint across all packages
- [ ] `pnpm typecheck` runs TypeScript checks
- [ ] Pre-commit hook blocks commits with lint errors

---

### 0.7 Developer Onboarding Documentation

**Goal:** New developers can set up and run the project in < 15 minutes.

#### README.md

```markdown
# BuildTrack

Construction training platform that feels like it belongs on a job site.

## Prerequisites

- Node.js 20+
- pnpm 8+
- Docker Desktop

## Quick Start

```bash
# Clone and install
git clone <repo>
cd buildtrack
pnpm install

# Start database and seed data
pnpm db:up
pnpm --filter database db:push
pnpm db:seed

# Start development servers
pnpm dev
```

## Services

| Service | URL | Description |
|---------|-----|-------------|
| API | http://localhost:3000 | NestJS backend |
| Web | http://localhost:5173 | React frontend |
| Mobile | Expo Go app | Scan QR code |
| DB Studio | http://localhost:5555 | Prisma database viewer |

## Common Commands

```bash
pnpm dev          # Start all services
pnpm db:studio    # Open database viewer
pnpm db:reset     # Reset database to clean state
pnpm lint         # Run linting
pnpm typecheck    # Run type checking
pnpm build        # Build for production
```

## Project Structure

```
apps/
  api/      - NestJS backend
  web/      - React + Vite frontend
  mobile/   - Expo mobile app
packages/
  database/ - Prisma schema + migrations
  shared/   - Shared types + utilities
```
```

#### Acceptance Criteria

- [ ] New developer can run `pnpm setup` and have working environment
- [ ] README covers all common workflows
- [ ] No manual steps required beyond running scripts

---

## Completion Checklist

| Task | Status |
|------|--------|
| 0.1 Project Initialization | ⬜ |
| 0.2 Local Database Setup | ⬜ |
| 0.3 Prisma Setup | ⬜ |
| 0.4 Local File Storage | ⬜ |
| 0.5 Development Scripts | ⬜ |
| 0.6 Basic CI Checks | ⬜ |
| 0.7 Developer Documentation | ⬜ |

---

## Phase Exit Criteria

Before moving to Phase 1, confirm:

- [ ] `pnpm setup` completes without errors
- [ ] `pnpm dev` starts API, web, and shows no errors
- [ ] Database accepts connections and has schema applied
- [ ] File uploads work and are served correctly
- [ ] Pre-commit hooks run on staged files
- [ ] Another developer can clone and run the project

---

**Next Phase:** [Phase 1: Foundation](./PHASE_1_FOUNDATION.md)
