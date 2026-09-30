# Admin Shell Foundation Implementation Plan (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One PIN login opens a left sidebar that reaches every Busy Bees staff and admin space, and every `/api/admin/*` route refuses callers without the right session.

**Architecture:** A single `src/lib/admin/nav.ts` defines the menu and each item's level (`staff` | `admin`). The staff PIN and admin PIN sign into two shared Supabase accounts whose `public.users.role` carries the level, so the existing role column and RLS enforce it. Middleware gates `/admin/*` pages, `/editor`, and `/api/admin/*` + `/api/settings/*` from pure, unit-tested decision functions. Views still living in `AdminPanel.tsx` are reached through a bridge route that renders AdminPanel on one view with its own button row hidden; Plan 2 lifts them out one at a time.

**Tech Stack:** Next.js 15 App Router, React 19, Supabase (`@supabase/ssr`), Tailwind v4, bcryptjs, lucide-react, Vitest (added here), Playwright (added here), pnpm.

**Spec:** `docs/superpowers/specs/2026-09-29-admin-shell-design.md`

**Plan 2 (separate, written after this ships):** extract the 18 AdminPanel views into `src/components/admin/views/*`, delete `AdminPanel.tsx`, point the POS at `/admin`, retire the editor JWT/password flow, delete `/api/auth/staff-login`.

## Deviations From the Spec (found while reading the code)

- **API guard lives in middleware, not a wrapper on each of the 60 route files.** Same rule, one place, and a route added later is covered automatically (fail closed to `admin`). Spec section 6.3's "test that fails when a route is unwrapped" becomes Task 2's "every route file is classified" test.
- **Two exemptions the spec did not know about:** the kiosk calls `/api/admin/group-booking/assign-children` in customer mode (needs any signed-in session), and the gift-card reminder cron authenticates itself with `CRON_SECRET`.
- **Kiosk settings reads stay open:** `GET` on `pos-pin`, `pos-mode`, `auto-checkout` (non-sensitive flags the kiosk needs before sign-in). Writes need admin.
- **Moved to Plan 2:** extracting the 18 views, deleting `AdminPanel.tsx`, pointing the POS at `/admin`, removing the editor password flow and deleting `/api/auth/staff-login`. Plan 1 bridges every view so all 22 sidebar items work on day one, gates the editor with the admin session, and removes the hardcoded fallbacks.

## Global Constraints

- Package manager is **pnpm** (`vercel.json` installCommand). Never run `npm install`.
- Import alias `@/*` → `./src/*`.
- Levels are exactly `'staff' | 'admin'`. `public.users.role` enum is `customer | staff | admin`.
- PINs are exactly 4 digits (`src/lib/auth/pin.ts` enforces `^\d{4}$`).
- **No PIN value is ever written into code, tests, fixtures, docs, commit messages, or logs.** Tests use `'1234'` / `'5678'`. Real PINs are entered only at rollout through the setup script prompt (Task 11).
- Shared accounts: `staff@busybees.internal` (role `staff`), `admin@busybees.internal` (role `admin`). Passwords only from env `STAFF_ACCOUNT_PASSWORD`, `ADMIN_ACCOUNT_PASSWORD`.
- Session stamp cookie: name `bb_admin_started`, HttpOnly, SameSite=Lax, Secure in production, value `<epochMs>.<hmac>` signed with env `ADMIN_SESSION_SECRET`. Max session age **12 hours**.
- Rate limit: **5** wrong PINs per IP in **10 minutes** → locked **10 minutes**.
- `?to` redirect honored only when it starts with `/admin` and not `//`.
- Unknown admin API path defaults to level `admin` (fail closed).
- Commits: `emoji type: description` per repo CLAUDE.md (✨ feature, 🐛 fix, 🔒 security). Never `--no-verify`.
- Copy rules (Light Brands house style): US English, no em or en dashes in UI strings.
- The public site, customer accounts, and POS checkout behavior do not change.

## Review Focus

1. **Kiosk customer buying a group rate.** `CheckIn.tsx:2000` calls `/api/admin/group-booking/assign-children` in customer mode (group-rate purchase is not staff-only). Expected: still works after the gate. Pinned by the exemption test in Task 2 and the E2E check in Task 12.
2. **POS staff mode with a per-person login.** `/api/auth/staff-auth` sessions drive AdminPanel inside the POS and call `/api/admin/*`. Expected: keeps working. Pinned by Task 4 Step 6 (staff-auth sets the stamp) and Task 12 E2E.
3. **Gift-card reminder cron.** `/api/admin/gift-cards/send-reminders` authenticates with `CRON_SECRET` bearer and no session. Expected: cron still runs. Pinned by the `self` exemption in Task 2 and the route change in Task 10.
4. **Tampered or missing stamp cookie with a valid Supabase session.** Expected: treated as expired, redirected to login (pages) or 401 (API), never a crash. Pinned in Task 3 and Task 5 tests.
5. **Kiosk reading settings with no session.** The POS kiosk GETs `/api/settings/pos-pin`, `/api/settings/pos-mode`, `/api/settings/auto-checkout` before anyone signs in. Expected: those reads keep working; writes to the same routes need admin. Pinned by the method-aware rule in Task 2 and the manual kiosk check in Task 12.

---

## File Structure

| File | Responsibility |
|---|---|
| `vitest.config.ts` | Test runner config (node env, `@` alias) |
| `src/lib/admin/nav.ts` | Menu tree, levels, `navFor`, `levelForPath`, `roleToLevel`, `safeNext` |
| `src/lib/admin/api-access.ts` | `apiLevelForPath` for `/api/admin/*` and `/api/settings/*`, exemptions |
| `src/lib/admin/session-stamp.ts` | Sign and verify the `bb_admin_started` cookie (Web Crypto, edge-safe) |
| `src/lib/admin/access.ts` | Pure `decidePageAccess` / `decideApiAccess` used by middleware |
| `src/lib/admin/pin-login.ts` | Pure `resolvePinLevel` (admin hash first) |
| `src/lib/admin/rate-limit.ts` | In-memory per-IP attempt limiter |
| `src/lib/admin/shared-accounts.ts` | Shared account emails, env passwords, server sign-in helper |
| `src/lib/admin/guard.ts` | Server `getAdminLevel()` for pages and layout |
| `src/app/api/admin/session/route.ts` | `POST` login / upgrade, `DELETE` lock |
| `src/app/api/admin/pins/route.ts` | `POST` change staff or admin PIN (admin only) |
| `middleware.ts` | Wire the gates |
| `src/components/admin/shell/PinPad.tsx` | Keypad UI used by login and upgrade |
| `src/components/admin/shell/AdminSidebar.tsx` | Accordion sidebar + mobile drawer |
| `src/components/admin/shell/AdminPageHeader.tsx` | Shared page title bar |
| `src/components/admin/shell/UpgradePrompt.tsx` | In-place admin PIN prompt for staff on Owner pages |
| `src/app/admin/login/page.tsx` | Login screen |
| `src/app/admin/(shell)/layout.tsx` | Shell: sidebar + content, level check |
| `src/app/admin/(shell)/page.tsx` | Today (bridged AdminPanel dashboard) |
| `src/app/admin/(shell)/[view]/page.tsx` | Bridge route for views still inside AdminPanel |
| `src/app/admin/(shell)/settings/AccessCodesCard.tsx` | Change staff / admin PIN form |
| `src/hooks/usePosCatalog.ts` | Loads promos, passes, parties, products, volume discounts, customers (shared by POS and bridge) |
| `src/components/admin/AdminPanelBridge.tsx` | Renders AdminPanel on one view |
| `scripts/admin-access-setup.ts` | One-time: create shared accounts, set roles, hash PINs from a prompt, clear plaintext |
| `tests/admin/*.test.ts` | Unit tests |
| `e2e/admin-shell.spec.ts`, `playwright.config.ts` | End-to-end smoke |

Existing pages move into the route group unchanged except for PIN-screen removal: `src/app/admin/{parties,events,after-dark,reports,discounts}/page.tsx` → `src/app/admin/(shell)/{same}/page.tsx`.

---

### Task 1: Test harness and the nav source of truth

**Files:**
- Modify: `package.json` (devDependencies, scripts)
- Create: `vitest.config.ts`
- Create: `src/lib/admin/nav.ts`
- Test: `tests/admin/nav.test.ts`

**Interfaces:**
- Produces:
  - `type Level = 'staff' | 'admin'`
  - `type NavItem = { id: string; label: string; href: string; icon: LucideIcon; level: Level; external?: boolean }`
  - `type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] }`
  - `const NAV: NavGroup[]`
  - `navFor(level: Level): Array<NavGroup & { items: Array<NavItem & { locked: boolean }> }>`
  - `levelForPath(pathname: string): Level`
  - `roleToLevel(role: string | null | undefined): Level | null`
  - `safeNext(to: string | null | undefined): string` (returns `/admin` when unsafe)
  - `BRIDGED_VIEWS: Record<string, AdminView>` mapping route slug → AdminPanel view id

- [ ] **Step 1: Add Vitest**

```bash
pnpm add -D vitest@^3 vite-tsconfig-paths@^5
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 2: Write the failing test**

`tests/admin/nav.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { NAV, navFor, levelForPath, roleToLevel, safeNext, BRIDGED_VIEWS } from '@/lib/admin/nav';

describe('NAV', () => {
  it('has the five groups in order', () => {
    expect(NAV.map(g => g.label)).toEqual(['Front Desk', 'Bookings', 'Customers', 'Marketing', 'Owner']);
  });

  it('marks every Owner item admin and nothing else admin', () => {
    for (const g of NAV) for (const i of g.items) {
      expect(i.level).toBe(g.id === 'owner' ? 'admin' : 'staff');
    }
  });

  it('has unique ids and hrefs', () => {
    const items = NAV.flatMap(g => g.items);
    expect(new Set(items.map(i => i.id)).size).toBe(items.length);
    expect(new Set(items.map(i => i.href)).size).toBe(items.length);
  });
});

describe('navFor', () => {
  it('locks Owner items for staff', () => {
    const owner = navFor('staff').find(g => g.id === 'owner')!;
    expect(owner.items.every(i => i.locked)).toBe(true);
    const bookings = navFor('staff').find(g => g.id === 'bookings')!;
    expect(bookings.items.every(i => !i.locked)).toBe(true);
  });

  it('locks nothing for admin', () => {
    expect(navFor('admin').flatMap(g => g.items).some(i => i.locked)).toBe(false);
  });
});

describe('levelForPath', () => {
  it('uses the longest matching href', () => {
    expect(levelForPath('/admin')).toBe('staff');
    expect(levelForPath('/admin/parties')).toBe('staff');
    expect(levelForPath('/admin/parties/123')).toBe('staff');
    expect(levelForPath('/admin/reports')).toBe('admin');
    expect(levelForPath('/admin/settings/codes')).toBe('admin');
  });

  it('does not match on a shared prefix that is not a path segment', () => {
    expect(levelForPath('/admin/salesforce')).toBe('admin'); // unknown, fail closed
  });

  it('defaults unknown admin paths to admin', () => {
    expect(levelForPath('/admin/something-new')).toBe('admin');
  });

  it('treats /editor as admin', () => {
    expect(levelForPath('/editor')).toBe('admin');
  });
});

describe('roleToLevel', () => {
  it('maps roles', () => {
    expect(roleToLevel('admin')).toBe('admin');
    expect(roleToLevel('staff')).toBe('staff');
    expect(roleToLevel('customer')).toBeNull();
    expect(roleToLevel(undefined)).toBeNull();
  });
});

describe('safeNext', () => {
  it('allows admin paths only', () => {
    expect(safeNext('/admin/parties')).toBe('/admin/parties');
    expect(safeNext('/admin')).toBe('/admin');
    expect(safeNext('//evil.com/admin')).toBe('/admin');
    expect(safeNext('https://evil.com')).toBe('/admin');
    expect(safeNext('/customer')).toBe('/admin');
    expect(safeNext('/administrator')).toBe('/admin');
    expect(safeNext(null)).toBe('/admin');
  });
});

describe('BRIDGED_VIEWS', () => {
  it('only bridges hrefs that exist in NAV', () => {
    const hrefs = new Set(NAV.flatMap(g => g.items).map(i => i.href));
    for (const slug of Object.keys(BRIDGED_VIEWS)) expect(hrefs.has(`/admin/${slug}`)).toBe(true);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm test tests/admin/nav.test.ts`
Expected: FAIL, cannot resolve `@/lib/admin/nav`.

- [ ] **Step 4: Implement `src/lib/admin/nav.ts`**

```ts
import type { LucideIcon } from 'lucide-react';
import {
  Sun, MonitorSmartphone, Clock, PartyPopper, CalendarDays, Moon, UsersRound,
  Users, BadgeCheck, Ticket, CreditCard, Gift, Sparkles, TicketPercent, HeartHandshake,
  Mail, Megaphone, DollarSign, BarChart3, Package, PenSquare, Settings, Store, BookOpen,
  UserRound, Lock,
} from 'lucide-react';

export type Level = 'staff' | 'admin';

export type AdminView =
  | 'dashboard' | 'customers' | 'sales' | 'sessions' | 'marketing' | 'newsletter'
  | 'passes' | 'parties' | 'products' | 'gift-cards' | 'coupons' | 'groups'
  | 'monthly-members' | 'punch-cards' | 'announcements' | 'after-dark' | 'events' | 'settings';

export type NavItem = { id: string; label: string; href: string; icon: LucideIcon; level: Level; external?: boolean };
export type NavGroup = { id: string; label: string; icon: LucideIcon; items: NavItem[] };

export const NAV: NavGroup[] = [
  { id: 'front-desk', label: 'Front Desk', icon: Store, items: [
    { id: 'today', label: 'Today', href: '/admin', icon: Sun, level: 'staff' },
    { id: 'pos', label: 'Open POS', href: '/pos', icon: MonitorSmartphone, level: 'staff', external: true },
    { id: 'sessions', label: 'Sessions', href: '/admin/sessions', icon: Clock, level: 'staff' },
  ]},
  { id: 'bookings', label: 'Bookings', icon: BookOpen, items: [
    { id: 'parties', label: 'Parties', href: '/admin/parties', icon: PartyPopper, level: 'staff' },
    { id: 'events', label: 'Events', href: '/admin/events', icon: CalendarDays, level: 'staff' },
    { id: 'after-dark', label: 'After Dark', href: '/admin/after-dark', icon: Moon, level: 'staff' },
    { id: 'groups', label: 'Groups', href: '/admin/groups', icon: UsersRound, level: 'staff' },
  ]},
  { id: 'customers', label: 'Customers', icon: UserRound, items: [
    { id: 'customers', label: 'Customers', href: '/admin/customers', icon: Users, level: 'staff' },
    { id: 'members', label: 'Monthly Members', href: '/admin/members', icon: BadgeCheck, level: 'staff' },
    { id: 'passes', label: 'Passes', href: '/admin/passes', icon: Ticket, level: 'staff' },
    { id: 'punch-cards', label: 'Punch Cards', href: '/admin/punch-cards', icon: CreditCard, level: 'staff' },
    { id: 'gift-cards', label: 'Gift Cards', href: '/admin/gift-cards', icon: Gift, level: 'staff' },
  ]},
  { id: 'marketing', label: 'Marketing', icon: Megaphone, items: [
    { id: 'specials', label: 'Specials', href: '/admin/specials', icon: Sparkles, level: 'staff' },
    { id: 'coupons', label: 'Coupons', href: '/admin/coupons', icon: TicketPercent, level: 'staff' },
    { id: 'discounts', label: 'Sibling Discounts', href: '/admin/discounts', icon: HeartHandshake, level: 'staff' },
    { id: 'newsletter', label: 'Newsletter', href: '/admin/newsletter', icon: Mail, level: 'staff' },
    { id: 'announcements', label: 'Announcements', href: '/admin/announcements', icon: Megaphone, level: 'staff' },
  ]},
  { id: 'owner', label: 'Owner', icon: Lock, items: [
    { id: 'sales', label: 'Sales', href: '/admin/sales', icon: DollarSign, level: 'admin' },
    { id: 'reports', label: 'Reports', href: '/admin/reports', icon: BarChart3, level: 'admin' },
    { id: 'products', label: 'Products', href: '/admin/products', icon: Package, level: 'admin' },
    { id: 'editor', label: 'Website Editor', href: '/editor', icon: PenSquare, level: 'admin', external: true },
    { id: 'settings', label: 'Settings', href: '/admin/settings', icon: Settings, level: 'admin' },
  ]},
];

/** Route slug under /admin → AdminPanel view, for views not yet extracted (Plan 2 shrinks this). */
export const BRIDGED_VIEWS: Record<string, AdminView> = {
  sessions: 'sessions',
  groups: 'groups',
  customers: 'customers',
  members: 'monthly-members',
  passes: 'passes',
  'punch-cards': 'punch-cards',
  'gift-cards': 'gift-cards',
  specials: 'marketing',
  coupons: 'coupons',
  newsletter: 'newsletter',
  announcements: 'announcements',
  sales: 'sales',
  products: 'products',
  settings: 'settings',
};

const ALL_ITEMS = NAV.flatMap(g => g.items);

function matches(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + '/');
}

export function levelForPath(pathname: string): Level {
  // '/admin' matches every admin path, so it must only win for the exact root.
  if (pathname === '/admin' || pathname === '/admin/') return 'staff';
  const hit = ALL_ITEMS
    .filter(i => i.href !== '/admin' && matches(pathname, i.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return hit ? hit.level : 'admin';
}

export function navFor(level: Level) {
  return NAV.map(g => ({
    ...g,
    items: g.items.map(i => ({ ...i, locked: i.level === 'admin' && level !== 'admin' })),
  }));
}

export function roleToLevel(role: string | null | undefined): Level | null {
  return role === 'admin' ? 'admin' : role === 'staff' ? 'staff' : null;
}

export function safeNext(to: string | null | undefined): string {
  if (!to || to.startsWith('//')) return '/admin';
  return to === '/admin' || to.startsWith('/admin/') ? to : '/admin';
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test tests/admin/nav.test.ts`
Expected: PASS (all).

- [ ] **Step 6: Prove the fail-closed test can fail**

Temporarily change the last line of `levelForPath` to `return hit ? hit.level : 'staff';`, run `pnpm test tests/admin/nav.test.ts`, confirm the "defaults unknown admin paths to admin" and "salesforce" tests go red, then revert.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/lib/admin/nav.ts tests/admin/nav.test.ts
git diff --cached --stat
git commit -m "✨ feat: nav source of truth with levels, plus vitest"
```

---

### Task 2: API access map

**Files:**
- Create: `src/lib/admin/api-access.ts`
- Test: `tests/admin/api-access.test.ts`

**Interfaces:**
- Consumes: `Level` from Task 1.
- Produces:
  - `type ApiLevel = Level | 'signed-in' | 'self'`
  - `apiLevelForPath(pathname: string, method?: string): ApiLevel | null` (null = pass through; `method` defaults to `'GET'`)
  - `KIOSK_READS: Set<string>` (settings routes the kiosk may GET with no session)
  - `API_EXEMPTIONS: Record<string, 'signed-in' | 'self'>`

- [ ] **Step 1: Write the failing test**

`tests/admin/api-access.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { apiLevelForPath, API_EXEMPTIONS } from '@/lib/admin/api-access';

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return routeFiles(p);
    return name === 'route.ts' ? [p] : [];
  });
}

/** 'src/app/api/admin/customers/[id]/route.ts' → '/api/admin/customers/x' */
function toUrl(file: string): string {
  const rel = relative('src/app', file).split(sep).slice(0, -1).join('/');
  return '/' + rel.replace(/\[[^\]]+\]/g, 'x');
}

describe('apiLevelForPath', () => {
  it('passes through non-admin APIs', () => {
    expect(apiLevelForPath('/api/pos/customers')).toBeNull();
    expect(apiLevelForPath('/api/auth/web-login')).toBeNull();
  });

  it('leaves the session endpoint open (it is the login)', () => {
    expect(apiLevelForPath('/api/admin/session')).toBeNull();
  });

  it('classifies owner data as admin', () => {
    expect(apiLevelForPath('/api/admin/reports/revenue')).toBe('admin');
    expect(apiLevelForPath('/api/admin/fixed-expenses')).toBe('admin');
    expect(apiLevelForPath('/api/admin/fixed-expenses/x')).toBe('admin');
    expect(apiLevelForPath('/api/admin/top-customers')).toBe('admin');
    expect(apiLevelForPath('/api/admin/staff/x')).toBe('admin');
    expect(apiLevelForPath('/api/admin/pins')).toBe('admin');
    expect(apiLevelForPath('/api/settings')).toBe('admin');
    expect(apiLevelForPath('/api/settings/pos-pin')).toBe('admin');
  });

  it('classifies day-to-day data as staff', () => {
    expect(apiLevelForPath('/api/admin/customers/x/children')).toBe('staff');
    expect(apiLevelForPath('/api/admin/party-bookings/x/guests')).toBe('staff');
    expect(apiLevelForPath('/api/admin/staff-discounts')).toBe('staff');
  });

  it('keeps the kiosk group-rate assignment and the reminder cron reachable', () => {
    expect(apiLevelForPath('/api/admin/group-booking/assign-children')).toBe('signed-in');
    expect(apiLevelForPath('/api/admin/gift-cards/send-reminders')).toBe('self');
  });

  it('lets the kiosk read its three settings with no session, but not write them', () => {
    for (const p of ['/api/settings/pos-pin', '/api/settings/pos-mode', '/api/settings/auto-checkout']) {
      expect(apiLevelForPath(p, 'GET'), p).toBeNull();
      expect(apiLevelForPath(p, 'POST'), p).toBe('admin');
    }
    expect(apiLevelForPath('/api/settings', 'GET')).toBe('admin');
  });

  it('classifies every existing admin and settings route file', () => {
    const files = [...routeFiles('src/app/api/admin'), ...routeFiles('src/app/api/settings')];
    expect(files.length).toBeGreaterThan(50);
    for (const f of files) {
      const url = toUrl(f);
      if (url === '/api/admin/session') continue;
      expect(apiLevelForPath(url, 'POST'), url).not.toBeNull();
    }
  });

  it('every exemption points at a real route', () => {
    const urls = new Set(routeFiles('src/app/api/admin').map(toUrl));
    for (const path of Object.keys(API_EXEMPTIONS)) expect(urls.has(path), path).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/admin/api-access.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/admin/api-access.ts`**

```ts
import type { Level } from './nav';

export type ApiLevel = Level | 'signed-in' | 'self';

/**
 * Routes that cannot require a staff session:
 * - assign-children is called by the kiosk in customer mode after a group-rate purchase.
 * - send-reminders is a cron that authenticates with CRON_SECRET inside the route.
 */
export const API_EXEMPTIONS: Record<string, 'signed-in' | 'self'> = {
  '/api/admin/group-booking/assign-children': 'signed-in',
  '/api/admin/gift-cards/send-reminders': 'self',
};

const OPEN = new Set(['/api/admin/session']);

/** Read by the POS kiosk before anyone signs in. Values are non-sensitive (configured flag, mode, toggle). */
export const KIOSK_READS = new Set(['/api/settings/pos-pin', '/api/settings/pos-mode', '/api/settings/auto-checkout']);

const ADMIN_PREFIXES = [
  '/api/admin/reports',
  '/api/admin/fixed-expenses',
  '/api/admin/top-customers',
  '/api/admin/staff',
  '/api/admin/pins',
  '/api/settings',
];

function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

export function apiLevelForPath(pathname: string, method = 'GET'): ApiLevel | null {
  const path = pathname.replace(/\/$/, '');
  if (OPEN.has(path)) return null;
  if (method.toUpperCase() === 'GET' && KIOSK_READS.has(path)) return null;
  if (API_EXEMPTIONS[path]) return API_EXEMPTIONS[path];
  if (ADMIN_PREFIXES.some(p => under(path, p))) return 'admin';
  if (under(path, '/api/admin')) return 'staff';
  return null;
}
```

`/api/admin/staff-discounts` must NOT match `/api/admin/staff`; `under()` requires a `/` boundary, so it resolves to `staff` level (asserted in the day-to-day test).

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm test tests/admin/api-access.test.ts`
Expected: PASS.

- [ ] **Step 5: Prove the boundary test can fail**

Temporarily change `under` to `return pathname.startsWith(prefix);`, run the test, confirm `staff-discounts` goes red, revert.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/api-access.ts tests/admin/api-access.test.ts
git diff --cached --stat
git commit -m "✨ feat: classify every admin and settings API route by level"
```

---

### Task 3: Signed session stamp

**Files:**
- Create: `src/lib/admin/session-stamp.ts`
- Test: `tests/admin/session-stamp.test.ts`

**Interfaces:**
- Produces:
  - `const STAMP_COOKIE = 'bb_admin_started'`
  - `const MAX_SESSION_MS = 12 * 60 * 60 * 1000`
  - `signStamp(startedAt: number, secret: string): Promise<string>`
  - `readStamp(value: string | undefined, secret: string): Promise<number | null>` (null when missing, malformed, or bad signature)
  - `stampCookieOptions(): { httpOnly: true; sameSite: 'lax'; secure: boolean; path: '/'; maxAge: number }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { signStamp, readStamp } from '@/lib/admin/session-stamp';

const SECRET = 'test-secret-value';

describe('session stamp', () => {
  it('round-trips', async () => {
    const v = await signStamp(1_700_000_000_000, SECRET);
    expect(await readStamp(v, SECRET)).toBe(1_700_000_000_000);
  });

  it('rejects a changed timestamp', async () => {
    const v = await signStamp(1_700_000_000_000, SECRET);
    const [, sig] = v.split('.');
    expect(await readStamp(`1800000000000.${sig}`, SECRET)).toBeNull();
  });

  it('rejects the wrong secret, missing, and garbage', async () => {
    const v = await signStamp(1, SECRET);
    expect(await readStamp(v, 'other')).toBeNull();
    expect(await readStamp(undefined, SECRET)).toBeNull();
    expect(await readStamp('nope', SECRET)).toBeNull();
    expect(await readStamp('.abc', SECRET)).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm test tests/admin/session-stamp.test.ts` → FAIL, module not found.

- [ ] **Step 3: Implement (Web Crypto so it runs in middleware and Node)**

```ts
export const STAMP_COOKIE = 'bb_admin_started';
export const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

const enc = new TextEncoder();

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return Buffer.from(new Uint8Array(sig)).toString('base64url');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signStamp(startedAt: number, secret: string): Promise<string> {
  return `${startedAt}.${await hmac(String(startedAt), secret)}`;
}

export async function readStamp(value: string | undefined, secret: string): Promise<number | null> {
  if (!value) return null;
  const dot = value.indexOf('.');
  if (dot <= 0) return null;
  const ts = value.slice(0, dot);
  if (!/^\d+$/.test(ts)) return null;
  const expected = await hmac(ts, secret);
  return safeEqual(expected, value.slice(dot + 1)) ? Number(ts) : null;
}

export function stampCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/' as const,
    maxAge: MAX_SESSION_MS / 1000,
  };
}
```

If `Buffer` is unavailable in the edge runtime during Task 5 manual testing, replace the base64url line with `btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')`.

- [ ] **Step 4: Run to verify it passes** → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/session-stamp.ts tests/admin/session-stamp.test.ts
git diff --cached --stat
git commit -m "✨ feat: signed 12-hour session stamp"
```

---

### Task 4: PIN resolution, rate limit, session endpoint

**Files:**
- Create: `src/lib/admin/pin-login.ts`, `src/lib/admin/rate-limit.ts`, `src/lib/admin/shared-accounts.ts`
- Create: `src/app/api/admin/session/route.ts`
- Modify: `src/app/api/auth/staff-auth/route.ts:118-124` (set the stamp cookie on success)
- Test: `tests/admin/pin-login.test.ts`, `tests/admin/rate-limit.test.ts`

**Interfaces:**
- Consumes: `Level`, `signStamp`, `STAMP_COOKIE`, `stampCookieOptions`, `verifyPin` (`src/lib/auth/pin.ts`).
- Produces:
  - `resolvePinLevel(pin: string, hashes: { admin: string | null; staff: string | null }, verify?: (pin: string, hash: string) => Promise<boolean>): Promise<Level | null>`
  - `createRateLimiter(opts: { max: number; windowMs: number; lockMs: number; now?: () => number }): { check(key: string): { allowed: boolean; retryAfterMs: number }; fail(key: string): number /* remaining */; reset(key: string): void }`
  - `SHARED_ACCOUNTS: Record<Level, { email: string; passwordEnv: 'STAFF_ACCOUNT_PASSWORD' | 'ADMIN_ACCOUNT_PASSWORD' }>`
  - `loadPinHashes(): Promise<{ admin: string | null; staff: string | null }>` (reads settings keys `admin_pin_hash`, `staff_pin_hash` with the service client)
  - HTTP: `POST /api/admin/session` body `{ pin: string }` → `200 { level }` | `400` | `401 { error, remaining }` | `429 { error, retryAfterSeconds }` | `503 { error: 'no-pin' }`; `DELETE /api/admin/session` → `200`.

- [ ] **Step 1: Write the failing tests**

`tests/admin/pin-login.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { resolvePinLevel } from '@/lib/admin/pin-login';

const h = (p: string) => bcrypt.hashSync(p, 4);

describe('resolvePinLevel', () => {
  it('admin PIN resolves to admin', async () => {
    expect(await resolvePinLevel('5678', { admin: h('5678'), staff: h('1234') })).toBe('admin');
  });
  it('staff PIN resolves to staff', async () => {
    expect(await resolvePinLevel('1234', { admin: h('5678'), staff: h('1234') })).toBe('staff');
  });
  it('admin wins when both hashes match the same PIN', async () => {
    expect(await resolvePinLevel('1234', { admin: h('1234'), staff: h('1234') })).toBe('admin');
  });
  it('wrong PIN and malformed PIN resolve to null', async () => {
    expect(await resolvePinLevel('0000', { admin: h('5678'), staff: h('1234') })).toBeNull();
    expect(await resolvePinLevel('12a4', { admin: h('5678'), staff: h('1234') })).toBeNull();
  });
  it('missing hashes never match', async () => {
    expect(await resolvePinLevel('1234', { admin: null, staff: null })).toBeNull();
  });
});
```

`tests/admin/rate-limit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createRateLimiter } from '@/lib/admin/rate-limit';

describe('rate limiter', () => {
  it('locks after 5 failures within the window, then unlocks', () => {
    let t = 0;
    const rl = createRateLimiter({ max: 5, windowMs: 600_000, lockMs: 600_000, now: () => t });
    for (let i = 0; i < 4; i++) { rl.fail('ip'); }
    expect(rl.check('ip').allowed).toBe(true);
    expect(rl.fail('ip')).toBe(0);
    expect(rl.check('ip').allowed).toBe(false);
    t = 600_001;
    expect(rl.check('ip').allowed).toBe(true);
  });

  it('forgets failures older than the window', () => {
    let t = 0;
    const rl = createRateLimiter({ max: 5, windowMs: 600_000, lockMs: 600_000, now: () => t });
    for (let i = 0; i < 4; i++) rl.fail('ip');
    t = 700_000;
    expect(rl.fail('ip')).toBe(4);
  });

  it('reset clears a key; keys are independent', () => {
    const rl = createRateLimiter({ max: 5, windowMs: 1000, lockMs: 1000, now: () => 0 });
    for (let i = 0; i < 5; i++) rl.fail('a');
    expect(rl.check('b').allowed).toBe(true);
    rl.reset('a');
    expect(rl.check('a').allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify they fail** → `pnpm test tests/admin/pin-login.test.ts tests/admin/rate-limit.test.ts` FAIL, modules not found.

- [ ] **Step 3: Implement `src/lib/admin/pin-login.ts`**

```ts
import { verifyPin } from '@/lib/auth/pin';
import type { Level } from './nav';

export async function resolvePinLevel(
  pin: string,
  hashes: { admin: string | null; staff: string | null },
  verify: (pin: string, hash: string) => Promise<boolean> = verifyPin,
): Promise<Level | null> {
  if (!/^\d{4}$/.test(pin)) return null;
  if (hashes.admin && (await verify(pin, hashes.admin))) return 'admin';
  if (hashes.staff && (await verify(pin, hashes.staff))) return 'staff';
  return null;
}
```

- [ ] **Step 4: Implement `src/lib/admin/rate-limit.ts`**

```ts
type Entry = { fails: number[]; lockedUntil: number };

export function createRateLimiter(opts: { max: number; windowMs: number; lockMs: number; now?: () => number }) {
  const now = opts.now ?? Date.now;
  const map = new Map<string, Entry>();
  const get = (k: string) => map.get(k) ?? { fails: [], lockedUntil: 0 };

  return {
    check(key: string) {
      const e = get(key);
      const t = now();
      return e.lockedUntil > t ? { allowed: false, retryAfterMs: e.lockedUntil - t } : { allowed: true, retryAfterMs: 0 };
    },
    fail(key: string): number {
      const t = now();
      const e = get(key);
      e.fails = e.fails.filter(f => t - f < opts.windowMs);
      e.fails.push(t);
      if (e.fails.length >= opts.max) { e.lockedUntil = t + opts.lockMs; e.fails = []; }
      map.set(key, e);
      return e.lockedUntil > t ? 0 : opts.max - e.fails.length;
    },
    reset(key: string) { map.delete(key); },
  };
}
```

- [ ] **Step 5: Run to verify they pass** → PASS.

- [ ] **Step 6: Implement shared accounts, the endpoint, and the staff-auth stamp**

`src/lib/admin/shared-accounts.ts`:

```ts
import { createAdminClient } from '@/lib/supabase/server';
import type { Level } from './nav';

export const SHARED_ACCOUNTS: Record<Level, { email: string; passwordEnv: 'STAFF_ACCOUNT_PASSWORD' | 'ADMIN_ACCOUNT_PASSWORD' }> = {
  staff: { email: 'staff@busybees.internal', passwordEnv: 'STAFF_ACCOUNT_PASSWORD' },
  admin: { email: 'admin@busybees.internal', passwordEnv: 'ADMIN_ACCOUNT_PASSWORD' },
};

export async function loadPinHashes(): Promise<{ admin: string | null; staff: string | null }> {
  const db = createAdminClient();
  const { data } = await db.from('settings').select('key, value').in('key', ['admin_pin_hash', 'staff_pin_hash']);
  const byKey = new Map((data ?? []).map(r => [r.key, r.value || null]));
  return { admin: byKey.get('admin_pin_hash') ?? null, staff: byKey.get('staff_pin_hash') ?? null };
}
```

`src/app/api/admin/session/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { resolvePinLevel } from '@/lib/admin/pin-login';
import { createRateLimiter } from '@/lib/admin/rate-limit';
import { SHARED_ACCOUNTS, loadPinHashes } from '@/lib/admin/shared-accounts';
import { STAMP_COOKIE, signStamp, stampCookieOptions } from '@/lib/admin/session-stamp';
import { logger } from '@/lib/logger';

// Per-instance limiter. A cold start resets it; acceptable for v1 (spec 5.2).
const limiter = createRateLimiter({ max: 5, windowMs: 10 * 60_000, lockMs: 10 * 60_000 });

function clientKey(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function sessionClient(req: NextRequest, res: NextResponse) {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: list => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)),
    },
  });
}

export async function POST(req: NextRequest) {
  const key = clientKey(req);
  const gate = limiter.check(key);
  if (!gate.allowed) {
    return NextResponse.json({ error: 'locked', retryAfterSeconds: Math.ceil(gate.retryAfterMs / 1000) }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const pin = typeof body?.pin === 'string' ? body.pin : '';
  if (!/^\d{4}$/.test(pin)) return NextResponse.json({ error: 'invalid' }, { status: 400 });

  const hashes = await loadPinHashes();
  if (!hashes.admin && !hashes.staff) return NextResponse.json({ error: 'no-pin' }, { status: 503 });

  const level = await resolvePinLevel(pin, hashes);
  if (!level) {
    const remaining = limiter.fail(key);
    logger.warn({ remaining }, 'Admin PIN mismatch');
    return NextResponse.json({ error: 'mismatch', remaining }, { status: 401 });
  }
  limiter.reset(key);

  const account = SHARED_ACCOUNTS[level];
  const password = process.env[account.passwordEnv];
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!password || !secret) {
    logger.error({ level }, 'Admin session env missing');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }

  const res = NextResponse.json({ level });
  const supabase = sessionClient(req, res);
  await supabase.auth.signOut(); // upgrade path: drop the staff session first
  const { error } = await supabase.auth.signInWithPassword({ email: account.email, password });
  if (error) {
    logger.error({ error, level }, 'Shared account sign-in failed');
    return NextResponse.json({ error: 'config' }, { status: 500 });
  }
  res.cookies.set(STAMP_COOKIE, await signStamp(Date.now(), secret), stampCookieOptions());
  logger.info({ level }, 'Admin session started');
  return res;
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  await sessionClient(req, res).auth.signOut();
  res.cookies.set(STAMP_COOKIE, '', { ...stampCookieOptions(), maxAge: 0 });
  return res;
}
```

In `src/app/api/auth/staff-auth/route.ts`, replace the final success return (currently `return NextResponse.json({ user: safeUser, ... }, { status: 200, headers: response.headers })`) with:

```ts
    const ok = NextResponse.json({ user: safeUser, message: 'Login successful' }, { status: 200, headers: response.headers });
    if (process.env.ADMIN_SESSION_SECRET) {
      ok.cookies.set(STAMP_COOKIE, await signStamp(Date.now(), process.env.ADMIN_SESSION_SECRET), stampCookieOptions());
    }
    return ok;
```

and add the import `import { STAMP_COOKIE, signStamp, stampCookieOptions } from '@/lib/admin/session-stamp';`.

Add to `env.example`:

```
# Admin shell (one PIN login). Never commit real values.
STAFF_ACCOUNT_PASSWORD=
ADMIN_ACCOUNT_PASSWORD=
ADMIN_SESSION_SECRET=
```

- [ ] **Step 7: Type-check the route**

Run: `pnpm exec tsc --noEmit -p . 2>&1 | grep -E "src/(lib/admin|app/api/admin/session|app/api/auth/staff-auth)" || echo clean`
Expected: `clean`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/admin/pin-login.ts src/lib/admin/rate-limit.ts src/lib/admin/shared-accounts.ts src/app/api/admin/session/route.ts src/app/api/auth/staff-auth/route.ts env.example tests/admin/pin-login.test.ts tests/admin/rate-limit.test.ts
git diff --cached --stat
git commit -m "✨ feat: PIN session endpoint with admin-first match and rate limit"
```

---

### Task 5: Middleware gates

**Files:**
- Create: `src/lib/admin/access.ts`
- Modify: `middleware.ts` (editor block lines 11-24; admin block lines 56-80; matcher lines 155-165)
- Test: `tests/admin/access.test.ts`

**Interfaces:**
- Consumes: `levelForPath`, `roleToLevel`, `safeNext` (Task 1); `apiLevelForPath` (Task 2); `readStamp`, `MAX_SESSION_MS`, `STAMP_COOKIE` (Task 3).
- Produces:
  - `decidePageAccess(i: { pathname: string; role: string | null; startedAt: number | null; now: number }): { kind: 'allow' } | { kind: 'login'; to: string } | { kind: 'upgrade' }`
  - `decideApiAccess(i: { pathname: string; method?: string; role: string | null; signedIn: boolean; startedAt: number | null; now: number }): { kind: 'allow' } | { kind: 'deny'; status: 401 | 403 }`

`upgrade` means "let the request through; the page renders the admin PIN prompt" (the shell layout handles it in Task 7), so middleware treats `upgrade` as allow.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { decidePageAccess, decideApiAccess } from '@/lib/admin/access';

const now = 1_000_000_000_000;
const fresh = now - 60_000;
const stale = now - 13 * 60 * 60 * 1000;

describe('decidePageAccess', () => {
  it('login page is always allowed', () => {
    expect(decidePageAccess({ pathname: '/admin/login', role: null, startedAt: null, now })).toEqual({ kind: 'allow' });
  });
  it('no session goes to login with a return path', () => {
    expect(decidePageAccess({ pathname: '/admin/parties', role: null, startedAt: null, now })).toEqual({ kind: 'login', to: '/admin/parties' });
  });
  it('customer role goes to login', () => {
    expect(decidePageAccess({ pathname: '/admin', role: 'customer', startedAt: fresh, now }).kind).toBe('login');
  });
  it('missing or stale stamp goes to login', () => {
    expect(decidePageAccess({ pathname: '/admin', role: 'staff', startedAt: null, now }).kind).toBe('login');
    expect(decidePageAccess({ pathname: '/admin', role: 'admin', startedAt: stale, now }).kind).toBe('login');
  });
  it('staff on a staff page is allowed, on an owner page gets upgrade', () => {
    expect(decidePageAccess({ pathname: '/admin/parties', role: 'staff', startedAt: fresh, now })).toEqual({ kind: 'allow' });
    expect(decidePageAccess({ pathname: '/admin/reports', role: 'staff', startedAt: fresh, now })).toEqual({ kind: 'upgrade' });
  });
  it('staff on the editor goes to login (static page cannot render a prompt)', () => {
    expect(decidePageAccess({ pathname: '/editor', role: 'staff', startedAt: fresh, now })).toEqual({ kind: 'login', to: '/admin/settings' });
  });
  it('admin is allowed everywhere', () => {
    expect(decidePageAccess({ pathname: '/admin/reports', role: 'admin', startedAt: fresh, now })).toEqual({ kind: 'allow' });
    expect(decidePageAccess({ pathname: '/editor', role: 'admin', startedAt: fresh, now })).toEqual({ kind: 'allow' });
  });
});

describe('decideApiAccess', () => {
  const base = { signedIn: true, startedAt: fresh, now };
  it('passes through non-admin APIs', () => {
    expect(decideApiAccess({ ...base, pathname: '/api/pos/customers', role: null, signedIn: false })).toEqual({ kind: 'allow' });
  });
  it('401 without a session or stamp', () => {
    expect(decideApiAccess({ ...base, pathname: '/api/admin/customers', role: null, signedIn: false })).toEqual({ kind: 'deny', status: 401 });
    expect(decideApiAccess({ ...base, pathname: '/api/admin/customers', role: 'staff', startedAt: null })).toEqual({ kind: 'deny', status: 401 });
    expect(decideApiAccess({ ...base, pathname: '/api/admin/customers', role: 'staff', startedAt: stale })).toEqual({ kind: 'deny', status: 401 });
  });
  it('403 for staff on admin APIs and for customers on staff APIs', () => {
    expect(decideApiAccess({ ...base, pathname: '/api/admin/reports/revenue', role: 'staff' })).toEqual({ kind: 'deny', status: 403 });
    expect(decideApiAccess({ ...base, pathname: '/api/admin/customers', role: 'customer' })).toEqual({ kind: 'deny', status: 403 });
  });
  it('allows the right levels', () => {
    expect(decideApiAccess({ ...base, pathname: '/api/admin/customers', role: 'staff' })).toEqual({ kind: 'allow' });
    expect(decideApiAccess({ ...base, pathname: '/api/admin/reports/revenue', role: 'admin' })).toEqual({ kind: 'allow' });
  });
  it('signed-in exemption lets a customer through without a stamp, but not an anonymous caller', () => {
    const p = '/api/admin/group-booking/assign-children';
    expect(decideApiAccess({ pathname: p, role: 'customer', signedIn: true, startedAt: null, now })).toEqual({ kind: 'allow' });
    expect(decideApiAccess({ pathname: p, role: null, signedIn: false, startedAt: null, now })).toEqual({ kind: 'deny', status: 401 });
  });
  it('kiosk settings reads pass with no session; writes do not', () => {
    expect(decideApiAccess({ pathname: '/api/settings/pos-mode', method: 'GET', role: null, signedIn: false, startedAt: null, now })).toEqual({ kind: 'allow' });
    expect(decideApiAccess({ pathname: '/api/settings/pos-mode', method: 'POST', role: null, signedIn: false, startedAt: null, now })).toEqual({ kind: 'deny', status: 401 });
  });
  it('self exemption is always passed to the route', () => {
    expect(decideApiAccess({ pathname: '/api/admin/gift-cards/send-reminders', role: null, signedIn: false, startedAt: null, now })).toEqual({ kind: 'allow' });
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/admin/access.ts`**

```ts
import { levelForPath, roleToLevel } from './nav';
import { apiLevelForPath } from './api-access';
import { MAX_SESSION_MS } from './session-stamp';

type PageDecision = { kind: 'allow' } | { kind: 'login'; to: string } | { kind: 'upgrade' };
type ApiDecision = { kind: 'allow' } | { kind: 'deny'; status: 401 | 403 };

const live = (startedAt: number | null, now: number) => startedAt !== null && now - startedAt < MAX_SESSION_MS && startedAt <= now;

export function decidePageAccess(i: { pathname: string; role: string | null; startedAt: number | null; now: number }): PageDecision {
  if (i.pathname === '/admin/login' || i.pathname.startsWith('/admin/login/')) return { kind: 'allow' };
  const level = roleToLevel(i.role);
  const isEditor = i.pathname === '/editor' || i.pathname.startsWith('/editor/');
  const to = isEditor ? '/admin/settings' : i.pathname;
  if (!level || !live(i.startedAt, i.now)) return { kind: 'login', to };
  if (levelForPath(i.pathname) === 'admin' && level !== 'admin') {
    return isEditor ? { kind: 'login', to } : { kind: 'upgrade' };
  }
  return { kind: 'allow' };
}

export function decideApiAccess(i: { pathname: string; method?: string; role: string | null; signedIn: boolean; startedAt: number | null; now: number }): ApiDecision {
  const need = apiLevelForPath(i.pathname, i.method);
  if (need === null || need === 'self') return { kind: 'allow' };
  if (need === 'signed-in') return i.signedIn ? { kind: 'allow' } : { kind: 'deny', status: 401 };
  if (!i.signedIn) return { kind: 'deny', status: 401 };
  const level = roleToLevel(i.role);
  if (!level) return { kind: 'deny', status: 403 };
  if (!live(i.startedAt, i.now)) return { kind: 'deny', status: 401 };
  if (need === 'admin' && level !== 'admin') return { kind: 'deny', status: 403 };
  return { kind: 'allow' };
}
```

- [ ] **Step 4: Run to verify it passes** → PASS.

- [ ] **Step 5: Wire into `middleware.ts`**

1. Change the matcher so `/api/admin` and `/api/settings` enter middleware while other APIs stay out:

```ts
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/api/admin/:path*',
    '/api/settings/:path*',
    '/api/settings',
  ],
};
```

2. Move the `/editor` rewrite block **below** the Supabase client creation so the editor can be gated. Replace the existing `/admin` block (lines 56-80, the one that redirects to `/auth/staff`) and add the API gate. After `await supabase.auth.getUser();`:

```ts
  const { data: { user } } = await supabase.auth.getUser();
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const isEditor = pathname === '/editor' || pathname.startsWith('/editor/');
  const isGuardedApi = pathname.startsWith('/api/admin') || pathname.startsWith('/api/settings');

  if (isAdminPage || isEditor || isGuardedApi) {
    let role: string | null = null;
    if (user) {
      const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
      role = data?.role ?? null;
    }
    const secret = process.env.ADMIN_SESSION_SECRET;
    const startedAt = secret ? await readStamp(request.cookies.get(STAMP_COOKIE)?.value, secret) : null;
    const now = Date.now();

    if (isGuardedApi) {
      const d = decideApiAccess({ pathname, method: request.method, role, signedIn: !!user, startedAt, now });
      if (d.kind === 'deny') {
        return NextResponse.json({ error: d.status === 401 ? 'session-ended' : 'forbidden' }, { status: d.status });
      }
      return response;
    }

    const d = decidePageAccess({ pathname, role, startedAt, now });
    if (d.kind === 'login') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.search = `?to=${encodeURIComponent(d.to)}`;
      const redirect = NextResponse.redirect(url);
      response.cookies.getAll().forEach(c => redirect.cookies.set(c));
      return redirect;
    }

    if (isEditor) {
      const url = request.nextUrl.clone();
      if (pathname === '/editor' || pathname === '/editor/') {
        url.pathname = '/editor/index.html';
        return NextResponse.rewrite(url);
      }
      return response;
    }
    return response;
  }
```

Add imports at the top:

```ts
import { decidePageAccess, decideApiAccess } from '@/lib/admin/access';
import { readStamp, STAMP_COOKIE } from '@/lib/admin/session-stamp';
```

Delete the old `if (pathname.startsWith('/editor')) { ... }` block at the top of the function and the old `if (url.pathname.startsWith('/admin')) { ... }` block. Keep the `/staff` and `/customer` blocks unchanged, but they now read `user` from the single `getUser()` above: replace their inner `const { data: { user } } = await supabase.auth.getUser();` with nothing (reuse `user`).

- [ ] **Step 6: Manual check**

Run `pnpm dev`, then:
- `curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/admin/customers` → `401`
- `curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/admin/reports/overview` → `401`
- `curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/api/pos/customers` → whatever it returned before this change (compare against `git stash`-free baseline by checking the route's own code: unchanged)
- `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" localhost:3000/admin/parties` → `307 .../admin/login?to=%2Fadmin%2Fparties`

- [ ] **Step 7: Commit**

```bash
git add src/lib/admin/access.ts tests/admin/access.test.ts middleware.ts
git diff --cached --stat
git commit -m "✨ feat: one gate for admin pages, editor and admin APIs"
```

---

### Task 6: Login screen and PIN pad

**Files:**
- Create: `src/components/admin/shell/PinPad.tsx`
- Create: `src/app/admin/login/page.tsx`

**Interfaces:**
- Consumes: `POST /api/admin/session`, `safeNext`.
- Produces: `<PinPad title: string; subtitle?: string; onSuccess: (level: Level) => void />` (client component; posts the PIN itself and renders every error state).

- [ ] **Step 1: Implement `PinPad`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { Delete } from 'lucide-react';
import type { Level } from '@/lib/admin/nav';
import { cn } from '@/lib/utils';

type Props = { title: string; subtitle?: string; onSuccess: (level: Level) => void };

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;

export function PinPad({ title, subtitle, onSuccess }: Props) {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);

  async function submit(code: string) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return onSuccess(data.level);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      if (res.status === 429) setMessage(`Too many tries. Try again in ${Math.ceil((data.retryAfterSeconds ?? 600) / 60)} minutes.`);
      else if (res.status === 503) setMessage('No staff PIN is set yet. Ask the owner to set one in Settings.');
      else if (res.status === 401) setMessage(data.remaining <= 2 ? `That code didn't match. ${data.remaining} tries left.` : "That code didn't match.");
      else setMessage('Something went wrong. Please try again.');
    } catch {
      setMessage('Could not reach the server. Check the connection and try again.');
    } finally {
      setPin('');
      setBusy(false);
    }
  }

  function press(k: string) {
    if (busy) return;
    if (k === 'del') return setPin(p => p.slice(0, -1));
    if (!k) return;
    setPin(p => {
      const next = (p + k).slice(0, 4);
      if (next.length === 4) void submit(next);
      return next;
    });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="w-full max-w-xs mx-auto text-center font-[Arial,sans-serif]">
      <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-charcoal/70">{subtitle}</p>}
      <div className={cn('mt-6 flex justify-center gap-3', shake && 'animate-[shake_0.4s]')} aria-label={`${pin.length} of 4 digits entered`}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} className={cn('h-4 w-4 rounded-full border-2 border-charcoal', i < pin.length && 'bg-honey border-honey')} />
        ))}
      </div>
      <p role="alert" className="mt-4 min-h-5 text-sm text-red-700">{message}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {KEYS.map((k, i) =>
          k === '' ? <span key={i} /> : (
            <button
              key={i}
              type="button"
              disabled={busy}
              onClick={() => press(k)}
              aria-label={k === 'del' ? 'Delete' : k}
              className="h-16 rounded-2xl bg-white text-2xl font-semibold text-charcoal shadow-sm ring-1 ring-charcoal/10 active:scale-95 disabled:opacity-50"
            >
              {k === 'del' ? <Delete className="mx-auto h-6 w-6" /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
```

Add the shake keyframes to `src/app/globals.css`:

```css
@keyframes shake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-6px) } 75% { transform: translateX(6px) } }
```

- [ ] **Step 2: Implement `src/app/admin/login/page.tsx`**

```tsx
'use client';

import { Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { PinPad } from '@/components/admin/shell/PinPad';
import { safeNext } from '@/lib/admin/nav';

function Login() {
  const router = useRouter();
  const to = safeNext(useSearchParams().get('to'));
  return (
    <main className="min-h-screen bg-pastel/40 flex flex-col items-center justify-center px-4">
      <Image src="/images/logo.png" alt="Busy Bees" width={96} height={96} className="mb-6" />
      <PinPad
        title="Staff sign in"
        subtitle="Enter the staff or admin code"
        onSuccess={() => { router.replace(to); router.refresh(); }}
      />
    </main>
  );
}

export default function Page() {
  return <Suspense><Login /></Suspense>;
}
```

Before writing, confirm the logo path: `ls public/images | grep -i logo`. Use the file the public `Header.tsx` uses (`grep -n "logo" src/components/layout/Header.tsx`).

- [ ] **Step 3: Manual check**

`pnpm dev`, open `/admin/login`. With no hashes set in the local DB, entering any 4 digits shows "No staff PIN is set yet...". (Hashes get set in Task 11; for local testing now, run the setup script from Task 11 Step 1 against your dev database if it exists, or insert test hashes for `1234`/`5678` directly in the local `settings` table.)

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/shell/PinPad.tsx src/app/admin/login/page.tsx src/app/globals.css
git diff --cached --stat
git commit -m "✨ feat: PIN pad login screen"
```

---

### Task 7: Shell layout, sidebar, mobile drawer, upgrade prompt

**Files:**
- Create: `src/lib/admin/guard.ts`
- Create: `src/components/admin/shell/AdminSidebar.tsx`
- Create: `src/components/admin/shell/AdminPageHeader.tsx`
- Create: `src/components/admin/shell/UpgradePrompt.tsx`
- Create: `src/app/admin/(shell)/layout.tsx`

**Interfaces:**
- Consumes: `navFor`, `levelForPath`, `roleToLevel`, `Level`, `PinPad`.
- Produces:
  - `getAdminLevel(): Promise<Level | null>` (server; reads the Supabase user and `users.role`)
  - `<AdminSidebar level: Level />` (client)
  - `<AdminPageHeader title: string; description?: string; actions?: ReactNode />`
  - `<UpgradePrompt />` (client; renders PinPad, refreshes on success)

- [ ] **Step 1: `src/lib/admin/guard.ts`**

```ts
import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { roleToLevel, type Level } from './nav';

export const getAdminLevel = cache(async (): Promise<Level | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
  return roleToLevel(data?.role);
});
```

If `server-only` is not installed, run `pnpm add server-only`.

- [ ] **Step 2: `AdminSidebar.tsx`**

```tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, Globe, Lock, LogOut, Menu, X } from 'lucide-react';
import { navFor, type Level } from '@/lib/admin/nav';
import { cn } from '@/lib/utils';

function activeHref(pathname: string, hrefs: string[]): string | null {
  if (pathname === '/admin') return '/admin';
  return hrefs
    .filter(h => h !== '/admin' && (pathname === h || pathname.startsWith(h + '/')))
    .sort((a, b) => b.length - a.length)[0] ?? null;
}

export function AdminSidebar({ level }: { level: Level }) {
  const pathname = usePathname();
  const router = useRouter();
  const groups = useMemo(() => navFor(level), [level]);
  const active = activeHref(pathname, groups.flatMap(g => g.items.map(i => i.href)));
  const activeGroup = groups.find(g => g.items.some(i => i.href === active))?.id ?? groups[0].id;
  const [open, setOpen] = useState(activeGroup);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => { setOpen(activeGroup); setDrawer(false); }, [activeGroup, pathname]);

  async function lock() {
    await fetch('/api/admin/session', { method: 'DELETE' });
    router.replace('/admin/login');
    router.refresh();
  }

  const nav = (
    <nav className="flex h-full flex-col bg-charcoal text-white font-[Arial,sans-serif]">
      <div className="flex items-center gap-3 px-4 py-4">
        <Image src="/images/logo.png" alt="" width={36} height={36} />
        <span className="font-bold">Busy Bees</span>
      </div>
      <Link href="/" className="mx-3 mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10">
        <Globe className="h-4 w-4" /> View website
      </Link>
      <div className="flex-1 overflow-y-auto px-2">
        {groups.map(g => {
          const isOpen = open === g.id;
          const Icon = g.icon;
          return (
            <div key={g.id} className="mb-1">
              <button
                type="button"
                onClick={() => setOpen(isOpen ? '' : g.id)}
                aria-expanded={isOpen}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold uppercase tracking-wide text-white/70 hover:bg-white/10"
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1">{g.label}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
              </button>
              <div className={cn('grid transition-[grid-template-rows] duration-200', isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')} inert={!isOpen}>
                <ul className="overflow-hidden">
                  {g.items.map(i => {
                    const ItemIcon = i.icon;
                    const isActive = i.href === active;
                    return (
                      <li key={i.id}>
                        <Link
                          href={i.href}
                          target={i.external ? '_blank' : undefined}
                          aria-current={isActive ? 'page' : undefined}
                          className={cn(
                            'ml-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
                            isActive ? 'bg-honey text-charcoal font-semibold' : 'text-white/90 hover:bg-white/10',
                          )}
                        >
                          <ItemIcon className="h-4 w-4" />
                          <span className="flex-1">{i.label}</span>
                          {i.locked && <Lock className="h-3.5 w-3.5 opacity-70" aria-label="Needs admin code" />}
                          {i.external && <ExternalLink className="h-3.5 w-3.5 opacity-70" aria-label="Opens in a new tab" />}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
      <div className="border-t border-white/10 px-4 py-3 text-sm">
        <div className="mb-2 text-white/60">Signed in as {level === 'admin' ? 'Admin' : 'Staff'}</div>
        <button type="button" onClick={lock} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/10">
          <LogOut className="h-4 w-4" /> Lock
        </button>
      </div>
    </nav>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 lg:block">{nav}</aside>
      <div className="sticky top-0 z-30 flex items-center gap-3 bg-charcoal px-4 py-3 text-white lg:hidden">
        <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu"><Menu className="h-6 w-6" /></button>
        <span className="font-bold font-[Arial,sans-serif]">Busy Bees</span>
      </div>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute right-3 top-4 z-10 text-white"><X className="h-6 w-6" /></button>
            {nav}
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: `AdminPageHeader.tsx`**

```tsx
import type { ReactNode } from 'react';

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-charcoal/10 pb-4">
      <div>
        <h1 className="text-2xl font-bold text-charcoal">{title}</h1>
        {description && <p className="mt-1 text-sm text-charcoal/70">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </header>
  );
}
```

- [ ] **Step 4: `UpgradePrompt.tsx`**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { PinPad } from './PinPad';

export function UpgradePrompt() {
  const router = useRouter();
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <PinPad title="Owner area" subtitle="Enter the admin code to open this page" onSuccess={() => router.refresh()} />
    </div>
  );
}
```

- [ ] **Step 5: `src/app/admin/(shell)/layout.tsx`**

```tsx
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/shell/AdminSidebar';
import { UpgradePrompt } from '@/components/admin/shell/UpgradePrompt';
import { getAdminLevel } from '@/lib/admin/guard';
import { levelForPath } from '@/lib/admin/nav';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const level = await getAdminLevel();
  if (!level) redirect('/admin/login');
  const pathname = (await headers()).get('x-pathname') ?? '/admin';
  const needsUpgrade = levelForPath(pathname) === 'admin' && level !== 'admin';

  return (
    <div className="min-h-screen bg-gray-50 font-[Arial,sans-serif]">
      <AdminSidebar level={level} />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">{needsUpgrade ? <UpgradePrompt /> : children}</div>
      </main>
    </div>
  );
}
```

Layouts do not receive the pathname, so middleware must pass it. In `middleware.ts`, in the `isAdminPage` allow path (both `allow` and `upgrade`), set the header on the forwarded request before returning. Replace the final `return response;` of the admin-page branch with:

```ts
    const fwdHeaders = new Headers(request.headers);
    fwdHeaders.set('x-pathname', pathname);
    const forwarded = NextResponse.next({ request: { headers: fwdHeaders } });
    response.cookies.getAll().forEach(c => forwarded.cookies.set(c));
    return forwarded;
```

- [ ] **Step 6: Manual check**

With test hashes in the local DB (`1234` staff, `5678` admin): sign in with `1234` → `/admin` shows the sidebar with lock icons on Owner items; open `/admin/reports` → upgrade prompt; enter `5678` → page renders, lock icons gone. Resize to 375px wide → hamburger opens the drawer; tapping a link closes it. Tap Lock → back to login; `/admin` redirects to login.

- [ ] **Step 7: Commit**

```bash
git add src/lib/admin/guard.ts src/components/admin/shell/AdminSidebar.tsx src/components/admin/shell/AdminPageHeader.tsx src/components/admin/shell/UpgradePrompt.tsx "src/app/admin/(shell)/layout.tsx" middleware.ts package.json pnpm-lock.yaml
git diff --cached --stat
git commit -m "✨ feat: sidebar shell with accordion groups, mobile drawer and owner upgrade prompt"
```

---

### Task 8: Move the existing admin pages into the shell and drop their PIN screens

**Files:**
- Move: `src/app/admin/{parties,events,after-dark,reports,discounts}/page.tsx` → `src/app/admin/(shell)/{same}/page.tsx` (and `parties/README.md`)
- Modify each moved page as below.

**Interfaces:**
- Consumes: `AdminPageHeader`.

- [ ] **Step 1: Move with history**

```bash
mkdir -p "src/app/admin/(shell)"
for d in parties events after-dark reports discounts; do git mv "src/app/admin/$d" "src/app/admin/(shell)/$d"; done
```

- [ ] **Step 2: Remove the PIN screen from `parties`, `events`, `after-dark`**

In each file:
1. Delete the `isUnlocked` state, the PIN input state, the handler that POSTs to `/api/auth/staff-login`, and the `if (!isUnlocked) { return (...PIN screen...) }` block. (parties: state at line 56, handler around 858, block at 899; events: 26 / 271 / 321; after-dark: 15 / 27 / 57.)
2. Any `useEffect` that loads data only `if (isUnlocked)` (parties line 171, events line 66): drop the condition so it loads on mount, keeping the dependency list `[]`.
3. Replace the page's own top header/title bar with `<AdminPageHeader title="Parties" description="Bookings, guests and discounts" />` (Events: `"Events"`, `"Create and manage events"`; After Dark: `"After Dark"`, `"Attendees, movies, waivers and refunds"`). Keep any action buttons the old header had by passing them through `actions`.
4. Remove any full-screen wrapper background/min-h-screen on the outermost element; the shell provides it.

- [ ] **Step 3: Remove the admin PIN screen from `reports`**

Delete `isUnlocked`, the handler calling `/api/admin/check-admin-pin` (line 29), and the `if (!isUnlocked)` block (line 60). Render `<AdminPageHeader title="Reports" description="Revenue, sessions, passes, parties and marketing" />` above `<ReportsDashboard />`. The shell's upgrade prompt now covers staff.

- [ ] **Step 4: `discounts`**

Remove its 401/403 probe and "Return to POS" buttons; render `<AdminPageHeader title="Sibling Discounts" />` above `<SiblingDiscountManager />`.

- [ ] **Step 5: Handle 401 in the moved pages**

Where each page's fetch helper treats a non-OK response as empty data, add: `if (res.status === 401) { window.location.href = '/admin/login?to=' + encodeURIComponent(location.pathname); return; }`. Find them with `grep -n "fetch('/api/admin" "src/app/admin/(shell)/"*/page.tsx`.

- [ ] **Step 6: Verify**

```bash
grep -rn "staff-login\|check-admin-pin\|isUnlocked" "src/app/admin/(shell)" && echo "LEFTOVERS" || echo "clean"
pnpm test
pnpm exec tsc --noEmit -p . 2>&1 | grep "src/app/admin" || echo "types clean"
```

Expected: `clean`, tests pass, `types clean`. Then `pnpm dev` and click each of the five pages from the sidebar as staff (Reports asks for the admin code) and confirm data loads with no PIN screen.

- [ ] **Step 7: Commit**

```bash
git add -A "src/app/admin"
git diff --cached --stat
git commit -m "♻️ refactor: existing admin pages live in the shell, per-page PIN screens removed"
```

---

### Task 9: Bridge the views still inside AdminPanel

**Files:**
- Create: `src/hooks/usePosCatalog.ts`
- Modify: `src/app/pos/page.tsx:140-345` (use the hook)
- Modify: `src/components/pos/AdminPanel.tsx:127-141, 189` (add `initialView`, `hideViewNav` props)
- Create: `src/components/admin/AdminPanelBridge.tsx`
- Create: `src/app/admin/(shell)/page.tsx`, `src/app/admin/(shell)/[view]/page.tsx`

**Interfaces:**
- Consumes: `BRIDGED_VIEWS`, `AdminView` (Task 1), `getAdminLevel` (Task 7).
- Produces:
  - `usePosCatalog(opts: { loadCustomers: boolean }): { customers, setCustomers, promos, setPromos, passes, setPasses, parties, setParties, products, setProducts, volumeDiscounts, setVolumeDiscounts, refreshCustomers: () => Promise<void> }`
  - `<AdminPanelBridge view: AdminView; userRole: 'staff' | 'admin' />`
  - `AdminPanel` new optional props `initialView?: AdminView`, `hideViewNav?: boolean`

- [ ] **Step 1: Extract the loaders into `usePosCatalog`**

Move, verbatim, from `src/app/pos/page.tsx` into `src/hooks/usePosCatalog.ts`:
- the six `useState` declarations for `promos`, `passes`, `parties`, `products`, `volumeDiscounts`, `customers`;
- the promo-loading effect (reads `getPromosFromStorage`, falls back to `INITIAL_PROMOS`, checks `PROMO_VERSION`), and the promo save effect if present;
- the `loadPasses`, `loadParties`, `loadProducts` effects;
- the volume discount load and save effects;
- `fetchCustomers` (renamed `refreshCustomers`), and run it on mount only when `opts.loadCustomers` is true.

```ts
'use client';

import { useCallback, useEffect, useState } from 'react';
import { logger } from '@/lib/client-logger';
// + the same imports page.tsx uses for these (promoHelpers, promoConstants, productHelpers, lib/api/products)

export function usePosCatalog(opts: { loadCustomers: boolean }) {
  // ...moved state + effects...
  useEffect(() => { if (opts.loadCustomers) void refreshCustomers(); }, [opts.loadCustomers, refreshCustomers]);
  return { customers, setCustomers, promos, setPromos, passes, setPasses, parties, setParties, products, setProducts, volumeDiscounts, setVolumeDiscounts, refreshCustomers };
}
```

In `src/app/pos/page.tsx`, replace the moved code with:

```ts
const {
  customers, setCustomers, promos, setPromos, passes, setPasses, parties, setParties,
  products, setProducts, volumeDiscounts, setVolumeDiscounts, refreshCustomers: fetchCustomers,
} = usePosCatalog({ loadCustomers: false });
```

and keep the existing effect that calls `fetchCustomers()` when `isStaffMode && currentView === "admin"`.

- [ ] **Step 2: Verify the POS still loads**

`pnpm dev`, open `/pos`, unlock with the kiosk code, confirm passes, parties and products render as before; enter staff mode with a phone login and open Admin; confirm the customer list loads.

- [ ] **Step 3: Add the AdminPanel props**

In `AdminPanelProps` add:

```ts
  initialView?: AdminView;
  hideViewNav?: boolean;
```

Destructure them, change line 189 to `useState<AdminView>(initialView ?? 'dashboard')`, and wrap the horizontal view button row (around lines 5560-5690) and the "Quick Access" block (around 5715-5826) in `{!hideViewNav && ( ... )}`. Export the `AdminView` type or import it from `@/lib/admin/nav` (identical union) so both agree; prefer `import type { AdminView } from '@/lib/admin/nav'` and delete the local declaration.

- [ ] **Step 4: `AdminPanelBridge.tsx`**

```tsx
'use client';

import { AdminPanel } from '@/components/pos/AdminPanel';
import { usePosCatalog } from '@/hooks/usePosCatalog';
import type { AdminView } from '@/lib/admin/nav';

export function AdminPanelBridge({ view, userRole }: { view: AdminView; userRole: 'staff' | 'admin' }) {
  const c = usePosCatalog({ loadCustomers: true });
  return (
    <AdminPanel
      key={view}
      initialView={view}
      hideViewNav
      userRole={userRole}
      customers={c.customers} onUpdateCustomers={c.setCustomers}
      promos={c.promos} onUpdatePromos={c.setPromos}
      passes={c.passes} onUpdatePasses={c.setPasses}
      parties={c.parties} onUpdateParties={c.setParties}
      products={c.products} onUpdateProducts={c.setProducts}
      volumeDiscounts={c.volumeDiscounts} onUpdateVolumeDiscounts={c.setVolumeDiscounts}
    />
  );
}
```

- [ ] **Step 5: Bridge routes**

`src/app/admin/(shell)/page.tsx`:

```tsx
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';
import { AdminPanelBridge } from '@/components/admin/AdminPanelBridge';
import { getAdminLevel } from '@/lib/admin/guard';

export default async function Today() {
  const level = (await getAdminLevel()) ?? 'staff';
  return (
    <>
      <AdminPageHeader title="Today" />
      <AdminPanelBridge view="dashboard" userRole={level} />
    </>
  );
}
```

`src/app/admin/(shell)/[view]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';
import { AdminPanelBridge } from '@/components/admin/AdminPanelBridge';
import { getAdminLevel } from '@/lib/admin/guard';
import { BRIDGED_VIEWS, NAV } from '@/lib/admin/nav';

export default async function BridgedView({ params }: { params: Promise<{ view: string }> }) {
  const { view: slug } = await params;
  const view = BRIDGED_VIEWS[slug];
  if (!view) notFound();
  const title = NAV.flatMap(g => g.items).find(i => i.href === `/admin/${slug}`)?.label ?? slug;
  const level = (await getAdminLevel()) ?? 'staff';
  return (
    <>
      <AdminPageHeader title={title} />
      <AdminPanelBridge view={view} userRole={level} />
    </>
  );
}
```

Static folders (`parties`, `events`, `after-dark`, `reports`, `discounts`, `login`) take precedence over `[view]`, so they are unaffected.

- [ ] **Step 6: Verify every sidebar link**

`pnpm dev`, sign in as admin, click every sidebar item. Each bridged item shows its AdminPanel view with no horizontal button row and no Quick Access cards. Note any view that errors and fix before committing.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/usePosCatalog.ts src/app/pos/page.tsx src/components/pos/AdminPanel.tsx src/components/admin/AdminPanelBridge.tsx "src/app/admin/(shell)/page.tsx" "src/app/admin/(shell)/[view]/page.tsx"
git diff --cached --stat
git commit -m "✨ feat: every sidebar item opens, bridging views still inside AdminPanel"
```

---

### Task 10: Remove hardcoded fallbacks, retire the old PIN routes, add PIN changes

**Files:**
- Delete: `src/app/api/admin/check-admin-pin/route.ts`
- Modify: `src/app/api/auth/staff-login/route.ts` (return 410 Gone; full deletion in Plan 2 once no caller remains)
- Modify: `src/app/api/admin/gift-cards/send-reminders/route.ts:22-38`
- Modify: `src/app/api/editor/auth/route.ts` (fail closed when env missing)
- Create: `src/app/api/admin/pins/route.ts`
- Create: `src/app/admin/(shell)/settings/page.tsx`, `src/app/admin/(shell)/settings/AccessCodesCard.tsx`
- Test: `tests/admin/no-hardcoded-secrets.test.ts`

**Interfaces:**
- Consumes: `hashPin`, `getAdminLevel`, `BRIDGED_VIEWS`.
- Produces: `POST /api/admin/pins` body `{ kind: 'staff' | 'admin', pin: string }` → `200` | `400` | `403`.

- [ ] **Step 1: Write the failing guard test**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const files = [
  'src/app/api/auth/staff-login/route.ts',
  'src/app/api/editor/auth/route.ts',
  'src/app/api/admin/gift-cards/send-reminders/route.ts',
];

describe('no hardcoded access secrets', () => {
  it('has no default PIN, password or JWT secret literals', () => {
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/DEFAULT_STAFF_PIN/);
      expect(src, f).not.toMatch(/process\.env\.\w+\s*(\|\||\?\?)\s*['"`]/); // env fallback literal
      expect(src, f).not.toMatch(/\.eq\('key',\s*'(admin_pin|staff_pin)'\)/);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails** → FAIL on all three files.

- [ ] **Step 3: Make the changes**

`staff-login/route.ts`: replace the whole file with:

```ts
import { NextResponse } from 'next/server';

/** Retired: sign in through /admin/login. Removed entirely in Plan 2. */
export function POST() {
  return NextResponse.json({ error: 'gone', use: '/admin/login' }, { status: 410 });
}
```

`send-reminders/route.ts`: replace the `x-admin-pin` branch (lines 22-38) with a session check:

```ts
    } else {
      const supabaseUser = await createClient();
      const { data: { user } } = await supabaseUser.auth.getUser();
      const { data: row } = user
        ? await supabaseUser.from('users').select('role').eq('id', user.id).single()
        : { data: null };
      if (row?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
```

and import `createClient` from `@/lib/supabase/server`.

`editor/auth/route.ts`: replace every `process.env.EDITOR_PASSWORD || '...'` and `process.env.JWT_SECRET || '...'` with the bare env read, and at the top of each handler:

```ts
  const password = process.env.EDITOR_PASSWORD;
  const secret = process.env.JWT_SECRET;
  if (!password || !secret) return NextResponse.json({ error: 'Editor not configured' }, { status: 503 });
```

(The `/editor` page is already admin-gated by middleware from Task 5; Plan 2 removes this password entirely.)

Delete `src/app/api/admin/check-admin-pin/` and remove it from `API_EXEMPTIONS`/tests if referenced (it is not). Re-run `pnpm test tests/admin/api-access.test.ts` since the route set changed.

`src/app/api/admin/pins/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server';
import { hashPin } from '@/lib/auth/pin';
import { createAdminClient } from '@/lib/supabase/server';
import { getAdminLevel } from '@/lib/admin/guard';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  if ((await getAdminLevel()) !== 'admin') return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  const pin = typeof body?.pin === 'string' ? body.pin : '';
  if ((kind !== 'staff' && kind !== 'admin') || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }
  const { error } = await createAdminClient()
    .from('settings')
    .upsert({ key: `${kind}_pin_hash`, value: await hashPin(pin), description: `bcrypt hash of the ${kind} PIN` }, { onConflict: 'key' });
  if (error) {
    logger.error({ error, kind }, 'PIN update failed');
    return NextResponse.json({ error: 'save-failed' }, { status: 500 });
  }
  logger.info({ kind }, 'PIN updated');
  return NextResponse.json({ ok: true });
}
```

`src/app/admin/(shell)/settings/AccessCodesCard.tsx`:

```tsx
'use client';

import { useState } from 'react';

export function AccessCodesCard() {
  const [status, setStatus] = useState<string | null>(null);

  async function save(kind: 'staff' | 'admin', form: HTMLFormElement) {
    const pin = (form.elements.namedItem('pin') as HTMLInputElement).value;
    const confirm = (form.elements.namedItem('confirm') as HTMLInputElement).value;
    if (!/^\d{4}$/.test(pin)) return setStatus('Codes are exactly 4 digits.');
    if (pin !== confirm) return setStatus("The two entries didn't match.");
    const res = await fetch('/api/admin/pins', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, pin }) });
    setStatus(res.ok ? `${kind === 'admin' ? 'Admin' : 'Staff'} code updated.` : 'Could not save. Please try again.');
    form.reset();
  }

  return (
    <section className="mb-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-charcoal/10">
      <h2 className="text-lg font-bold text-charcoal">Access codes</h2>
      <p className="mt-1 text-sm text-charcoal/70">The staff code opens everything except the Owner area. The admin code opens everything.</p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {(['staff', 'admin'] as const).map(kind => (
          <form key={kind} onSubmit={e => { e.preventDefault(); void save(kind, e.currentTarget); }} className="space-y-2">
            <h3 className="font-semibold">{kind === 'admin' ? 'Admin code' : 'Staff code'}</h3>
            <input name="pin" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="New code" className="w-full rounded-lg border px-3 py-2" type="password" />
            <input name="confirm" inputMode="numeric" autoComplete="off" maxLength={4} placeholder="Repeat code" className="w-full rounded-lg border px-3 py-2" type="password" />
            <button className="rounded-lg bg-honey px-4 py-2 font-semibold text-charcoal">Save</button>
          </form>
        ))}
      </div>
      <p role="status" className="mt-3 min-h-5 text-sm text-charcoal">{status}</p>
    </section>
  );
}
```

`src/app/admin/(shell)/settings/page.tsx` (static folder takes precedence over `[view]`):

```tsx
import { AdminPageHeader } from '@/components/admin/shell/AdminPageHeader';
import { AdminPanelBridge } from '@/components/admin/AdminPanelBridge';
import { AccessCodesCard } from './AccessCodesCard';

export default function SettingsPage() {
  return (
    <>
      <AdminPageHeader title="Settings" />
      <AccessCodesCard />
      <AdminPanelBridge view="settings" userRole="admin" />
    </>
  );
}
```

Remove `settings` from `BRIDGED_VIEWS` in `nav.ts` (the static page owns it now) and keep the `BRIDGED_VIEWS` test passing.

- [ ] **Step 4: Run all tests** → `pnpm test` PASS.

- [ ] **Step 5: Prove the guard test can fail**

Temporarily add `const DEFAULT_STAFF_PIN = 'x';` to `staff-login/route.ts`, run `pnpm test tests/admin/no-hardcoded-secrets.test.ts`, see it go red, remove the line.

- [ ] **Step 6: Commit**

```bash
git add -A src/app/api/admin/check-admin-pin src/app/api/auth/staff-login/route.ts src/app/api/admin/gift-cards/send-reminders/route.ts src/app/api/editor/auth/route.ts src/app/api/admin/pins/route.ts "src/app/admin/(shell)/settings" src/lib/admin/nav.ts tests/admin/no-hardcoded-secrets.test.ts
git diff --cached --stat
git commit -m "🔒 fix: drop hardcoded PIN and editor fallbacks, owner can change access codes"
```

---

### Task 11: One-time setup script

**Files:**
- Create: `scripts/admin-access-setup.ts`
- Modify: `package.json` scripts (`"admin:setup": "tsx scripts/admin-access-setup.ts"`)

**Interfaces:**
- Consumes: `SHARED_ACCOUNTS` constants (duplicate the two emails here; scripts do not import Next server modules), `hashPin`.

- [ ] **Step 1: Implement**

```ts
/**
 * One-time admin access setup. Run locally against the target Supabase project:
 *   pnpm admin:setup
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, STAFF_ACCOUNT_PASSWORD,
 * ADMIN_ACCOUNT_PASSWORD from .env.local. Prompts for the two PINs; they are never
 * written to disk or logged.
 */
import 'dotenv/config';
import { config } from 'dotenv';
import { createInterface } from 'node:readline/promises';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

config({ path: '.env.local' });

const env = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing ${k}`);
  return v;
};

const db = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

async function findUserId(email: string): Promise<string | null> {
  for (let page = 1; page <= 100; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const hit = data.users.find(u => u.email === email);
    if (hit) return hit.id;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function ensureAccount(email: string, password: string, role: 'staff' | 'admin', name: string) {
  let id = await findUserId(email);
  if (id) {
    const { error } = await db.auth.admin.updateUserById(id, { password, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name, role } });
    if (error) throw error;
    id = data.user.id;
  }
  const { error } = await db.from('users').upsert({ id, email, name, role, phone: role === 'admin' ? '0000000001' : '0000000000' }, { onConflict: 'id' });
  if (error) throw error;
  console.log(`✓ ${email} is ${role}`);
}

async function main() {
  await ensureAccount('staff@busybees.internal', env('STAFF_ACCOUNT_PASSWORD'), 'staff', 'Staff (shared)');
  await ensureAccount('admin@busybees.internal', env('ADMIN_ACCOUNT_PASSWORD'), 'admin', 'Admin (shared)');

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (q: string) => {
    const a = (await rl.question(q)).trim();
    if (!/^\d{4}$/.test(a)) throw new Error('Codes are exactly 4 digits');
    return a;
  };
  const staff = await ask('Staff code (4 digits): ');
  const admin = await ask('Admin code (4 digits): ');
  rl.close();
  if (staff === admin) throw new Error('Staff and admin codes must differ');

  const rows = [
    { key: 'staff_pin_hash', value: bcrypt.hashSync(staff, 10), description: 'bcrypt hash of the staff PIN' },
    { key: 'admin_pin_hash', value: bcrypt.hashSync(admin, 10), description: 'bcrypt hash of the admin PIN' },
  ];
  const { error } = await db.from('settings').upsert(rows, { onConflict: 'key' });
  if (error) throw error;
  console.log('✓ PIN hashes saved');

  const { error: delErr } = await db.from('settings').delete().in('key', ['staff_pin', 'admin_pin']);
  if (delErr) throw delErr;
  console.log('✓ plaintext staff_pin and admin_pin removed');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
```

Before removing plaintext keys, confirm nothing else reads them: `grep -rnE "'(staff_pin|admin_pin)'" src` must return only the lines already changed in Task 10 (none left). If any remain, stop and fix them first.

The `phone` values satisfy the `users.phone` NOT NULL constraint the existing staff-login route also relies on. Check uniqueness: `grep -n "phone" supabase/migrations/001_create_schema.sql | head`. If `phone` is UNIQUE, the two different placeholders above keep the accounts distinct.

- [ ] **Step 2: Dry check the script compiles**

Run: `pnpm exec tsc --noEmit --esModuleInterop --skipLibCheck --module nodenext --moduleResolution nodenext scripts/admin-access-setup.ts || echo "check output"`
Fix type errors only; do not run the script against production here.

- [ ] **Step 3: Commit**

```bash
git add scripts/admin-access-setup.ts package.json
git diff --cached --stat
git commit -m "🔧 chore: one-time setup for shared accounts and hashed PINs"
```

---

### Task 12: End-to-end smoke and build

**Files:**
- Create: `playwright.config.ts`, `e2e/admin-shell.spec.ts`
- Modify: `package.json` (`"e2e": "playwright test"`)

**Interfaces:**
- Consumes: everything above. Requires a dev database with test hashes for `1234` (staff) and `5678` (admin), set via Settings or `pnpm admin:setup` against a **non-production** project. E2E PINs come from env `E2E_STAFF_PIN` / `E2E_ADMIN_PIN`.

- [ ] **Step 1: Install**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000' },
  webServer: process.env.E2E_BASE_URL ? undefined : { command: 'pnpm dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000 },
});
```

Exclude `e2e/` from Vitest (already, since `include` is `tests/**`).

- [ ] **Step 2: Write the spec**

```ts
import { test, expect, type Page } from '@playwright/test';

const STAFF = process.env.E2E_STAFF_PIN!;
const ADMIN = process.env.E2E_ADMIN_PIN!;

async function enter(page: Page, pin: string) {
  for (const d of pin) await page.getByRole('button', { name: d, exact: true }).click();
}

test('staff sees everything but Owner, upgrades with the admin code', async ({ page }) => {
  await page.goto('/admin/parties');
  await expect(page).toHaveURL(/\/admin\/login\?to=%2Fadmin%2Fparties/);
  await enter(page, STAFF);
  await expect(page).toHaveURL(/\/admin\/parties$/);
  await expect(page.getByText('Signed in as Staff')).toBeVisible();

  await page.getByRole('button', { name: /Owner/ }).click();
  await page.getByRole('link', { name: 'Reports' }).click();
  await expect(page.getByText('Owner area')).toBeVisible();
  await enter(page, ADMIN);
  await expect(page.getByText('Signed in as Admin')).toBeVisible();
});

test('admin reaches every sidebar item and the session survives reload', async ({ page }) => {
  await page.goto('/admin/login');
  await enter(page, ADMIN);
  await expect(page).toHaveURL(/\/admin$/);
  const hrefs = await page.locator('aside a[href^="/admin"]').evaluateAll(as => as.map(a => a.getAttribute('href')!));
  for (const href of hrefs) {
    const res = await page.goto(href);
    expect(res?.status(), href).toBeLessThan(400);
    await expect(page.getByText('Owner area')).toHaveCount(0);
  }
  await page.reload();
  await expect(page.getByText('Signed in as Admin')).toBeVisible();
});

test('wrong code shows a message and Lock ends the session', async ({ page }) => {
  await page.goto('/admin/login');
  await enter(page, '0000');
  await expect(page.getByRole('alert')).toContainText("didn't match");
  await enter(page, ADMIN);
  await page.getByRole('button', { name: 'Lock' }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto('/admin');
  await expect(page).toHaveURL(/\/admin\/login/);
});

test('admin APIs refuse anonymous callers', async ({ request }) => {
  for (const p of ['/api/admin/customers', '/api/admin/reports/overview', '/api/admin/gift-cards', '/api/settings']) {
    const res = await request.get(p);
    expect(res.status(), p).toBe(401);
  }
});

test('mobile drawer opens and closes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/admin/login');
  await enter(page, STAFF);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('link', { name: 'Events' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/\/admin\/events$/);
});
```

The wrong-code test uses `'0000'`; if a test database's real code is `0000`, change it to any other code that is neither test PIN.

- [ ] **Step 3: Run**

Run: `E2E_STAFF_PIN=1234 E2E_ADMIN_PIN=5678 pnpm e2e`
Expected: 5 passed. The `--` wrong-code test counts one failure toward the rate limit; the limiter resets on success.

- [ ] **Step 4: Kiosk regression (Review Focus 1 and 2), manual**

1. Open `/pos` in a private window (no admin session). Unlock with the kiosk code. Sign in as a customer by phone. Buy a group-rate product with children assigned; confirm no error toast and the children appear on the booking (the `signed-in` exemption).
2. In the same POS, enter staff mode with a per-person phone login and open Admin → Customers; confirm the list loads (staff-auth now sets the stamp).
3. In the private window before any sign-in, confirm `/pos` shows the kiosk code screen (the `pos-pin` read) and check-in respects the POS mode (the `pos-mode` read).
4. Record all three results in the PR description.

- [ ] **Step 5: Build**

Run: `pnpm test && pnpm run build`
Expected: tests pass, build completes.

- [ ] **Step 6: Commit**

```bash
git add playwright.config.ts e2e/admin-shell.spec.ts package.json pnpm-lock.yaml
git diff --cached --stat
git commit -m "✅ test: end-to-end smoke for login, sidebar, upgrade, lock and API gate"
```

---

## Rollout (after merge, done by the operator)

1. In Vercel (Production + Preview), set `STAFF_ACCOUNT_PASSWORD`, `ADMIN_ACCOUNT_PASSWORD` (long random strings) and `ADMIN_SESSION_SECRET` (32+ random bytes). Redeploy.
2. Locally with production env in `.env.local`, run `pnpm admin:setup` and type the staff and admin codes at the prompt. Nothing is written to disk.
3. Sign in at `/admin/login` with both codes; walk the sidebar once.
4. Tell staff: bookmark `/admin`. The old PIN screens are gone.
