/**
 * Business hours: regular schedule + Summer Hours override.
 *
 * Summer Hours window: 2026-06-29 through 2026-08-30 (inclusive). During this
 * window:
 *   - Mon–Fri: 9:00 AM – 3:00 PM
 *   - Sat/Sun: 8:00 AM – 4:00 PM
 *   - The only party offering is a Semi-Private 1:00 PM – 4:00 PM slot on
 *     Sat/Sun (party room exclusive to guests; play area remains open to
 *     other families).
 *
 * Party time slots themselves live in the `party_time_slots` table; this
 * helper only powers the customer-facing display copy (Footer, Hours page,
 * Schema.org SEO metadata).
 */

const SUMMER_START = new Date('2026-06-29T00:00:00');
const SUMMER_END = new Date('2026-08-30T23:59:59');
const SUMMER_LEAD_IN_DAYS = 30;

export function isSummerHoursActive(now: Date = new Date()): boolean {
  return now >= SUMMER_START && now <= SUMMER_END;
}

/**
 * The party type a customer booking takes, based on the party's date.
 * During Summer Hours parties run as Semi-Private (party room is exclusive to
 * guests while the play area stays open for public play); the rest of the year
 * they are Private. This drives the booking record, time-slot lookup, and
 * confirmation email — NOT pricing. Customer parties are always billed at the
 * private rate (see the calculateBookingPrice callers in the booking flow).
 *
 * Pass the party date (not "now") so the type reflects when the party happens.
 */
export function getPartyTypeForDate(_date: Date): 'private' | 'semi_private' {
  // Semi-private parties retired on 1 October 2026. Every party ever booked was
  // private, and the summer schedule no longer changes that -- so this always
  // answers 'private'. The semi_private branch of the type, the stored bookings
  // and the admin views are left intact so historical records still read
  // correctly; nothing new is created with it.
  return 'private';
}

/**
 * True during the lead-in window before Summer Hours start, so the site can
 * surface an "upcoming change" notice while still displaying the regular
 * schedule that's actually in effect today.
 */
export function isSummerHoursUpcoming(now: Date = new Date()): boolean {
  const leadInStart = new Date(SUMMER_START);
  leadInStart.setDate(leadInStart.getDate() - SUMMER_LEAD_IN_DAYS);
  return now >= leadInStart && now < SUMMER_START;
}

export const SUMMER_HOURS_RANGE_LABEL = 'June 29 – August 30, 2026';
export const SUMMER_HOURS_START_LABEL = 'June 29, 2026';

// ----- Footer -----

export type FooterScheduleEntry = {
  label: string;
  time: string;
  type: string;
  isWeekday?: boolean;
};

const REGULAR_FOOTER_HOURS: FooterScheduleEntry[] = [
  { label: 'Mon - Fri', time: '9:00 AM - 5:00 PM', type: 'Open Play', isWeekday: true },
  { label: 'Sat / Sun', time: '9:00 AM - 12:30 PM', type: 'Open Play' },
  { label: '', time: '1:00 PM - 3:00 PM', type: 'Private Parties' },
  { label: '', time: '4:00 PM - 6:00 PM', type: 'Private Parties' },
];

const SUMMER_FOOTER_HOURS: FooterScheduleEntry[] = [
  { label: 'Mon - Fri', time: '9:00 AM - 3:00 PM', type: 'Open Play', isWeekday: true },
  { label: 'Sat / Sun', time: '8:00 AM - 4:00 PM', type: 'Open Play' },
  { label: '', time: '1:00 PM - 4:00 PM', type: 'Semi-Private Party' },
];

export function getFooterHours(now?: Date): FooterScheduleEntry[] {
  return isSummerHoursActive(now) ? SUMMER_FOOTER_HOURS : REGULAR_FOOTER_HOURS;
}

// ----- DetailedHours: weekly schedule -----

export type WeeklyScheduleEntry = {
  day: string;
  hours: string;
  type: 'open-play' | 'private-booking';
  additional?: string;
};

const REGULAR_WEEKLY_SCHEDULE: WeeklyScheduleEntry[] = [
  { day: 'Monday', hours: '9:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Tuesday', hours: '9:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Wednesday', hours: '9:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Thursday', hours: '9:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Friday', hours: '9:00 AM - 5:00 PM', type: 'open-play' },
  { day: 'Saturday', hours: '9:00 AM - 12:30 PM', type: 'open-play', additional: 'Open Play' },
  { day: 'Saturday', hours: '1:00 PM - 3:00 PM', type: 'private-booking', additional: 'Private Parties (2-hour slot)' },
  { day: 'Saturday', hours: '4:00 PM - 6:00 PM', type: 'private-booking', additional: 'Private Parties (2-hour slot)' },
  { day: 'Sunday', hours: '9:00 AM - 12:30 PM', type: 'open-play', additional: 'Open Play' },
  { day: 'Sunday', hours: '1:00 PM - 3:00 PM', type: 'private-booking', additional: 'Private Parties (2-hour slot)' },
  { day: 'Sunday', hours: '4:00 PM - 6:00 PM', type: 'private-booking', additional: 'Private Parties (2-hour slot)' },
];

const SUMMER_WEEKLY_SCHEDULE: WeeklyScheduleEntry[] = [
  { day: 'Monday', hours: '9:00 AM - 3:00 PM', type: 'open-play' },
  { day: 'Tuesday', hours: '9:00 AM - 3:00 PM', type: 'open-play' },
  { day: 'Wednesday', hours: '9:00 AM - 3:00 PM', type: 'open-play' },
  { day: 'Thursday', hours: '9:00 AM - 3:00 PM', type: 'open-play' },
  { day: 'Friday', hours: '9:00 AM - 3:00 PM', type: 'open-play' },
  { day: 'Saturday', hours: '8:00 AM - 4:00 PM', type: 'open-play', additional: 'Open Play (play area stays open all day)' },
  { day: 'Saturday', hours: '1:00 PM - 4:00 PM', type: 'private-booking', additional: 'Semi-Private Party (party room exclusive; play area remains open)' },
  { day: 'Sunday', hours: '8:00 AM - 4:00 PM', type: 'open-play', additional: 'Open Play (play area stays open all day)' },
  { day: 'Sunday', hours: '1:00 PM - 4:00 PM', type: 'private-booking', additional: 'Semi-Private Party (party room exclusive; play area remains open)' },
];

export function getWeeklySchedule(now?: Date): WeeklyScheduleEntry[] {
  return isSummerHoursActive(now) ? SUMMER_WEEKLY_SCHEDULE : REGULAR_WEEKLY_SCHEDULE;
}

// ----- DetailedHours: special programs -----

export type SpecialProgramEntry = {
  iconKey: 'calendar' | 'party';
  title: string;
  description: string;
  schedule: string;
};

const REGULAR_SPECIAL_PROGRAMS: SpecialProgramEntry[] = [
  {
    iconKey: 'calendar',
    title: 'Open Play Times',
    description: 'Drop-in play sessions where families can enjoy all play areas',
    schedule: 'Mon-Fri: 9AM-5PM | Sat-Sun: 9AM-12:30PM',
  },
  {
    iconKey: 'party',
    title: 'Private Party Bookings',
    description: 'Exclusive birthday parties and celebrations in 2-hour time slots',
    schedule: 'Sat-Sun: 1PM-3PM or 4PM-6PM (2-hour slots)',
  },
];

const SUMMER_SPECIAL_PROGRAMS: SpecialProgramEntry[] = [
  {
    iconKey: 'calendar',
    title: 'Open Play Times (Summer Hours)',
    description: 'Drop-in play sessions where families can enjoy all play areas',
    schedule: 'Mon-Fri: 9AM-3PM | Sat-Sun: 8AM-4PM',
  },
  {
    iconKey: 'party',
    title: 'Semi-Private Party Bookings (Summer Hours)',
    description: 'Birthdays with exclusive use of the party room while the play area stays open to other families',
    schedule: 'Sat-Sun: 1PM-4PM (3-hour slot)',
  },
];

export function getSpecialPrograms(now?: Date): SpecialProgramEntry[] {
  return isSummerHoursActive(now) ? SUMMER_SPECIAL_PROGRAMS : REGULAR_SPECIAL_PROGRAMS;
}

export const SUMMER_HOURS_NOTICE = {
  regular:
    'Weekends offer both Open Play (9AM-12:30PM) and Private Party Bookings (1PM-3PM and 4PM-6PM). We have TWO 2-hour time slots available each weekend afternoon for birthday parties, allowing us to accommodate multiple celebrations each day. Please book in advance to secure your preferred time slot.',
  summer:
    'Summer Hours are in effect through August 30, 2026. The play area is open all day on weekends (8AM-4PM). Birthday parties run as a Semi-Private 3-hour slot from 1PM-4PM on Saturdays and Sundays — party guests have exclusive use of the party room while the play area remains open to other families.',
} as const;

export function getHoursNotice(now?: Date): string {
  return isSummerHoursActive(now) ? SUMMER_HOURS_NOTICE.summer : SUMMER_HOURS_NOTICE.regular;
}

// ----- Open / Closed status (the "We Are Open / Closed" badge) -----

export type OpenStatus = { isOpen: boolean; label: string };

/** Day-of-week (0=Sun) and minutes-past-midnight in the business timezone (Eastern). */
function getEasternDayAndMinutes(now: Date): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const value = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[value('weekday')] ?? 0;
  let hour = parseInt(value('hour'), 10);
  if (hour === 24) hour = 0; // some environments render midnight as "24" with hour12:false
  const minute = parseInt(value('minute'), 10);
  return { day, minutes: hour * 60 + minute };
}

/**
 * Whether the play area is currently open for public play, evaluated in Eastern
 * time against the schedule actually in effect (Summer Hours included). This is
 * the source of truth for the open/closed badge so it always matches the weekly
 * schedule shown on the Hours page.
 *
 * Open-play windows:
 *   Summer  — Mon–Fri 9:00 AM–3:00 PM, Sat/Sun 8:00 AM–4:00 PM
 *   Regular — Mon–Fri 9:00 AM–5:00 PM, Sat/Sun 9:00 AM–12:30 PM
 */
export function getOpenStatus(now: Date = new Date()): OpenStatus {
  const { day, minutes } = getEasternDayAndMinutes(now);
  const isWeekend = day === 0 || day === 6;
  const summer = isSummerHoursActive(now);

  const window = summer
    ? isWeekend
      ? { start: 8 * 60, end: 16 * 60 }
      : { start: 9 * 60, end: 15 * 60 }
    : isWeekend
      ? { start: 9 * 60, end: 12 * 60 + 30 }
      : { start: 9 * 60, end: 17 * 60 };

  const isOpen = minutes >= window.start && minutes < window.end;
  return {
    isOpen,
    label: isOpen ? 'We Are Open for Public Play' : 'We Are Currently Closed',
  };
}

// ----- Schema.org openingHoursSpecification (SEO) -----

export type OpeningHoursSpec = {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string[];
  opens: string;
  closes: string;
};

const REGULAR_SCHEMA_HOURS: OpeningHoursSpec[] = [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '09:00',
    closes: '17:00',
  },
  {
    // Weekend open play runs 9:00 AM - 12:30 PM; the later close reflects the
    // private party slots that run through 6:00 PM.
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Saturday', 'Sunday'],
    opens: '09:00',
    closes: '18:00',
  },
];

const SUMMER_SCHEMA_HOURS: OpeningHoursSpec[] = [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '09:00',
    closes: '15:00',
  },
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Saturday', 'Sunday'],
    opens: '08:00',
    closes: '16:00',
  },
];

export function getOpeningHoursSpecification(now?: Date): OpeningHoursSpec[] {
  return isSummerHoursActive(now) ? SUMMER_SCHEMA_HOURS : REGULAR_SCHEMA_HOURS;
}
