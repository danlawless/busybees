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
