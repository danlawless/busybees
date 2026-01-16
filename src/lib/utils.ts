import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Animation variants for Framer Motion
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
}

export const slideInRight = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
}

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
}

export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 }
}

// Utility functions for pricing
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

// Age group helpers
export function getAgeGroupLabel(ageGroup: 'infant' | 'toddler' | 'child'): string {
  const labels = {
    infant: '0-2 years',
    toddler: '2-4 years',
    child: '4-6 years'
  }
  return labels[ageGroup]
}

// Date formatting helpers
/**
 * Formats a Date to YYYY-MM-DD string using LOCAL timezone.
 * This avoids the off-by-one bug caused by toISOString() which converts to UTC.
 * For example, in Pacific time (UTC-8), Jan 1st local becomes Dec 31st UTC.
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD date string to a Date object in LOCAL timezone.
 * This avoids the timezone bug where new Date("2025-01-18") parses as UTC midnight,
 * which for users west of UTC shifts the date back by one day.
 *
 * ALWAYS use this function instead of new Date(dateString) for date-only strings.
 */
export function parseDateString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Business hours helpers
export function isOpen(): boolean {
  const now = new Date()
  const day = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const hour = now.getHours()
  
  // Mon-Fri: 10 AM - 4 PM
  if (day >= 1 && day <= 5) {
    return hour >= 10 && hour < 16
  }
  
  // Weekends: Closed for open play, private bookings only 1-6 PM
  // Since this is for open play status, weekends are effectively closed
  return false
}

export function getBusinessHours(day?: number): string {
  const currentDay = day ?? new Date().getDay()
  
  // Mon-Fri
  if (currentDay >= 1 && currentDay <= 5) {
    return '10:00 AM - 4:00 PM'
  }
  
  // Sat-Sun
  if (currentDay === 0 || currentDay === 6) {
    return '1:00 PM - 6:00 PM (Private Bookings Only)'
  }
  
  return 'Closed'
}
