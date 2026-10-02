import { describe, expect, it } from 'vitest';
import { cancelledAlert, HELD_BACK_NOTE, heldBackAlert, formatEasternDatedRange, formatEasternRange, movedAlert, removedByHandAlert } from '@/lib/party-shifts/alerts';
import type { BookingForShifts } from '@/lib/party-shifts/plan';

const booking: BookingForShifts = {
  id: 'b1',
  status: 'confirmed',
  party_date: '2026-10-18',
  start_time: '15:00:00',
  end_time: '17:00:00',
  package_name: 'worker_bee',
  guest_count: 15,
  child_name: 'Ava',
};
const OLD = { startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z' };
const NEW = { startsAt: '2026-10-18T18:30:00.000Z', endsAt: '2026-10-18T21:30:00.000Z' };

describe('alerts', () => {
  it('formats an Eastern time range', () => {
    expect(formatEasternRange(OLD)).toBe('12:30 PM–3:30 PM');
  });

  it('formats an Eastern range with its day', () => {
    expect(formatEasternDatedRange(OLD)).toBe('Sun Oct 18, 12:30 PM–3:30 PM');
    // 11:30 PM Eastern is already the next day in UTC; the Eastern day is shown.
    expect(formatEasternDatedRange({ startsAt: '2026-10-19T03:30:00.000Z', endsAt: '2026-10-19T04:00:00.000Z' })).toBe(
      'Sun Oct 18, 11:30 PM–12:00 AM'
    );
  });

  it('tells the manager a picked-up shift moved', () => {
    const alert = movedAlert(booking, 'Jamie S.', OLD, NEW);
    expect(alert.subject).toBe("Party shift moved: Ava's party, Sun Oct 18");
    expect(alert.text).toContain("Ava's party on Sun Oct 18 moved to 3:00 PM–5:00 PM.");
    expect(alert.text).toContain(
      'Jamie S. had picked up the Sun Oct 18, 12:30 PM–3:30 PM shift; it is now Sun Oct 18, 2:30 PM–5:30 PM.'
    );
  });

  it('names both days when only the date of the party changed', () => {
    const moved = { ...booking, party_date: '2026-10-25', start_time: '13:00:00', end_time: '15:00:00' };
    const to = { startsAt: '2026-10-25T16:30:00.000Z', endsAt: '2026-10-25T19:30:00.000Z' };
    const alert = movedAlert(moved, 'Jamie S.', OLD, to);
    expect(alert.subject).toBe("Party shift moved: Ava's party, Sun Oct 25");
    expect(alert.text).toContain(
      'Jamie S. had picked up the Sun Oct 18, 12:30 PM–3:30 PM shift; it is now Sun Oct 25, 12:30 PM–3:30 PM.'
    );
  });

  it('tells the manager a picked-up shift was removed with the party', () => {
    const alert = cancelledAlert(booking, 'Jamie S.', OLD);
    expect(alert.subject).toBe("Party cancelled: Ava's party, Sun Oct 18");
    expect(alert.text).toContain(
      'Jamie S. had picked up the Sun Oct 18, 12:30 PM–3:30 PM shift; it has been removed from 7shifts.'
    );
  });

  it('flags a shift someone deleted by hand', () => {
    const alert = removedByHandAlert(booking, 2);
    expect(alert.subject).toBe("Party shift recreated: Ava's party, Sun Oct 18");
    expect(alert.text).toContain('was deleted in 7shifts');
    expect(alert.text).toContain('a new open shift will be posted within about ten minutes.');
  });

  it('tells the manager a changed party was left as it was', () => {
    const alert = heldBackAlert(booking);
    expect(alert.subject).toBe("Party shifts need a manager: Ava's party, Sun Oct 18");
    expect(alert.text).toBe(
      "Ava's party on Sun Oct 18 (3:00 PM–5:00 PM) was changed after one of its shifts had started, " +
        'so its shifts in 7shifts were left as they were.\n\nPlease update the shifts in 7shifts by hand.'
    );
  });

  it('says cancelled when the held-back party was cancelled', () => {
    const alert = heldBackAlert({ ...booking, status: 'cancelled' });
    expect(alert.text).toContain("Ava's party on Sun Oct 18 (3:00 PM–5:00 PM) was cancelled after one of its shifts had started,");
    expect(alert.text).not.toContain('was changed');
  });

  it('exports the note recorded once the manager is told', () => {
    expect(HELD_BACK_NOTE).toBe('held back: shifts already started; manager alerted');
  });
});
