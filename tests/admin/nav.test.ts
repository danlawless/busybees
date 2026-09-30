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
