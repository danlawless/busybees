/**
 * When an event is on.
 *
 * This lived inside EventsBoard, which meant the events page owned the only
 * definition of "upcoming". The homepage now needs the same answer, and two
 * definitions of the same word drift apart — so it lives here, and both read it.
 *
 * Everything is judged in Eastern time, like the rest of the business. The
 * browser's own clock was used before; a parent in Chicago looking at the site
 * at half past eleven would have seen tomorrow's event described as today's.
 */

import { easternNow } from '@/lib/services/report-aggregations';

export type EventCategory = 'happening-now' | 'upcoming' | 'past';

/** The fields scheduling cares about. Anything with these can be categorised. */
export interface SchedulableEvent {
  event_date: string;
  event_date_end: string | null;
  event_time_start: string;
  event_time_end: string | null;
}

export type Categorized<E extends SchedulableEvent> = E & { category: EventCategory };

/** Default length for an event that gives a start time but no end time. */
const ASSUMED_LENGTH_MINUTES = 120;

function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Today in Eastern time, as the YYYY-MM-DD strings the event columns hold. */
export function easternToday(): { date: string; minutes: number } {
  const et = easternNow();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${et.year}-${pad(et.month)}-${pad(et.day)}`,
    minutes: et.hour * 60 + et.minute,
  };
}

export function categorizeEvent<E extends SchedulableEvent>(
  event: E,
  today: { date: string; minutes: number } = easternToday()
): EventCategory {
  const start = event.event_date;
  const end = event.event_date_end || event.event_date;

  if (end < today.date) return 'past';
  if (start > today.date) return 'upcoming';

  // Today falls inside the event's run.
  const isFirstDay = start === today.date;
  const isLastDay = end === today.date;
  const startMinutes = minutesOf(event.event_time_start);
  const endMinutes = event.event_time_end
    ? minutesOf(event.event_time_end)
    : startMinutes + ASSUMED_LENGTH_MINUTES;

  // A middle day of a run is on all day; only the first and last days are
  // bounded by the clock.
  if (!isFirstDay && !isLastDay) return 'happening-now';

  if (isFirstDay && isLastDay) {
    if (today.minutes < startMinutes) return 'upcoming';
    return today.minutes <= endMinutes ? 'happening-now' : 'past';
  }

  if (isFirstDay) {
    return today.minutes >= startMinutes ? 'happening-now' : 'upcoming';
  }

  return today.minutes <= endMinutes ? 'happening-now' : 'past';
}

export function categorizeEvents<E extends SchedulableEvent>(
  events: E[],
  today: { date: string; minutes: number } = easternToday()
): { happeningNow: Categorized<E>[]; upcoming: Categorized<E>[]; past: Categorized<E>[] } {
  const happeningNow: Categorized<E>[] = [];
  const upcoming: Categorized<E>[] = [];
  const past: Categorized<E>[] = [];

  for (const event of events) {
    const category = categorizeEvent(event, today);
    const placed = { ...event, category } as Categorized<E>;
    if (category === 'happening-now') happeningNow.push(placed);
    else if (category === 'upcoming') upcoming.push(placed);
    else past.push(placed);
  }

  upcoming.sort((a, b) => a.event_date.localeCompare(b.event_date));
  past.sort((a, b) => b.event_date.localeCompare(a.event_date));

  return { happeningNow, upcoming, past };
}

/**
 * The one event worth a slot on the homepage, or null when there is nothing on.
 *
 * The soonest thing that has not started yet wins, and something already
 * running is only the fallback. That ordering is deliberate: a run like
 * "Football Sundays", ten weeks long, would otherwise hold the slot from
 * September to December while everything else came and went behind it.
 */
export function featuredEvent<E extends SchedulableEvent>(
  events: E[],
  today: { date: string; minutes: number } = easternToday()
): Categorized<E> | null {
  const { happeningNow, upcoming } = categorizeEvents(events, today);
  if (upcoming.length > 0) return upcoming[0];
  if (happeningNow.length > 0) {
    return [...happeningNow].sort((a, b) => a.event_date.localeCompare(b.event_date))[0];
  }
  return null;
}
