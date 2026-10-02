import { describe, expect, it } from 'vitest';
import { runPartyShiftSync, type ShiftStore, type SyncDeps } from '@/lib/party-shifts/sync';
import type { BookingForShifts, RecordedShift } from '@/lib/party-shifts/plan';
import type { SevenShiftsClient, SevenShiftsShift } from '@/lib/party-shifts/sevenShifts';
import { shiftNote } from '@/lib/party-shifts/note';

const B = '6f1c2a5e-9d3b-4c1a-8e7f-0a1b2c3d4e5f';
const booking = (over: Partial<BookingForShifts> = {}): BookingForShifts => ({
  id: B, status: 'confirmed', party_date: '2026-10-18', start_time: '13:00:00', end_time: '15:00:00',
  package_name: 'worker_bee', guest_count: 15, child_name: 'Ava', ...over,
});

function memoryStore(bookings: BookingForShifts[], rows: RecordedShift[] = []) {
  const shifts = new Map<string, RecordedShift>(rows.map((r) => [r.id, { ...r }]));
  let n = 0;
  const store: ShiftStore = {
    loadBookings: async () => bookings,
    loadShifts: async () => {
      const map = new Map<string, RecordedShift[]>();
      for (const s of shifts.values()) map.set(B, [...(map.get(B) ?? []), { ...s }]);
      return map;
    },
    upsertPending: async (_b, slot, w) => {
      const existing = [...shifts.values()].find((s) => s.slot === slot);
      const row: RecordedShift = { id: existing?.id ?? `row-${++n}`, slot, sevenShiftsShiftId: null, ...w, status: 'pending' };
      shifts.set(row.id, row);
      return { ...row };
    },
    markActive: async (id, sid, w) => { shifts.set(id, { ...shifts.get(id)!, sevenShiftsShiftId: sid, ...w, status: 'active' }); },
    markDeleted: async (id) => { shifts.set(id, { ...shifts.get(id)!, status: 'deleted' }); },
    setError: async () => {},
  };
  return { store, shifts };
}

function fakeClient(existing: SevenShiftsShift[] = []) {
  const remote = new Map<number, SevenShiftsShift>(existing.map((s) => [s.id, { ...s }]));
  let nextId = 500;
  const calls: string[] = [];
  const searches: string[] = [];
  const client: SevenShiftsClient = {
    createOpenShift: async (i) => { calls.push('create'); const s = { id: ++nextId, start: i.startsAt, end: i.endsAt, user_id: null, notes: i.notes }; remote.set(s.id, s); return s; },
    getShift: async (id) => remote.get(id) ?? null,
    moveShift: async (id, i) => { calls.push(`move ${id}`); const s = { ...remote.get(id)!, start: i.startsAt, end: i.endsAt }; remote.set(id, s); return s; },
    deleteShift: async (id) => { calls.push(`delete ${id}`); remote.delete(id); },
    findShiftsBetween: async (from, to) => {
      searches.push(from.slice(0, 10));
      return [...remote.values()].filter((s) => s.start >= from && s.start <= to);
    },
    getUserName: async () => 'Jamie S.',
  };
  return { client, remote, calls, searches };
}

const base = (store: ShiftStore, client: SevenShiftsClient, alerts: unknown[], mode: 'live' | 'dry-run' = 'live'): SyncDeps => ({
  store, client, mode, now: new Date('2026-10-02T15:00:00Z'), todayEastern: '2026-10-02',
  syncStart: '2026-10-02T00:00:00.000Z', sendAlert: async (a) => { alerts.push(a); },
});

describe('runPartyShiftSync', () => {
  it('creates two open shifts and records them active', async () => {
    const { store, shifts } = memoryStore([booking()]);
    const { client, calls } = fakeClient();
    const summary = await runPartyShiftSync(base(store, client, []));
    expect(summary.created).toBe(2);
    expect(calls).toEqual(['create', 'create']);
    expect([...shifts.values()].map((s) => s.status)).toEqual(['active', 'active']);
  });

  it('changes nothing in dry-run mode', async () => {
    const { store, shifts } = memoryStore([booking()]);
    const { client, calls } = fakeClient();
    const summary = await runPartyShiftSync(base(store, client, [], 'dry-run'));
    expect(calls).toEqual([]);
    expect(shifts.size).toBe(0);
    expect(summary.planned[0].actions).toHaveLength(2);
  });

  it('adopts an interrupted create instead of duplicating it', async () => {
    const pending: RecordedShift = { id: 'row-1', slot: 1, sevenShiftsShiftId: null, startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z', status: 'pending' };
    const active: RecordedShift = { ...pending, id: 'row-2', slot: 2, sevenShiftsShiftId: 402, status: 'active' };
    const orphan = { id: 401, start: pending.startsAt, end: pending.endsAt, user_id: null, notes: shiftNote(booking(), 1) };
    const { store, shifts } = memoryStore([booking()], [pending, active]);
    const { client, calls } = fakeClient([orphan, { ...orphan, id: 402, notes: shiftNote(booking(), 2) }]);
    const summary = await runPartyShiftSync(base(store, client, []));
    expect(calls).toEqual([]);
    expect(summary.adopted).toBe(1);
    expect(shifts.get('row-1')).toMatchObject({ status: 'active', sevenShiftsShiftId: 401 });
  });

  it('moves shifts silently when nobody holds them', async () => {
    const rows: RecordedShift[] = [1, 2].map((slot) => ({ id: `row-${slot}`, slot: slot as 1 | 2, sevenShiftsShiftId: 400 + slot, startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z', status: 'active' }));
    const { store } = memoryStore([booking({ start_time: '15:00:00', end_time: '17:00:00' })], rows);
    const { client, calls } = fakeClient(rows.map((r) => ({ id: r.sevenShiftsShiftId!, start: r.startsAt, end: r.endsAt, user_id: null, notes: '' })));
    const alerts: unknown[] = [];
    const summary = await runPartyShiftSync(base(store, client, alerts));
    expect(summary.moved).toBe(2);
    expect(calls).toEqual(['move 401', 'move 402']);
    expect(alerts).toHaveLength(0);
  });

  it('emails the manager when a held shift is cancelled', async () => {
    const row: RecordedShift = { id: 'row-1', slot: 1, sevenShiftsShiftId: 401, startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z', status: 'active' };
    const { store, shifts } = memoryStore([booking({ status: 'cancelled' })], [row]);
    const { client, calls } = fakeClient([{ id: 401, start: row.startsAt, end: row.endsAt, user_id: 42, notes: '' }]);
    const alerts: { subject: string }[] = [];
    const summary = await runPartyShiftSync(base(store, client, alerts));
    expect(calls).toEqual(['delete 401']);
    expect(summary.deleted).toBe(1);
    expect(alerts[0].subject).toMatch(/^Party cancelled/);
    expect(shifts.get('row-1')!.status).toBe('deleted');
  });

  it('marks a shift deleted by hand so the next run recreates it, and alerts', async () => {
    const rows: RecordedShift[] = [1, 2].map((slot) => ({ id: `row-${slot}`, slot: slot as 1 | 2, sevenShiftsShiftId: 400 + slot, startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z', status: 'active' }));
    const { store, shifts } = memoryStore([booking({ start_time: '15:00:00', end_time: '17:00:00' })], rows);
    const { client } = fakeClient([{ id: 402, start: rows[1].startsAt, end: rows[1].endsAt, user_id: null, notes: '' }]);
    const alerts: { subject: string }[] = [];
    await runPartyShiftSync(base(store, client, alerts));
    expect(shifts.get('row-1')!.status).toBe('deleted');
    expect(alerts[0].subject).toMatch(/^Party shift recreated/);
  });

  it('records an error and carries on when 7shifts fails', async () => {
    const { store } = memoryStore([booking()]);
    const { client } = fakeClient();
    client.createOpenShift = async () => { throw new Error('7shifts down'); };
    const summary = await runPartyShiftSync(base(store, client, []));
    expect(summary.errors).toHaveLength(2);
    expect(summary.errors[0].message).toBe('7shifts down');
  });

  it('still deletes and records a held shift when the cancellation alert cannot be sent', async () => {
    const row: RecordedShift = { id: 'row-1', slot: 1, sevenShiftsShiftId: 401, startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z', status: 'active' };
    const { store, shifts } = memoryStore([booking({ status: 'cancelled' })], [row]);
    const { client, calls } = fakeClient([{ id: 401, start: row.startsAt, end: row.endsAt, user_id: 42, notes: '' }]);
    const deps = base(store, client, []);
    deps.sendAlert = async () => { throw new Error('smtp down'); };
    const summary = await runPartyShiftSync(deps);
    expect(calls).toEqual(['delete 401']);
    expect(shifts.get('row-1')!.status).toBe('deleted');
    expect(summary.deleted).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0].action).toBe('alert:delete');
    expect(summary.errors[0].message).toMatch(/^alert not sent \(Party cancelled: Ava's party.*\): smtp down$/);
  });

  it('sends the moved alert naming "Someone" when the holder lookup fails', async () => {
    const rows: RecordedShift[] = [1, 2].map((slot) => ({ id: `row-${slot}`, slot: slot as 1 | 2, sevenShiftsShiftId: 400 + slot, startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z', status: 'active' }));
    const { store } = memoryStore([booking({ start_time: '15:00:00', end_time: '17:00:00' })], rows);
    const { client } = fakeClient([{ id: 401, start: rows[0].startsAt, end: rows[0].endsAt, user_id: 42, notes: '' }, { id: 402, start: rows[1].startsAt, end: rows[1].endsAt, user_id: null, notes: '' }]);
    client.getUserName = async () => { throw new Error('lookup failed'); };
    const alerts: { subject: string; text: string }[] = [];
    const summary = await runPartyShiftSync(base(store, client, alerts));
    expect(summary.moved).toBe(2);
    expect(summary.errors).toHaveLength(0);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].text).toContain('Someone');
  });

  it('adopts an interrupted create left on the old day after the party moved date', async () => {
    const old = { startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z' };
    const pending: RecordedShift = { id: 'row-1', slot: 1, sevenShiftsShiftId: null, ...old, status: 'pending' };
    const active: RecordedShift = { ...pending, id: 'row-2', slot: 2, sevenShiftsShiftId: 402, status: 'active' };
    const orphan = { id: 401, start: old.startsAt, end: old.endsAt, user_id: null, notes: shiftNote(booking(), 1) };
    const moved = booking({ party_date: '2026-10-25' });
    const { store, shifts } = memoryStore([moved], [pending, active]);
    const { client, calls, searches } = fakeClient([orphan, { ...orphan, id: 402, notes: shiftNote(booking(), 2) }]);
    const summary = await runPartyShiftSync(base(store, client, []));
    expect(calls).not.toContain('create');
    expect(calls).toEqual(['move 401', 'move 402']);
    expect(searches[0]).toBe('2026-10-18');
    expect(summary.adopted).toBe(1);
    expect(shifts.get('row-1')).toMatchObject({ status: 'active', sevenShiftsShiftId: 401, startsAt: '2026-10-25T16:30:00.000Z' });
  });

  it('finds and deletes the shift behind a pending row with no id before calling it gone', async () => {
    const old = { startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z' };
    const pending: RecordedShift = { id: 'row-1', slot: 1, sevenShiftsShiftId: null, ...old, status: 'pending' };
    const orphan = { id: 401, start: old.startsAt, end: old.endsAt, user_id: null, notes: shiftNote(booking(), 1) };
    const { store, shifts } = memoryStore([booking({ party_date: '2026-10-25', status: 'cancelled' })], [pending]);
    const { client, calls, searches } = fakeClient([orphan]);
    const summary = await runPartyShiftSync(base(store, client, []));
    expect(searches[0]).toBe('2026-10-18');
    expect(calls).toEqual(['delete 401']);
    expect(summary.deleted).toBe(1);
    expect(shifts.get('row-1')!.status).toBe('deleted');
  });

  it('reports a party changed after its shifts started instead of touching them', async () => {
    const rows: RecordedShift[] = [1, 2].map((slot) => ({ id: `row-${slot}`, slot: slot as 1 | 2, sevenShiftsShiftId: 400 + slot, startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z', status: 'active' }));
    const { store } = memoryStore([booking({ start_time: '18:00:00', end_time: '20:00:00' })], rows);
    const { client, calls } = fakeClient(rows.map((r) => ({ id: r.sevenShiftsShiftId!, start: r.startsAt, end: r.endsAt, user_id: 42, notes: '' })));
    const deps = { ...base(store, client, []), now: new Date('2026-10-18T17:00:00Z') };
    const summary = await runPartyShiftSync(deps);
    expect(calls).toEqual([]);
    expect(summary.skipped).toEqual([{ bookingId: B, reason: 'shifts already started' }]);
    expect(summary.unchanged).toBe(0);
  });

  it('records a malformed booking as a plan error and still syncs the next one', async () => {
    const bad = booking({ id: '00000000-0000-4000-8000-000000000000', start_time: 'garbage' });
    const { store, shifts } = memoryStore([bad, booking()]);
    const { client, calls } = fakeClient();
    const summary = await runPartyShiftSync(base(store, client, []));
    expect(summary.errors).toEqual([{ bookingId: bad.id, action: 'plan', message: expect.any(String) }]);
    expect(summary.created).toBe(2);
    expect(calls).toEqual(['create', 'create']);
    expect([...shifts.values()].map((s) => s.status)).toEqual(['active', 'active']);
  });
});
