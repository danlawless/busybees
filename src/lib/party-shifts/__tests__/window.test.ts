import { describe, expect, it } from 'vitest';
import { easternDayBounds, easternToUtc, sameWindow, shiftWindow } from '@/lib/party-shifts/window';

describe('easternToUtc', () => {
  it('converts summer (EDT, UTC-4) wall-clock time', () => {
    expect(easternToUtc('2026-10-18', '13:00').toISOString()).toBe('2026-10-18T17:00:00.000Z');
  });

  it('converts winter (EST, UTC-5) wall-clock time', () => {
    expect(easternToUtc('2026-12-12', '13:00').toISOString()).toBe('2026-12-12T18:00:00.000Z');
  });

  it('handles the fall-back day (1 Nov 2026)', () => {
    expect(easternToUtc('2026-11-01', '13:00').toISOString()).toBe('2026-11-01T18:00:00.000Z');
  });

  it('reads the repeated 01:30 on fall-back night as the first one (EDT)', () => {
    // 01:30 happens twice on 1 Nov 2026: 05:30Z (EDT) and 06:30Z (EST).
    // The first guess is taken at an EDT instant and confirmed there, so the
    // earlier occurrence wins.
    expect(easternToUtc('2026-11-01', '01:30').toISOString()).toBe('2026-11-01T05:30:00.000Z');
  });

  it('handles the spring-forward day (14 Mar 2027)', () => {
    expect(easternToUtc('2027-03-14', '13:00').toISOString()).toBe('2027-03-14T17:00:00.000Z');
  });

  it('accepts HH:MM:SS as stored by Postgres', () => {
    expect(easternToUtc('2026-10-18', '13:00:00').toISOString()).toBe('2026-10-18T17:00:00.000Z');
  });
});

describe('shiftWindow', () => {
  it('runs from 30 minutes before to 30 minutes after the party', () => {
    expect(shiftWindow('2026-10-18', '13:00', '15:00')).toEqual({
      startsAt: '2026-10-18T16:30:00.000Z',
      endsAt: '2026-10-18T19:30:00.000Z',
    });
  });
});

describe('easternDayBounds', () => {
  it('covers the Eastern calendar day in UTC', () => {
    expect(easternDayBounds('2026-10-18')).toEqual({
      fromIso: '2026-10-18T04:00:00.000Z',
      toIso: '2026-10-19T04:00:00.000Z',
    });
  });

  it('covers the 25-hour fall-back day', () => {
    expect(easternDayBounds('2026-11-01')).toEqual({
      fromIso: '2026-11-01T04:00:00.000Z',
      toIso: '2026-11-02T05:00:00.000Z',
    });
  });
});

describe('sameWindow', () => {
  it('compares instants, not string formatting', () => {
    expect(
      sameWindow(
        { startsAt: '2026-10-18T16:30:00Z', endsAt: '2026-10-18T19:30:00Z' },
        { startsAt: '2026-10-18T16:30:00.000Z', endsAt: '2026-10-18T19:30:00.000Z' }
      )
    ).toBe(true);
    expect(
      sameWindow(
        { startsAt: '2026-10-18T16:30:00Z', endsAt: '2026-10-18T19:30:00Z' },
        { startsAt: '2026-10-18T17:30:00Z', endsAt: '2026-10-18T20:30:00Z' }
      )
    ).toBe(false);
  });
});
