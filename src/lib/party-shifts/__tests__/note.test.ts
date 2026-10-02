import { describe, expect, it } from 'vitest';
import { formatEasternClock, parseShiftTag, shiftNote } from '@/lib/party-shifts/note';

const booking = {
  id: '6f1c2a5e-9d3b-4c1a-8e7f-0a1b2c3d4e5f',
  package_name: 'worker_bee',
  guest_count: 15,
  start_time: '13:00:00',
  end_time: '15:00:00',
};

describe('shiftNote', () => {
  it('names the package, head count and party time, and carries the tag', () => {
    expect(shiftNote(booking, 1)).toBe(
      '🎉 Birthday party: Worker Bee+, 15 kids, 1:00 PM–3:00 PM [bb:6f1c2a5e-9d3b-4c1a-8e7f-0a1b2c3d4e5f:1]'
    );
  });

  it('never includes customer contact details', () => {
    const note = shiftNote({ ...booking, customer_email: 'a@b.com', customer_phone: '555' } as never, 2);
    expect(note).not.toMatch(/@|555/);
  });
});

describe('parseShiftTag', () => {
  it('reads back the booking and slot', () => {
    expect(parseShiftTag(shiftNote(booking, 2))).toEqual({ bookingId: booking.id, slot: 2 });
  });

  it('ignores notes without a tag', () => {
    expect(parseShiftTag('Regular shift')).toBeNull();
    expect(parseShiftTag(null)).toBeNull();
  });
});

describe('formatEasternClock', () => {
  it('formats 24-hour times for people', () => {
    expect(formatEasternClock('09:30')).toBe('9:30 AM');
    expect(formatEasternClock('12:00:00')).toBe('12:00 PM');
    expect(formatEasternClock('00:15')).toBe('12:15 AM');
    expect(formatEasternClock('17:45')).toBe('5:45 PM');
  });
});
