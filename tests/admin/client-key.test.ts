import { describe, it, expect } from 'vitest';
import { clientKeyFrom } from '@/lib/admin/rate-limit';

const h = (o: Record<string, string>) => new Headers(o);

describe('clientKeyFrom', () => {
  it('prefers x-real-ip', () => {
    expect(clientKeyFrom(h({ 'x-real-ip': ' 9.9.9.9 ', 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }))).toBe('9.9.9.9');
  });
  it('ignores a spoofed first x-forwarded-for entry and uses the last', () => {
    expect(clientKeyFrom(h({ 'x-forwarded-for': '6.6.6.6, 2.2.2.2 ' }))).toBe('2.2.2.2');
  });
  it('returns unknown when no headers', () => {
    expect(clientKeyFrom(h({}))).toBe('unknown');
    expect(clientKeyFrom(h({ 'x-forwarded-for': ' , ' }))).toBe('unknown');
  });
});
