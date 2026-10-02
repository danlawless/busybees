/**
 * Carries out the plan for every party: talks to 7shifts through the client,
 * records each step in the store, and emails the manager when a held shift
 * changes. In dry-run mode it only reports what it would do.
 */

import {
  cancelledAlert,
  HELD_BACK_NOTE,
  heldBackAlert,
  movedAlert,
  removedByHandAlert,
  type ShiftAlert,
} from '@/lib/party-shifts/alerts';
import { parseShiftTag, shiftNote } from '@/lib/party-shifts/note';
import {
  describeAction,
  heldBackByStartedShifts,
  planPartyShifts,
  type BookingForShifts,
  type RecordedShift,
  type ShiftAction,
} from '@/lib/party-shifts/plan';
import { isHeld, type SevenShiftsClient, type SevenShiftsShift } from '@/lib/party-shifts/sevenShifts';
import { easternDateOf, easternDayBounds, sameWindow } from '@/lib/party-shifts/window';

type Window = { startsAt: string; endsAt: string };

export interface ShiftStore {
  loadBookings(syncStartIso: string, todayEastern: string): Promise<BookingForShifts[]>;
  loadShifts(bookingIds: string[]): Promise<Map<string, RecordedShift[]>>;
  upsertPending(bookingId: string, slot: 1 | 2, window: Window): Promise<RecordedShift>;
  markActive(id: string, sevenShiftsShiftId: number, window: Window): Promise<void>;
  markDeleted(id: string): Promise<void>;
  setError(id: string, message: string): Promise<void>;
}

export interface SyncDeps {
  store: ShiftStore;
  client: SevenShiftsClient;
  sendAlert(alert: ShiftAlert): Promise<void>;
  mode: 'dry-run' | 'live';
  now: Date;
  todayEastern: string;
  syncStart: string;
}

export interface SyncSummary {
  mode: 'dry-run' | 'live';
  bookings: number;
  created: number;
  adopted: number;
  moved: number;
  deleted: number;
  unchanged: number;
  alerts: number;
  errors: { bookingId: string; action: string; message: string }[];
  planned: { bookingId: string; actions: string[] }[];
  /** Bookings changed after their shifts began; left alone for the manager. */
  skipped: { bookingId: string; reason: 'shifts already started' }[];
}

export async function runPartyShiftSync(deps: SyncDeps): Promise<SyncSummary> {
  const { store, client } = deps;
  const summary: SyncSummary = {
    mode: deps.mode, bookings: 0, created: 0, adopted: 0, moved: 0, deleted: 0, unchanged: 0,
    alerts: 0, errors: [], planned: [], skipped: [],
  };

  const bookings = await store.loadBookings(deps.syncStart, deps.todayEastern);
  summary.bookings = bookings.length;
  const recorded = await store.loadShifts(bookings.map((b) => b.id));

  const alert = async (a: ShiftAlert) => {
    await deps.sendAlert(a);
    summary.alerts += 1;
  };

  /**
   * Tells the manager. The 7shifts change is already recorded by now, so a
   * failure here is its own error and never undoes or re-runs the action.
   * A failed name lookup still sends the alert, naming "Someone".
   * Returns whether the alert was sent.
   */
  const notify = async (
    kind: ShiftAction['kind'] | 'held-back',
    booking: BookingForShifts,
    rowId: string,
    userId: number | null,
    build: (holder: string) => ShiftAlert
  ) => {
    let holder = 'Someone';
    if (userId !== null) {
      try {
        holder = await client.getUserName(userId);
      } catch {
        // keep "Someone"
      }
    }
    const built = build(holder);
    try {
      await alert(built);
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const message = `alert not sent (${built.subject}): ${reason}`;
      summary.errors.push({ bookingId: booking.id, action: `alert:${kind}`, message });
      await store.setError(rowId, message).catch(() => {});
      return false;
    }
  };

  /**
   * Tells the manager once that a changed party's started shifts were left
   * alone. The note on the live rows is what stops the next run (every ten
   * minutes) sending it again; it is set only after the email went out.
   */
  const reportHeldBack = async (booking: BookingForShifts, shifts: RecordedShift[]) => {
    const live = shifts.filter((s) => s.status !== 'deleted');
    if (live.length === 0 || live.some((s) => s.lastError === HELD_BACK_NOTE)) return;
    if (!(await notify('held-back', booking, live[0].id, null, () => heldBackAlert(booking)))) return;
    for (const row of live) {
      // Without the note the next run emails again, so a failed write must show up.
      await store.setError(row.id, HELD_BACK_NOTE).catch((error: unknown) => {
        summary.errors.push({
          bookingId: booking.id,
          action: 'note:held-back',
          message: error instanceof Error ? error.message : String(error),
        });
      });
    }
  };

  /**
   * Our shift for this row, found in 7shifts by its note tag. Searched on the
   * day the row was recorded for, then on the party's date if it has moved
   * since: a create cut short before a reschedule leaves its shift on the old day.
   */
  const findTagged = async (booking: BookingForShifts, row: RecordedShift): Promise<SevenShiftsShift | null> => {
    const days = [easternDateOf(row.startsAt)];
    if (days[0] !== booking.party_date) days.push(booking.party_date);
    for (const date of days) {
      const { fromIso, toIso } = easternDayBounds(date);
      const shifts = await client.findShiftsBetween(fromIso, toIso);
      const found = shifts.find((s) => {
        const tag = parseShiftTag(s.notes);
        return tag?.bookingId === booking.id.toLowerCase() && tag.slot === row.slot;
      });
      if (found) return found;
    }
    return null;
  };

  const createShift = async (booking: BookingForShifts, slot: 1 | 2, window: Window) => {
    const row = await store.upsertPending(booking.id, slot, window);
    const shift = await client.createOpenShift({ ...window, notes: shiftNote(booking, slot) });
    await store.markActive(row.id, shift.id, window);
  };

  const moveShift = async (
    kind: ShiftAction['kind'],
    booking: BookingForShifts,
    row: RecordedShift,
    id: number,
    window: Window
  ) => {
    const current = await client.getShift(id);
    if (!current) {
      // Deleted by hand in 7shifts: forget it; the next run recreates it.
      await store.markDeleted(row.id);
      await notify(kind, booking, row.id, null, () => removedByHandAlert(booking, row.slot));
      return 'gone' as const;
    }
    await client.moveShift(id, { ...window, notes: shiftNote(booking, row.slot) });
    await store.markActive(row.id, id, window);
    if (isHeld(current)) {
      await notify(kind, booking, row.id, current.user_id, (holder) =>
        movedAlert(booking, holder, { startsAt: current.start, endsAt: current.end }, window)
      );
    }
    return 'moved' as const;
  };

  const apply = async (booking: BookingForShifts, action: ShiftAction) => {
    switch (action.kind) {
      case 'create':
        await createShift(booking, action.slot, action);
        summary.created += 1;
        return;

      case 'adopt': {
        const found = await findTagged(booking, action.shift);
        if (!found) {
          await createShift(booking, action.shift.slot, action);
          summary.created += 1;
          return;
        }
        await store.markActive(action.shift.id, found.id, { startsAt: found.start, endsAt: found.end });
        summary.adopted += 1;
        if (!sameWindow({ startsAt: found.start, endsAt: found.end }, action)) {
          if ((await moveShift('adopt', booking, action.shift, found.id, action)) === 'moved') summary.moved += 1;
        }
        return;
      }

      case 'move': {
        const id = action.shift.sevenShiftsShiftId as number;
        if ((await moveShift('move', booking, action.shift, id, action)) === 'moved') summary.moved += 1;
        return;
      }

      case 'delete': {
        const id = action.shift.sevenShiftsShiftId ?? (await findTagged(booking, action.shift))?.id ?? null;
        let held: SevenShiftsShift | null = null;
        if (id !== null) {
          const current = await client.getShift(id);
          if (current) {
            await client.deleteShift(id);
            if (isHeld(current)) held = current;
          }
        }
        await store.markDeleted(action.shift.id);
        summary.deleted += 1;
        if (held) {
          const { start, end, user_id } = held;
          await notify('delete', booking, action.shift.id, user_id, (holder) =>
            cancelledAlert(booking, holder, { startsAt: start, endsAt: end })
          );
        }
        return;
      }
    }
  };

  for (const booking of bookings) {
    const shifts = recorded.get(booking.id) ?? [];
    let actions: ShiftAction[];
    try {
      actions = planPartyShifts(booking, shifts, deps.now);
      if (actions.length === 0 && heldBackByStartedShifts(booking, shifts, deps.now)) {
        summary.skipped.push({ bookingId: booking.id, reason: 'shifts already started' });
        if (deps.mode === 'live') await reportHeldBack(booking, shifts);
        continue;
      }
    } catch (error) {
      // A malformed booking (e.g. an unreadable time) must not stop the others.
      const message = error instanceof Error ? error.message : String(error);
      summary.errors.push({ bookingId: booking.id, action: 'plan', message });
      continue;
    }
    if (actions.length === 0) {
      summary.unchanged += 1;
      continue;
    }
    summary.planned.push({ bookingId: booking.id, actions: actions.map(describeAction) });
    if (deps.mode === 'dry-run') continue;

    for (const action of actions) {
      try {
        await apply(booking, action);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        summary.errors.push({ bookingId: booking.id, action: describeAction(action), message });
        if (action.kind !== 'create') await store.setError(action.shift.id, message).catch(() => {});
      }
    }
  }

  return summary;
}
