/**
 * Business hours: regular schedule + Summer Hours override.
 *
 * Summer Hours window: 2026-06-29 through 2026-08-30 (inclusive). During this
 * window:
 *   - Mon–Fri: 11:00 AM – 6:00 PM
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
  { label: 'Mon - Fri', time: '11:00 AM - 6:00 PM', type: 'Open Play', isWeekday: true },
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
  { day: 'Monday', hours: '11:00 AM - 6:00 PM', type: 'open-play' },
  { day: 'Tuesday', hours: '11:00 AM - 6:00 PM', type: 'open-play' },
  { day: 'Wednesday', hours: '11:00 AM - 6:00 PM', type: 'open-play' },
  { day: 'Thursday', hours: '11:00 AM - 6:00 PM', type: 'open-play' },
  { day: 'Friday', hours: '11:00 AM - 6:00 PM', type: 'open-play' },
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
    schedule: 'Mon-Fri: 11AM-6PM | Sat-Sun: 8AM-4PM',
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
    closes: '18:00',
  },
  {
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
    opens: '11:00',
    closes: '18:00',
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
