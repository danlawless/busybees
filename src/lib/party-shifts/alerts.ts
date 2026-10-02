/**
 * Emails to the manager when the sync changes a shift someone had picked up,
 * finds a party shift deleted by hand, or leaves a changed party's started shifts alone. Plain text; sent via sendEmail.
 */

import { formatEasternClock } from '@/lib/party-shifts/note';
import type { BookingForShifts } from '@/lib/party-shifts/plan';

export type ShiftAlert = { subject: string; text: string };
type Window = { startsAt: string; endsAt: string };

const clock = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit' })
    .format(new Date(iso))
    .replace(/\s/g, ' ');

const day = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric' })
    .format(new Date(iso))
    .replace(',', '');

export function formatEasternRange(w: Window): string {
  return `${clock(w.startsAt)}–${clock(w.endsAt)}`;
}

/** "Sat Oct 18, 12:30 PM–3:30 PM": the Eastern day the shift starts on, then its times. */
export function formatEasternDatedRange(w: Window): string {
  return `${day(w.startsAt)}, ${formatEasternRange(w)}`;
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
      `${holder} had picked up the ${formatEasternDatedRange(from)} shift; it is now ${formatEasternDatedRange(to)}.\n\n` +
      `Let ${holder} know about the new time.`,
  };
}

export function cancelledAlert(booking: BookingForShifts, holder: string, window: Window): ShiftAlert {
  return {
    subject: `Party cancelled: ${partyName(booking)}, ${partyDay(booking)}`,
    text:
      `${partyName(booking)} on ${partyDay(booking)} was cancelled.\n\n` +
      `${holder} had picked up the ${formatEasternDatedRange(window)} shift; it has been removed from 7shifts.\n\n` +
      `Let ${holder} know they are no longer needed.`,
  };
}

/** Recorded on a booking's live rows once the manager has been told it was held back, so the alert is sent once. */
export const HELD_BACK_NOTE = 'held back: shifts already started; manager alerted';

export function heldBackAlert(booking: BookingForShifts): ShiftAlert {
  const change = booking.status === 'cancelled' ? 'was cancelled' : 'was changed';
  return {
    subject: `Party shifts need a manager: ${partyName(booking)}, ${partyDay(booking)}`,
    text:
      `${partyName(booking)} on ${partyDay(booking)} (${partyTime(booking)}) ${change} after one of its shifts had started, ` +
      `so its shifts in 7shifts were left as they were.\n\n` +
      `Please update the shifts in 7shifts by hand.`,
  };
}

export function removedByHandAlert(booking: BookingForShifts, slot: 1 | 2): ShiftAlert {
  return {
    subject: `Party shift recreated: ${partyName(booking)}, ${partyDay(booking)}`,
    text:
      `Party shift ${slot} of 2 for ${partyName(booking)} on ${partyDay(booking)} (${partyTime(booking)}) ` +
      `was deleted in 7shifts, but the party is still booked, so a new open shift will be posted within about ten minutes.\n\n` +
      `If the party should not be staffed, cancel the booking rather than deleting its shifts.`,
  };
}
