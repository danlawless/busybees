import { describe, it, expect } from 'vitest';
import { decidePageAccess, decideApiAccess, liveAdminLevel } from '@/lib/admin/access';

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
  it('editor assets follow the same rule as the editor page', () => {
    expect(decidePageAccess({ pathname: '/editor/app.js', role: 'staff', startedAt: fresh, now })).toEqual({ kind: 'login', to: '/admin/settings' });
    expect(decidePageAccess({ pathname: '/editor/app.js', role: 'admin', startedAt: fresh, now })).toEqual({ kind: 'allow' });
  });
  it('a stamp dated in the future is not live', () => {
    expect(decidePageAccess({ pathname: '/admin', role: 'admin', startedAt: now + 60_000, now }).kind).toBe('login');
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
  it('a future-dated stamp is a 401', () => {
    expect(decideApiAccess({ ...base, pathname: '/api/admin/customers', role: 'admin', startedAt: now + 60_000 })).toEqual({ kind: 'deny', status: 401 });
  });
  it('kiosk settings writes need admin with a fresh stamp', () => {
    const p = '/api/settings/pos-mode';
    expect(decideApiAccess({ ...base, pathname: p, method: 'POST', role: 'admin' })).toEqual({ kind: 'allow' });
    expect(decideApiAccess({ ...base, pathname: p, method: 'POST', role: 'staff' })).toEqual({ kind: 'deny', status: 403 });
  });
  it('self exemption is always passed to the route', () => {
    expect(decideApiAccess({ pathname: '/api/admin/gift-cards/send-reminders', role: null, signedIn: false, startedAt: null, now })).toEqual({ kind: 'allow' });
  });
});

describe('liveAdminLevel', () => {
  it('returns the level for staff/admin with a live stamp', () => {
    expect(liveAdminLevel({ role: 'staff', startedAt: fresh, now })).toBe('staff');
    expect(liveAdminLevel({ role: 'admin', startedAt: fresh, now })).toBe('admin');
  });
  it('null without a staff/admin role', () => {
    expect(liveAdminLevel({ role: null, startedAt: fresh, now })).toBeNull();
    expect(liveAdminLevel({ role: 'customer', startedAt: fresh, now })).toBeNull();
  });
  it('null when the stamp is missing, stale or in the future', () => {
    expect(liveAdminLevel({ role: 'admin', startedAt: null, now })).toBeNull();
    expect(liveAdminLevel({ role: 'admin', startedAt: stale, now })).toBeNull();
    expect(liveAdminLevel({ role: 'staff', startedAt: now + 60_000, now })).toBeNull();
  });
  it('null at exactly the 12-hour edge', () => {
    expect(liveAdminLevel({ role: 'staff', startedAt: now - 12 * 60 * 60 * 1000, now })).toBeNull();
  });
});
