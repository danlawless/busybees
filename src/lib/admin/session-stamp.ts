export const STAMP_COOKIE = 'bb_admin_started';
export const MAX_SESSION_MS = 12 * 60 * 60 * 1000;

const enc = new TextEncoder();

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  // Use btoa with base64url encoding for edge runtime compatibility (no Buffer)
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * The cookie holds `<epochMs>.<sig>`; the signature covers `<epochMs>.<userId>`, so a stamp only
 * reads back for the user it was issued to. The user id is supplied by the verifier, never stored.
 */
export async function signStamp(startedAt: number, userId: string, secret: string): Promise<string> {
  if (!secret) throw new Error('ADMIN_SESSION_SECRET is not set');
  if (!userId) throw new Error('signStamp needs the signed-in user id');
  return `${startedAt}.${await hmac(`${startedAt}.${userId}`, secret)}`;
}

export async function readStamp(value: string | undefined, userId: string | null | undefined, secret: string): Promise<number | null> {
  if (!secret) return null;
  if (!value || !userId) return null;
  const dot = value.indexOf('.');
  if (dot <= 0) return null;
  const ts = value.slice(0, dot);
  if (!/^\d+$/.test(ts)) return null;
  const expected = await hmac(`${ts}.${userId}`, secret);
  return safeEqual(expected, value.slice(dot + 1)) ? Number(ts) : null;
}

export function stampCookieOptions() {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/' as const,
    maxAge: MAX_SESSION_MS / 1000,
  };
}
