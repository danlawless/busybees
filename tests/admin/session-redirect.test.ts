import { describe, it, expect } from 'vitest';
import { loginUrlFor } from '@/lib/admin/session-redirect';

describe('loginUrlFor', () => {
  it('sends the person back to the page they were on', () => {
    expect(loginUrlFor('/admin/parties')).toBe('/admin/login?to=%2Fadmin%2Fparties');
  });

  it('encodes the path so it cannot add query parameters', () => {
    expect(loginUrlFor('/admin/a?b=1&c=2')).toBe('/admin/login?to=%2Fadmin%2Fa%3Fb%3D1%26c%3D2');
  });
});
