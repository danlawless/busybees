/**
 * Which devices may sign a customer in by phone number alone.
 *
 * The kiosk's phone-number login is only safe on the store's own device, where
 * the person typing is standing at the counter. Entering the POS PIN on a
 * device now leaves a signed, httpOnly approval cookie; the phone-only kiosk
 * routes accept a caller that holds one (or a signed-in staff member). The
 * approval names a fingerprint of the PIN it was issued under, so changing the
 * POS PIN withdraws every existing approval, and it lapses after 30 days.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { serverSecret } from './serverSecret';
import { requireStaff } from './requireRole';

export const POS_DEVICE_COOKIE = 'bb_pos_device';
export const POS_DEVICE_DAYS = 30;

const hmac = (key: string, text: string) => createHmac('sha256', key).update(text).digest('base64url');

/** A fingerprint of the PIN: changes whenever the PIN does, reveals nothing of it. */
export function pinFingerprint(pin: string, key: string): string {
  return hmac(key, `pos-pin:${pin}`).slice(0, 22);
}

/** Pure: the approval token for a device, valid until `expiresAt` (ms). */
export function signDeviceApproval(expiresAt: number, pinPrint: string, key: string): string {
  const body = `${expiresAt}.${pinPrint}`;
  return `${body}.${hmac(key, `pos-device:v1:${body}`)}`;
}

/** Pure: is this a genuine, unexpired approval issued under the current PIN? */
export function isValidDeviceApproval(
  token: string | undefined,
  currentPinPrint: string,
  now: number,
  key: string
): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [expires, pinPrint, signature] = parts;
  const expected = hmac(key, `pos-device:v1:${expires}.${pinPrint}`);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  if (!(Number(expires) > now)) return false;
  return pinPrint === currentPinPrint;
}

async function currentPosPin(): Promise<string | null> {
  const { data, error } = await createAdminClient()
    .from('settings')
    .select('value')
    .eq('key', 'pos_access_pin')
    .maybeSingle();
  if (error) throw error;
  return data?.value ? String(data.value) : null;
}

/** Set the approval cookie on a response, after the POS PIN was entered correctly. */
export function approveDevice(response: NextResponse, pin: string): void {
  const key = serverSecret();
  const expiresAt = Date.now() + POS_DEVICE_DAYS * 24 * 60 * 60 * 1000;
  response.cookies.set({
    name: POS_DEVICE_COOKIE,
    value: signDeviceApproval(expiresAt, pinFingerprint(pin, key), key),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: POS_DEVICE_DAYS * 24 * 60 * 60,
  });
}

export const DEVICE_LOCKED_ERROR = 'This device needs the POS PIN before customers can sign in here.';

/**
 * Gate for the phone-only kiosk routes: an approved POS device, or a signed-in
 * staff member. Returns the response to send, or null to continue.
 */
export async function requireKioskDevice(request: NextRequest): Promise<NextResponse | null> {
  const pin = await currentPosPin();
  if (pin) {
    const key = serverSecret();
    const token = request.cookies.get(POS_DEVICE_COOKIE)?.value;
    if (isValidDeviceApproval(token, pinFingerprint(pin, key), Date.now(), key)) return null;
  }
  // No approval (or no POS PIN set at all): only staff may use phone-only sign-in.
  const staffDenied = await requireStaff();
  if (!staffDenied) return null;
  return NextResponse.json({ error: DEVICE_LOCKED_ERROR, code: 'device_locked' }, { status: 403 });
}
