/**
 * The note staff see on a party shift in 7shifts, and the tag that lets the
 * sync job recognise its own shifts. Customer contact details never go here.
 */

import { PACKAGE_PRICING } from '@/lib/validations/party-booking';

export type NoteBooking = {
  id: string;
  package_name: string;
  guest_count: number;
  start_time: string;
  end_time: string;
};

const PACKAGE_LABEL: Record<string, string> = {
  queen_bee: PACKAGE_PRICING.queen_bee.name,
  worker_bee: PACKAGE_PRICING.worker_bee.name,
  basic_bee: PACKAGE_PRICING.basic_bee.name,
};

export function formatEasternClock(time: string): string {
  const [hh, mm] = time.split(':').map(Number);
  const suffix = hh < 12 ? 'AM' : 'PM';
  const hour = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour}:${String(mm).padStart(2, '0')} ${suffix}`;
}

export function shiftNote(booking: NoteBooking, slot: 1 | 2): string {
  const label = PACKAGE_LABEL[booking.package_name] ?? 'Party';
  const time = `${formatEasternClock(booking.start_time)}–${formatEasternClock(booking.end_time)}`;
  return `🎉 Birthday party: ${label}, ${booking.guest_count} kids, ${time} [bb:${booking.id}:${slot}]`;
}

const TAG = /\[bb:([0-9a-f-]{36}):([12])\]/i;

export function parseShiftTag(
  note: string | null | undefined
): { bookingId: string; slot: 1 | 2 } | null {
  const match = note?.match(TAG);
  if (!match) return null;
  return { bookingId: match[1].toLowerCase(), slot: Number(match[2]) as 1 | 2 };
}
