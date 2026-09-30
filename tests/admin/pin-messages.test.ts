import { describe, it, expect } from 'vitest';
import { pinErrorMessage } from '@/components/admin/shell/pin-messages';

describe('pinErrorMessage', () => {
  it('rounds lockout minutes up', () => {
    expect(pinErrorMessage(429, { retryAfterSeconds: 61 })).toBe('Too many tries. Try again in 2 minutes.');
    expect(pinErrorMessage(429, { retryAfterSeconds: 600 })).toBe('Too many tries. Try again in 10 minutes.');
  });
  it('defaults the lockout to 10 minutes', () => {
    expect(pinErrorMessage(429, {})).toBe('Too many tries. Try again in 10 minutes.');
  });
  it('explains a missing staff PIN', () => {
    expect(pinErrorMessage(503, {})).toBe('No staff PIN is set yet. Ask the owner to set one in Settings.');
  });
  it('shows tries left only when 2 or fewer remain', () => {
    expect(pinErrorMessage(401, { remaining: 2 })).toBe("That code didn't match. 2 tries left.");
    expect(pinErrorMessage(401, { remaining: 1 })).toBe("That code didn't match. 1 try left.");
    expect(pinErrorMessage(401, { remaining: 3 })).toBe("That code didn't match.");
    expect(pinErrorMessage(401, {})).toBe("That code didn't match.");
  });
  it('treats 400 as a mismatch', () => {
    expect(pinErrorMessage(400, {})).toBe("That code didn't match.");
  });
  it('falls back for 500 and anything else', () => {
    expect(pinErrorMessage(500, {})).toBe('Something went wrong. Please try again.');
    expect(pinErrorMessage(418, {})).toBe('Something went wrong. Please try again.');
  });
});
