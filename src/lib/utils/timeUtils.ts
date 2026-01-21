/**
 * Time Utilities for Auto-Checkout
 * Handles timezone-aware closing time calculations
 */

/**
 * Calculate the next closing time in UTC based on timezone and closing time settings.
 * If we're past today's closing time, returns tomorrow's closing time.
 *
 * @param timezone - IANA timezone string (e.g., 'America/New_York')
 * @param closingTime - Time in HH:MM format (24-hour)
 * @returns ISO string of the next closing time in UTC
 */
export function getNextClosingTime(timezone: string, closingTime: string): string {
  const now = new Date();

  // Parse the closing time
  const [hours, minutes] = closingTime.split(':').map(Number);

  // Get the current date in the target timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const localDateStr = formatter.format(now); // YYYY-MM-DD format

  // Create a date string for today's closing time in the target timezone
  // We'll construct it manually to ensure proper timezone handling
  const closingDateStr = `${localDateStr}T${closingTime.padStart(5, '0')}:00`;

  // Convert to UTC by creating the date and adjusting for timezone offset
  // Using a more robust approach with Intl.DateTimeFormat
  const closingDateInTz = new Date(closingDateStr);

  // Get the UTC offset for the target timezone at the closing time
  const tzOffset = getTimezoneOffset(closingDateInTz, timezone);

  // Calculate the actual UTC time
  let closingTimeUtc = new Date(closingDateInTz.getTime() + tzOffset);

  // If we're already past today's closing time, use tomorrow
  if (closingTimeUtc <= now) {
    closingTimeUtc = new Date(closingTimeUtc.getTime() + 24 * 60 * 60 * 1000);
  }

  return closingTimeUtc.toISOString();
}

/**
 * Get the timezone offset in milliseconds for a given date and timezone.
 * Positive value means the local time is behind UTC.
 */
function getTimezoneOffset(date: Date, timezone: string): number {
  // Get the date parts in the target timezone
  const tzParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  }).formatToParts(date);

  const parts: Record<string, number> = {};
  for (const part of tzParts) {
    if (part.type !== 'literal') {
      parts[part.type] = parseInt(part.value, 10);
    }
  }

  // Create a date using the timezone's local time as if it were UTC
  const tzDate = new Date(Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  ));

  // The difference is the timezone offset
  return date.getTime() - tzDate.getTime();
}

/**
 * Check if the current time has passed the closing time for today in the given timezone.
 */
export function isPastClosingTime(timezone: string, closingTime: string): boolean {
  const now = new Date();

  // Get current time in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  }).formatToParts(now);

  const parts: Record<string, number> = {};
  for (const part of formatter) {
    if (part.type !== 'literal') {
      parts[part.type] = parseInt(part.value, 10);
    }
  }

  const currentMinutes = parts.hour * 60 + parts.minute;

  const [closingHour, closingMinute] = closingTime.split(':').map(Number);
  const closingMinutes = closingHour * 60 + closingMinute;

  return currentMinutes >= closingMinutes;
}

/**
 * Format a time string (HH:MM) to 12-hour format for display
 */
export function formatTimeDisplay(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Convert 12-hour time format to 24-hour HH:MM format
 */
export function to24HourFormat(hours: number, minutes: number, isPM: boolean): string {
  let hour24 = hours;
  if (isPM && hours !== 12) {
    hour24 = hours + 12;
  } else if (!isPM && hours === 12) {
    hour24 = 0;
  }
  return `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Common US timezones for the dropdown
 */
export const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' }
];
