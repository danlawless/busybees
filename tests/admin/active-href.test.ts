import { describe, it, expect } from 'vitest';
import { activeHref } from '@/lib/admin/active-href';

const hrefs = ['/admin', '/admin/parties', '/admin/parties/new', '/admin/events', '/pos'];

describe('activeHref', () => {
  it('matches the exact /admin root', () => {
    expect(activeHref('/admin', hrefs)).toBe('/admin');
  });
  it('picks the longest matching href', () => {
    expect(activeHref('/admin/parties/new', hrefs)).toBe('/admin/parties/new');
    expect(activeHref('/admin/parties/new/step', hrefs)).toBe('/admin/parties/new');
  });
  it('matches child paths to their section', () => {
    expect(activeHref('/admin/parties/123', hrefs)).toBe('/admin/parties');
  });
  it('returns null with no match', () => {
    expect(activeHref('/admin/unknown', hrefs)).toBeNull();
  });
  it('does not match a sibling that shares a prefix', () => {
    expect(activeHref('/admin/partiesX', hrefs)).toBeNull();
  });
});
