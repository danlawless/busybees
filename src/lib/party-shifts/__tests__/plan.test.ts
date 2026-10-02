import { describe, expect, it } from 'vitest';
import { planPartyShifts, type BookingForShifts, type RecordedShift } from '@/lib/party-shifts/plan';

const NOW = new Date('2026-10-02T15:00:00Z');

const booking = (over: Partial<BookingForShifts> = {}): BookingForShifts => ({
  id: '6f1c2a5e-9d3b-4c1a-8e7f-0a1b2c3d4e5f',
  status: 'confirmed',
  party_date: '2026-10-18',
  start_time: '13:00:00',
  end_time: '15:00:00',
  package_name: 'worker_bee',
  guest_count: 15,
  child_name: 'Ava',
  ...over,
});

const WIN = { startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z' };

const shift = (slot: 1 | 2, over: Partial<RecordedShift> = {}): RecordedShift => ({
  id: `row-${slot}`,
  slot,
  sevenShiftsShiftId: 1000 + slot,
  ...WIN,
  status: 'active',
  ...over,
});

describe('planPartyShifts', () => {
  it('creates two shifts for a new confirmed party', () => {
    expect(planPartyShifts(booking(), [], NOW)).toEqual([
      { kind: 'create', slot: 1, ...WIN },
      { kind: 'create', slot: 2, ...WIN },
    ]);
  });

  it('creates only the missing shift when one exists', () => {
    expect(planPartyShifts(booking(), [shift(1)], NOW)).toEqual([{ kind: 'create', slot: 2, ...WIN }]);
  });

  it('recreates a shift that was deleted by hand', () => {
    expect(planPartyShifts(booking(), [shift(1), shift(2, { status: 'deleted' })], NOW)).toEqual([
      { kind: 'create', slot: 2, ...WIN },
    ]);
  });

  it('adopts a create that was interrupted', () => {
    const pending = shift(1, { status: 'pending', sevenShiftsShiftId: null });
    expect(planPartyShifts(booking(), [pending, shift(2)], NOW)).toEqual([
      { kind: 'adopt', shift: pending, ...WIN },
    ]);
  });

  it('does nothing when both shifts match', () => {
    expect(planPartyShifts(booking(), [shift(1), shift(2)], NOW)).toEqual([]);
  });

  it('moves both shifts when the party moves', () => {
    const moved = booking({ start_time: '15:00:00', end_time: '17:00:00' });
    const win = { startsAt: '2026-10-18T18:30:00.000Z', endsAt: '2026-10-18T21:30:00.000Z' };
    expect(planPartyShifts(moved, [shift(1), shift(2)], NOW)).toEqual([
      { kind: 'move', shift: shift(1), ...win },
      { kind: 'move', shift: shift(2), ...win },
    ]);
  });

  it('deletes live shifts when the party is cancelled', () => {
    const pending = shift(2, { status: 'pending', sevenShiftsShiftId: null });
    expect(planPartyShifts(booking({ status: 'cancelled' }), [shift(1), pending], NOW)).toEqual([
      { kind: 'delete', shift: shift(1) },
      { kind: 'delete', shift: pending },
    ]);
  });

  it('gives a pending booking no shifts, and removes any it had', () => {
    expect(planPartyShifts(booking({ status: 'pending' }), [], NOW)).toEqual([]);
    expect(planPartyShifts(booking({ status: 'pending' }), [shift(1)], NOW)).toEqual([
      { kind: 'delete', shift: shift(1) },
    ]);
  });

  it('leaves done parties alone', () => {
    expect(planPartyShifts(booking({ status: 'done' }), [shift(1)], NOW)).toEqual([]);
  });

  it('leaves a party alone once its shift window has started', () => {
    const during = new Date('2026-10-18T17:00:00Z');
    expect(planPartyShifts(booking({ status: 'cancelled' }), [shift(1)], during)).toEqual([]);
    expect(planPartyShifts(booking(), [], during)).toEqual([]);
  });

  it('never creates shifts for group visits', () => {
    expect(planPartyShifts(booking({ package_name: 'group_rate' }), [], NOW)).toEqual([]);
  });
});
