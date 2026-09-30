import { describe, it, expect } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { apiLevelForPath, API_EXEMPTIONS, isExplicitlyClassified } from '@/lib/admin/api-access';

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
    expect(apiLevelForPath('/api/settings/pos-pin', 'POST')).toBe('admin');
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

  it('defaults unknown admin routes to admin (fail closed)', () => {
    expect(apiLevelForPath('/api/admin/some-new-route')).toBe('admin');
    expect(apiLevelForPath('/api/admin/some-new-route', 'POST')).toBe('admin');
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
      expect(isExplicitlyClassified(url), url).toBe(true);
    }
  });

  it('every exemption points at a real route', () => {
    const urls = new Set(routeFiles('src/app/api/admin').map(toUrl));
    for (const path of Object.keys(API_EXEMPTIONS)) expect(urls.has(path), path).toBe(true);
  });
});
