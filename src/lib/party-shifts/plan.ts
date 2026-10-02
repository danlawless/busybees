/**
 * What a party needs in 7shifts, decided from the booking and the shifts
 * already recorded for it. Pure — no I/O — so every case is unit tested.
 */

import { sameWindow, shiftWindow } from '@/lib/party-shifts/window';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'done';

export interface BookingForShifts {
  id: string;
  status: BookingStatus;
  party_date: string;
  start_time: string;
  end_time: string;
  package_name: string;
  guest_count: number;
  child_name: string;
}

export interface RecordedShift {
  id: string;
  slot: 1 | 2;
  sevenShiftsShiftId: number | null;
  startsAt: string;
  endsAt: string;
  status: 'pending' | 'active' | 'deleted';
}

export type ShiftAction =
  | { kind: 'create'; slot: 1 | 2; startsAt: string; endsAt: string }
  | { kind: 'adopt'; shift: RecordedShift; startsAt: string; endsAt: string }
  | { kind: 'move'; shift: RecordedShift; startsAt: string; endsAt: string }
  | { kind: 'delete'; shift: RecordedShift };

export const SHIFTS_PER_PARTY = 2;
const SLOTS: readonly (1 | 2)[] = [1, 2];

export function planPartyShifts(
  booking: BookingForShifts,
  shifts: RecordedShift[],
  now: Date
): ShiftAction[] {
  // Groups are billed and staffed differently; out of scope.
  if (booking.package_name === 'group_rate') return [];

  const live = shifts.filter((s) => s.status !== 'deleted');
  // Once a shift has started the schedule is history: never rewrite it, even
  // if the party has since been moved or cancelled.
  if (hasStarted(live, now)) return [];

  const window = shiftWindow(booking.party_date, booking.start_time, booking.end_time);
  if (new Date(window.startsAt).getTime() <= now.getTime()) return [];

  return changesFor(booking, live, window);
}

/**
 * True when started shifts are the only reason the planner left this booking
 * alone: without them it would move, delete or adopt something. The sync
 * reports these so a change to a party in progress is not silently dropped.
 */
export function heldBackByStartedShifts(booking: BookingForShifts, shifts: RecordedShift[], now: Date): boolean {
  if (booking.package_name === 'group_rate') return false;
  const live = shifts.filter((s) => s.status !== 'deleted');
  if (!hasStarted(live, now)) return false;
  const window = shiftWindow(booking.party_date, booking.start_time, booking.end_time);
  return changesFor(booking, live, window).length > 0;
}

function hasStarted(live: RecordedShift[], now: Date): boolean {
  return live.some((s) => new Date(s.startsAt).getTime() <= now.getTime());
}

/** The actions the booking's status and window call for, ignoring the clock. */
function changesFor(
  booking: BookingForShifts,
  live: RecordedShift[],
  window: { startsAt: string; endsAt: string }
): ShiftAction[] {
  if (booking.status === 'done') return [];

  if (booking.status === 'cancelled' || booking.status === 'pending') {
    return live.map((shift) => ({ kind: 'delete', shift }));
  }

  const actions: ShiftAction[] = [];
  for (const slot of SLOTS) {
    const shift = live.find((s) => s.slot === slot);
    if (!shift) {
      actions.push({ kind: 'create', slot, ...window });
    } else if (shift.status === 'pending' || shift.sevenShiftsShiftId === null) {
      actions.push({ kind: 'adopt', shift, ...window });
    } else if (!sameWindow(shift, window)) {
      actions.push({ kind: 'move', shift, ...window });
    }
  }
  return actions;
}

export function describeAction(action: ShiftAction): string {
  const span = (a: { startsAt: string; endsAt: string }) =>
    `${a.startsAt.slice(11, 16)}Z–${a.endsAt.slice(11, 16)}Z`;
  switch (action.kind) {
    case 'create':
      return `create slot ${action.slot} ${span(action)}`;
    case 'adopt':
      return `adopt slot ${action.shift.slot} ${span(action)}`;
    case 'move':
      return `move slot ${action.shift.slot} (#${action.shift.sevenShiftsShiftId}) to ${span(action)}`;
    case 'delete':
      return `delete slot ${action.shift.slot} (#${action.shift.sevenShiftsShiftId ?? 'untracked'})`;
  }
}
