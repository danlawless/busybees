/**
 * Party times are Eastern wall-clock; 7shifts wants UTC. Converted with Intl,
 * which knows the daylight-saving rules, so no time zone library is needed.
 */

const ZONE = 'America/New_York';
export const SHIFT_LEAD_MINUTES = 30;
export const SHIFT_TAIL_MINUTES = 30;

/** Minutes the Eastern clock is ahead of UTC at this instant (−240 or −300). */
function easternOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  const wallAsUtc = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second')
  );
  return Math.round((wallAsUtc - instant.getTime()) / 60000);
}

/** The UTC instant at which the Eastern clock reads `date` `time`. */
export function easternToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  // Guess with the offset at the wall time, then correct with the offset at
  // the guess — the second pass settles the hours around a DST change.
  const first = wall - easternOffsetMinutes(new Date(wall)) * 60000;
  return new Date(wall - easternOffsetMinutes(new Date(first)) * 60000);
}

export function shiftWindow(
  partyDate: string,
  startTime: string,
  endTime: string
): { startsAt: string; endsAt: string } {
  const start = easternToUtc(partyDate, startTime).getTime() - SHIFT_LEAD_MINUTES * 60000;
  const end = easternToUtc(partyDate, endTime).getTime() + SHIFT_TAIL_MINUTES * 60000;
  return { startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() };
}

/** Midnight to midnight Eastern, as UTC ISO strings. */
export function easternDayBounds(date: string): { fromIso: string; toIso: string } {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDate = next.toISOString().slice(0, 10);
  return {
    fromIso: easternToUtc(date, '00:00').toISOString(),
    toIso: easternToUtc(nextDate, '00:00').toISOString(),
  };
}

export function sameWindow(
  a: { startsAt: string; endsAt: string },
  b: { startsAt: string; endsAt: string }
): boolean {
  return (
    new Date(a.startsAt).getTime() === new Date(b.startsAt).getTime() &&
    new Date(a.endsAt).getTime() === new Date(b.endsAt).getTime()
  );
}
