import { describe, it, expect } from 'vitest';
import { lockSession } from '@/components/admin/shell/lock-session';

const reply = (status: number) => (async () => new Response(null, { status })) as unknown as typeof fetch;

describe('lockSession', () => {
  it('is true when the server ends the session', async () => {
    expect(await lockSession(reply(200))).toBe(true);
  });
  it('is false when the server refuses', async () => {
    expect(await lockSession(reply(500))).toBe(false);
  });
  it('is false on a network error', async () => {
    const down = (async () => { throw new TypeError('Failed to fetch'); }) as unknown as typeof fetch;
    expect(await lockSession(down)).toBe(false);
  });
});
