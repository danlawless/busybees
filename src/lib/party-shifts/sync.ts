/**
 * Carries out the plan for every party: talks to 7shifts through the client,
 * records each step in the store, and emails the manager when a held shift
 * changes. In dry-run mode it only reports what it would do.
 */

import { cancelledAlert, movedAlert, removedByHandAlert, type ShiftAlert } from '@/lib/party-shifts/alerts';
import { parseShiftTag, shiftNote } from '@/lib/party-shifts/note';
import {
  describeAction,
  planPartyShifts,
  type BookingForShifts,
  type RecordedShift,
  type ShiftAction,
} from '@/lib/party-shifts/plan';
import { isHeld, type SevenShiftsClient, type SevenShiftsShift } from '@/lib/party-shifts/sevenShifts';
import { easternDayBounds, sameWindow } from '@/lib/party-shifts/window';

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
}

export async function runPartyShiftSync(deps: SyncDeps): Promise<SyncSummary> {
  const { store, client } = deps;
  const summary: SyncSummary = {
    mode: deps.mode, bookings: 0, created: 0, adopted: 0, moved: 0, deleted: 0, unchanged: 0,
    alerts: 0, errors: [], planned: [],
  };

  const bookings = await store.loadBookings(deps.syncStart, deps.todayEastern);
  summary.bookings = bookings.length;
  const recorded = await store.loadShifts(bookings.map((b) => b.id));

  const alert = async (a: ShiftAlert) => {
    await deps.sendAlert(a);
    summary.alerts += 1;
  };

  /** Our shift for this booking and slot, found in 7shifts by its note tag. */
  const findTagged = async (booking: BookingForShifts, slot: 1 | 2): Promise<SevenShiftsShift | null> => {
    const { fromIso, toIso } = easternDayBounds(booking.party_date);
    const shifts = await client.findShiftsBetween(fromIso, toIso);
    return (
      shifts.find((s) => {
        const tag = parseShiftTag(s.notes);
        return tag?.bookingId === booking.id.toLowerCase() && tag.slot === slot;
      }) ?? null
    );
  };

  const createShift = async (booking: BookingForShifts, slot: 1 | 2, window: Window) => {
    const row = await store.upsertPending(booking.id, slot, window);
    const shift = await client.createOpenShift({ ...window, notes: shiftNote(booking, slot) });
    await store.markActive(row.id, shift.id, window);
  };

  const moveShift = async (booking: BookingForShifts, row: RecordedShift, id: number, window: Window) => {
    const current = await client.getShift(id);
    if (!current) {
      // Deleted by hand in 7shifts: forget it; the next run recreates it.
      await store.markDeleted(row.id);
      await alert(removedByHandAlert(booking, row.slot));
      return 'gone' as const;
    }
    await client.moveShift(id, { ...window, notes: shiftNote(booking, row.slot) });
    await store.markActive(row.id, id, window);
    if (isHeld(current)) {
      const holder = await client.getUserName(current.user_id as number);
      await alert(movedAlert(booking, holder, { startsAt: current.start, endsAt: current.end }, window));
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
        const found = await findTagged(booking, action.shift.slot);
        if (!found) {
          await createShift(booking, action.shift.slot, action);
          summary.created += 1;
          return;
        }
        await store.markActive(action.shift.id, found.id, { startsAt: found.start, endsAt: found.end });
        summary.adopted += 1;
        if (!sameWindow({ startsAt: found.start, endsAt: found.end }, action)) {
          if ((await moveShift(booking, action.shift, found.id, action)) === 'moved') summary.moved += 1;
        }
        return;
      }

      case 'move': {
        const id = action.shift.sevenShiftsShiftId as number;
        if ((await moveShift(booking, action.shift, id, action)) === 'moved') summary.moved += 1;
        return;
      }

      case 'delete': {
        const id = action.shift.sevenShiftsShiftId ?? (await findTagged(booking, action.shift.slot))?.id ?? null;
        if (id !== null) {
          const current = await client.getShift(id);
          if (current) {
            await client.deleteShift(id);
            if (isHeld(current)) {
              const holder = await client.getUserName(current.user_id as number);
              await alert(cancelledAlert(booking, holder, { startsAt: current.start, endsAt: current.end }));
            }
          }
        }
        await store.markDeleted(action.shift.id);
        summary.deleted += 1;
        return;
      }
    }
  };

  for (const booking of bookings) {
    const actions = planPartyShifts(booking, recorded.get(booking.id) ?? [], deps.now);
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
