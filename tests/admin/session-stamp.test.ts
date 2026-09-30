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

  it('different timestamps produce different signatures with same secret', async () => {
    const sig1 = await signStamp(1_700_000_000_000, SECRET);
    const sig2 = await signStamp(1_700_000_000_001, SECRET);
    expect(sig1).not.toBe(sig2);
    // Verify both still round-trip correctly
    expect(await readStamp(sig1, SECRET)).toBe(1_700_000_000_000);
    expect(await readStamp(sig2, SECRET)).toBe(1_700_000_000_001);
  });

  it('rejects a signature with trailing characters', async () => {
    const v = await signStamp(1_700_000_000_000, SECRET);
    // Append a character to the end
    const tamperedValue = v + 'x';
    expect(await readStamp(tamperedValue, SECRET)).toBeNull();
  });

  it('readStamp with empty secret returns null (fails closed)', async () => {
    const v = await signStamp(1_700_000_000_000, SECRET);
    expect(await readStamp(v, '')).toBeNull();
  });

  it('signStamp with empty secret throws error', async () => {
    await expect(signStamp(1_700_000_000_000, '')).rejects.toThrow('ADMIN_SESSION_SECRET is not set');
  });
});
