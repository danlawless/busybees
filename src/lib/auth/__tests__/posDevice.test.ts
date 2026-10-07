import { describe, expect, it } from 'vitest';
import { isValidDeviceApproval, pinFingerprint, signDeviceApproval } from '@/lib/auth/posDevice';

const KEY = 'test-key';
const NOW = 1_800_000_000_000;
const print = pinFingerprint('482913', KEY);
const token = signDeviceApproval(NOW + 1000, print, KEY);

describe('POS device approval', () => {
  it('accepts a genuine approval under the current PIN', () => {
    expect(isValidDeviceApproval(token, print, NOW, KEY)).toBe(true);
  });

  it('is withdrawn when the PIN changes', () => {
    expect(isValidDeviceApproval(token, pinFingerprint('000000', KEY), NOW, KEY)).toBe(false);
  });

  it('lapses when it expires', () => {
    expect(isValidDeviceApproval(token, print, NOW + 1000, KEY)).toBe(false);
  });

  it('refuses a forged or altered token', () => {
    const [, p, sig] = token.split('.');
    expect(isValidDeviceApproval(`${NOW + 9e12}.${p}.${sig}`, print, NOW, KEY)).toBe(false);
    expect(isValidDeviceApproval(signDeviceApproval(NOW + 1000, print, 'other-key'), print, NOW, KEY)).toBe(false);
    expect(isValidDeviceApproval('junk', print, NOW, KEY)).toBe(false);
    expect(isValidDeviceApproval(undefined, print, NOW, KEY)).toBe(false);
  });

  it('never reveals the PIN in the fingerprint', () => {
    expect(print).not.toContain('482913');
    expect(pinFingerprint('482913', KEY)).toBe(print);
  });
});
