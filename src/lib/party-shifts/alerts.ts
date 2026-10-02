/**
 * Emails to the manager when the sync changes a shift someone had picked up,
 * or finds a party shift deleted by hand. Plain text; sent via sendEmail.
 */

import { formatEasternClock } from '@/lib/party-shifts/note';
import type { BookingForShifts } from '@/lib/party-shifts/plan';

export type ShiftAlert = { subject: string; text: string };
type Window = { startsAt: string; endsAt: string };

const clock = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
    .format(new Date(iso))
    .replace(/\s/g, ' ');

export function formatEasternRange(w: Window): string {
  return `${clock(w.startsAt)}–${clock(w.endsAt)}`;
}

function partyDay(booking: BookingForShifts): string {
  // Noon UTC on the party date is the same calendar day in Eastern time.
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
    .format(new Date(`${booking.party_date}T12:00:00Z`))
    .replace(',', '');
}

const partyName = (b: BookingForShifts) => `${b.child_name}'s party`;
const partyTime = (b: BookingForShifts) =>
  `${formatEasternClock(b.start_time)}–${formatEasternClock(b.end_time)}`;

export function movedAlert(booking: BookingForShifts, holder: string, from: Window, to: Window): ShiftAlert {
  return {
    subject: `Party shift moved: ${partyName(booking)}, ${partyDay(booking)}`,
    text:
      `${partyName(booking)} on ${partyDay(booking)} moved to ${partyTime(booking)}.\n\n` +
      `${holder} had picked up the ${formatEasternRange(from)} shift; it is now ${formatEasternRange(to)}.\n\n` +
      `Let ${holder} know about the new time.`,
  };
}

export function cancelledAlert(booking: BookingForShifts, holder: string, window: Window): ShiftAlert {
  return {
    subject: `Party cancelled: ${partyName(booking)}, ${partyDay(booking)}`,
    text:
      `${partyName(booking)} on ${partyDay(booking)} was cancelled.\n\n` +
      `${holder} had picked up the ${formatEasternRange(window)} shift; it has been removed from 7shifts.\n\n` +
      `Let ${holder} know they are no longer needed.`,
  };
}

export function removedByHandAlert(booking: BookingForShifts, slot: 1 | 2): ShiftAlert {
  return {
    subject: `Party shift recreated: ${partyName(booking)}, ${partyDay(booking)}`,
    text:
      `Party shift ${slot} of 2 for ${partyName(booking)} on ${partyDay(booking)} (${partyTime(booking)}) ` +
      `was deleted in 7shifts, but the party is still booked, so a new open shift has been posted.\n\n` +
      `If the party should not be staffed, cancel the booking rather than deleting its shifts.`,
  };
}
