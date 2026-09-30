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

/**
 * Method-scoped exemptions for the kiosk group-rate flow (GroupChildrenManager, customer mode).
 * Only the listed methods pass for any signed-in user; every other method on these routes stays staff.
 * Dynamic segments (':id') match exactly one path segment, never a prefix.
 * Stopgap: kiosk-scoped /api/pos routes should replace these (follow-up).
 *
 * GET /api/admin/customers is deliberately NOT listed: that handler ignores ?phone= and returns
 * every customer with children, purchases and saved cards, so opening it to customers would leak
 * the whole customer table. POST is listed per the ruling but has no handler yet (405).
 */
export const KIOSK_EXEMPTIONS: ReadonlyArray<{ pattern: string; methods: ReadonlyArray<string> }> = [
  { pattern: '/api/admin/children/search', methods: ['GET'] },
  { pattern: '/api/admin/customers', methods: ['POST'] },
  { pattern: '/api/admin/customers/:id/children', methods: ['POST'] },
  { pattern: '/api/admin/customers/:id/children/:childId/waiver', methods: ['POST'] },
];

export function matchesPattern(pattern: string, path: string): boolean {
  const want = pattern.split('/');
  const got = path.split('/');
  if (want.length !== got.length) return false;
  return want.every((seg, i) => (seg.startsWith(':') ? got[i].length > 0 : seg === got[i]));
}

function kioskExempt(path: string, method: string): boolean {
  const m = method.toUpperCase();
  return KIOSK_EXEMPTIONS.some(e => e.methods.includes(m) && matchesPattern(e.pattern, path));
}

const OPEN = new Set(['/api/admin/session']);

/** Read by the POS kiosk before anyone signs in. Values are non-sensitive (configured flag, mode, toggle). */
export const KIOSK_READS = new Set(['/api/settings/pos-pin', '/api/settings/pos-mode', '/api/settings/auto-checkout']);

const ADMIN_PREFIXES = [
  '/api/admin/reports',
  '/api/admin/fixed-expenses',
  '/api/admin/top-customers',
  '/api/admin/staff',
  '/api/admin/pins',
  '/api/editor',
  '/api/settings',
];

/** Day-to-day routes staff may call. Anything under /api/admin not listed here or in ADMIN_PREFIXES is admin. */
const STAFF_PREFIXES = [
  '/api/admin/after-dark-bookings', '/api/admin/after-dark-movies', '/api/admin/announcements',
  '/api/admin/children', '/api/admin/coupons', '/api/admin/customers', '/api/admin/event-bookings',
  '/api/admin/events', '/api/admin/gift-cards', '/api/admin/groups', '/api/admin/monthly-members',
  '/api/admin/party-bookings', '/api/admin/party-packages', '/api/admin/party-time-slots',
  '/api/admin/punch-cards', '/api/admin/sibling-discounts', '/api/admin/staff-discounts',
];

function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + '/');
}

export function apiLevelForPath(pathname: string, method = 'GET'): ApiLevel | null {
  const path = pathname.replace(/\/$/, '');
  if (OPEN.has(path)) return null;
  if (method.toUpperCase() === 'GET' && KIOSK_READS.has(path)) return null;
  if (API_EXEMPTIONS[path]) return API_EXEMPTIONS[path];
  if (kioskExempt(path, method)) return 'signed-in';
  if (ADMIN_PREFIXES.some(p => under(path, p))) return 'admin';
  if (STAFF_PREFIXES.some(p => under(path, p))) return 'staff';
  if (under(path, '/api/admin')) return 'admin';
  return null;
}

export function isExplicitlyClassified(pathname: string): boolean {
  const path = pathname.replace(/\/$/, '');
  if (OPEN.has(path)) return true;
  if (KIOSK_READS.has(path)) return true;
  if (API_EXEMPTIONS[path]) return true;
  if (KIOSK_EXEMPTIONS.some(e => matchesPattern(e.pattern, path))) return true;
  if (ADMIN_PREFIXES.some(p => under(path, p))) return true;
  if (STAFF_PREFIXES.some(p => under(path, p))) return true;
  return false;
}
