import { describe, it, expect } from 'vitest';
import { signStamp, readStamp } from '@/lib/admin/session-stamp';

const SECRET = 'test-secret-value';
const A = 'user-a';
const B = 'user-b';

describe('session stamp', () => {
  it('round-trips for the user it was signed for', async () => {
    const v = await signStamp(1_700_000_000_000, A, SECRET);
    expect(await readStamp(v, A, SECRET)).toBe(1_700_000_000_000);
  });

  it('a stamp signed for user A does not read back for user B', async () => {
    const v = await signStamp(1_700_000_000_000, A, SECRET);
    expect(await readStamp(v, B, SECRET)).toBeNull();
  });

  it('rejects a missing user id (fails closed)', async () => {
    const v = await signStamp(1_700_000_000_000, A, SECRET);
    expect(await readStamp(v, null, SECRET)).toBeNull();
    expect(await readStamp(v, '', SECRET)).toBeNull();
    await expect(signStamp(1_700_000_000_000, '', SECRET)).rejects.toThrow();
  });

  it('rejects a changed timestamp', async () => {
    const v = await signStamp(1_700_000_000_000, A, SECRET);
    const [, sig] = v.split('.');
    expect(await readStamp(`1800000000000.${sig}`, A, SECRET)).toBeNull();
  });

  it('rejects the wrong secret, missing, and garbage', async () => {
    const v = await signStamp(1, A, SECRET);
    expect(await readStamp(v, A, 'other')).toBeNull();
    expect(await readStamp(undefined, A, SECRET)).toBeNull();
    expect(await readStamp('nope', A, SECRET)).toBeNull();
    expect(await readStamp('.abc', A, SECRET)).toBeNull();
  });

  it('different timestamps produce different signatures with same secret', async () => {
    const sig1 = await signStamp(1_700_000_000_000, A, SECRET);
    const sig2 = await signStamp(1_700_000_000_001, A, SECRET);
    expect(sig1).not.toBe(sig2);
    expect(await readStamp(sig1, A, SECRET)).toBe(1_700_000_000_000);
    expect(await readStamp(sig2, A, SECRET)).toBe(1_700_000_000_001);
  });

  it('rejects a signature with trailing characters', async () => {
    const v = await signStamp(1_700_000_000_000, A, SECRET);
    expect(await readStamp(v + 'x', A, SECRET)).toBeNull();
  });

  it('readStamp with empty secret returns null (fails closed)', async () => {
    const v = await signStamp(1_700_000_000_000, A, SECRET);
    expect(await readStamp(v, A, '')).toBeNull();
  });

  it('signStamp with empty secret throws error', async () => {
    await expect(signStamp(1_700_000_000_000, A, '')).rejects.toThrow('ADMIN_SESSION_SECRET is not set');
  });
});
