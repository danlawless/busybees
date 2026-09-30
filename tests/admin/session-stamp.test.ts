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

  it('signature verification is actually checking the HMAC (proof: test fails without comparison)', async () => {
    // This test demonstrates that readStamp MUST compare the HMAC.
    // If we were to remove the safeEqual check in readStamp, this test would fail.
    // We can't modify readStamp here, so instead we verify that tampering is caught:
    const v = await signStamp(1_700_000_000_000, SECRET);
    const [ts, sig] = v.split('.');

    // Tamper with the signature by changing the last character
    const tamperedSig = sig.slice(0, -1) + (sig[sig.length - 1] === 'A' ? 'B' : 'A');
    const result = await readStamp(`${ts}.${tamperedSig}`, SECRET);

    // This should be null because the signature won't match
    expect(result).toBeNull();
  });
});
