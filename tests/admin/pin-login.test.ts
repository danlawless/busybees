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
