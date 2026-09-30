import { verifyPin } from '@/lib/auth/pin';
import type { Level } from './nav';

export async function resolvePinLevel(
  pin: string,
  hashes: { admin: string | null; staff: string | null },
  verify: (pin: string, hash: string) => Promise<boolean> = verifyPin,
): Promise<Level | null> {
  if (!/^\d{4}$/.test(pin)) return null;
  if (hashes.admin && (await verify(pin, hashes.admin))) return 'admin';
  if (hashes.staff && (await verify(pin, hashes.staff))) return 'staff';
  return null;
}
