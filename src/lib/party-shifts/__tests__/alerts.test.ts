import { describe, expect, it } from 'vitest';
import { cancelledAlert, formatEasternRange, movedAlert, removedByHandAlert } from '@/lib/party-shifts/alerts';
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

  it('tells the manager a picked-up shift moved', () => {
    const alert = movedAlert(booking, 'Jamie S.', OLD, NEW);
    expect(alert.subject).toBe("Party shift moved: Ava's party, Sun Oct 18");
    expect(alert.text).toContain("Ava's party on Sun Oct 18 moved to 3:00 PM–5:00 PM.");
    expect(alert.text).toContain('Jamie S. had picked up the 12:30 PM–3:30 PM shift; it is now 2:30 PM–5:30 PM.');
  });

  it('tells the manager a picked-up shift was removed with the party', () => {
    const alert = cancelledAlert(booking, 'Jamie S.', OLD);
    expect(alert.subject).toBe("Party cancelled: Ava's party, Sun Oct 18");
    expect(alert.text).toContain('Jamie S. had picked up the 12:30 PM–3:30 PM shift; it has been removed from 7shifts.');
  });

  it('flags a shift someone deleted by hand', () => {
    const alert = removedByHandAlert(booking, 2);
    expect(alert.subject).toBe("Party shift recreated: Ava's party, Sun Oct 18");
    expect(alert.text).toContain('was deleted in 7shifts');
  });
});
