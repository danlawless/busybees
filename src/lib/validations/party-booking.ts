/**
 * Zod validation schemas for party booking
 * Ensures type-safe form validation with proper error messages
 */

import { z } from 'zod';
import { parseDateString } from '@/lib/utils';

// Phone number regex for (XXX) XXX-XXXX format
const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;

// Email regex for basic validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Party type enum
export const PartyTypeSchema = z.enum(['private', 'semi_private'], {
  message: 'Please select a party type',
});

// Package name enum (per issue requirements)
export const PackageNameSchema = z.enum(['queen_bee', 'worker_bee', 'basic_bee'], {
  message: 'Please select a party package',
});

// Contact information schema (Step 2)
export const ContactInfoSchema = z.object({
  customerName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  customerEmail: z
    .string()
    .regex(emailRegex, 'Please enter a valid email address'),
  customerPhone: z
    .string()
    .regex(phoneRegex, 'Please enter a valid phone number: (XXX) XXX-XXXX'),
  customerAddress: z
    .string()
    .min(10, 'Please enter a complete address')
    .max(200, 'Address must be less than 200 characters'),
});

// Party type selection schema (Step 3)
export const PartyTypeSelectionSchema = z.object({
  partyType: PartyTypeSchema,
});

// Package selection schema (Step 4)
export const PackageSelectionSchema = z.object({
  packageName: PackageNameSchema,
});

// Date and time selection schema (Step 5)
export const DateTimeSelectionSchema = z.object({
  partyDate: z
    .string()
    .refine((date) => {
      // Use parseDateString to avoid UTC vs local timezone bug
      // new Date("2025-01-18") parses as UTC midnight, which shifts
      // the date back one day for users west of UTC
      const selectedDate = parseDateString(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const minBookingDate = new Date(today);
      minBookingDate.setDate(minBookingDate.getDate() + 7); // At least a week in advance
      return selectedDate >= minBookingDate;
    }, 'Parties must be booked at least 1 week in advance'),
  startTime: z.string().min(1, 'Please select a time slot'),
  endTime: z.string().min(1, 'End time is required'),
});

// Guest count schema (Step 6) - Max 20 children per issue #101
export const GuestCountSchema = z.object({
  childName: z
    .string()
    .max(50, 'Child name must be less than 50 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),
  childAge: z
    .number()
    .min(0, 'Age must be 0 or greater')
    .max(12, 'Age must be 12 or less')
    .optional(),
  guestCount: z
    .number()
    .min(1, 'At least 1 guest is required')
    .max(20, 'Maximum 20 children allowed'),
  additionalKids: z
    .number()
    .min(0, 'Additional kids cannot be negative')
    .max(5, 'Maximum 5 additional kids allowed')
    .default(0),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

// Complete booking schema (all steps combined)
export const CompleteBookingSchema = z.object({
  // Contact Info
  customerName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be less than 100 characters'),
  customerEmail: z
    .string()
    .regex(emailRegex, 'Please enter a valid email address'),
  customerPhone: z
    .string()
    .regex(phoneRegex, 'Please enter a valid phone number: (XXX) XXX-XXXX'),
  customerAddress: z
    .string()
    .min(10, 'Please enter a complete address')
    .max(200, 'Address must be less than 200 characters'),

  // Party Type
  partyType: PartyTypeSchema,

  // Package
  packageName: PackageNameSchema,

  // Date & Time
  partyDate: z.string().min(1, 'Please select a date'),
  startTime: z.string().min(1, 'Please select a time slot'),
  endTime: z.string().min(1, 'End time is required'),

  // Guest Info - Max 20 children per issue #101
  // Child info is optional - waivers signed when party arrives
  childName: z
    .string()
    .max(50, 'Child name must be less than 50 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),
  childAge: z.number().min(0).max(12).optional(),
  guestCount: z
    .number()
    .min(1, 'At least 1 guest is required')
    .max(20, 'Maximum 20 children allowed'),
  additionalKids: z.number().min(0).max(5).default(0),
  notes: z.string().max(500).optional(),
});

// Type exports
export type PartyType = z.infer<typeof PartyTypeSchema>;
export type PackageName = z.infer<typeof PackageNameSchema>;
export type ContactInfo = z.infer<typeof ContactInfoSchema>;
export type PartyTypeSelection = z.infer<typeof PartyTypeSelectionSchema>;
export type PackageSelection = z.infer<typeof PackageSelectionSchema>;
export type DateTimeSelection = z.infer<typeof DateTimeSelectionSchema>;
export type GuestCount = z.infer<typeof GuestCountSchema>;
export type CompleteBooking = z.infer<typeof CompleteBookingSchema>;

// Package pricing configuration - Updated per issue #101
export const PACKAGE_PRICING = {
  queen_bee: {
    name: 'Queen Bee+',
    semiPrivatePrice: 500,
    privatePrice: 575,
    maxGuests: 20,
    duration: 2,
    description: 'Premium package with pizza, soda, cake and balloons',
    features: [
      '15 kids included',
      'Paper goods (plates, cups, napkins, utensils)',
      'Exclusive use of party room',
      'Pizza for all guests',
      'Soda for all guests',
      'Birthday cake included',
      'Balloon decorations',
      'Dedicated party host assistance',
    ],
  },
  worker_bee: {
    name: 'Worker Bee+',
    semiPrivatePrice: 450,
    privatePrice: 525,
    maxGuests: 20,
    duration: 2,
    description: 'Essential package with pizza and soda',
    features: [
      '15 kids included',
      'Paper goods (plates, cups, napkins, utensils)',
      'Exclusive use of party room',
      'Pizza for all guests',
      'Soda for all guests',
      'Dedicated party host assistance',
      'Party setup & breakdown handled',
      'Access to play area during party',
    ],
  },
  basic_bee: {
    name: 'Basic Bee',
    semiPrivatePrice: 400,
    privatePrice: 475,
    maxGuests: 20,
    duration: 2,
    description: 'Standard package with paper goods',
    features: [
      '15 kids included',
      'Paper goods (plates, cups, napkins, utensils)',
      'Exclusive use of party room',
      'Birthday crown for birthday child',
      'Access to play area during party',
      'Dedicated party host assistance',
      'Basic cleanup service included',
      'Party setup & breakdown handled',
    ],
  },
} as const;

// Time slots are now stored in the database (party_time_slots table)
// No hardcoded fallbacks - fetch from /api/party-booking/time-slots

// Additional kids pricing - per issue #101
export const ADDITIONAL_KIDS_PRICE = 15; // $15 per additional kid
export const INCLUDED_KIDS = 15; // 15 kids included with each package
export const MAX_CHILDREN = 20; // Maximum 20 children total per issue #101

/**
 * Calculate total price for a party booking
 */
export function calculateBookingPrice(
  packageName: PackageName,
  partyType: PartyType,
  guestCount: number
): { basePrice: number; additionalKidsPrice: number; totalPrice: number; additionalKids: number } {
  const packageInfo = PACKAGE_PRICING[packageName];
  const basePrice = partyType === 'private' ? packageInfo.privatePrice : packageInfo.semiPrivatePrice;

  const additionalKids = Math.max(0, guestCount - INCLUDED_KIDS);
  const additionalKidsPrice = additionalKids * ADDITIONAL_KIDS_PRICE;
  const totalPrice = basePrice + additionalKidsPrice;

  return {
    basePrice,
    additionalKidsPrice,
    totalPrice,
    additionalKids,
  };
}

/**
 * @deprecated Time slots should be fetched from the database via /api/party-booking/time-slots
 * This function is kept for type compatibility but throws an error if called.
 */
export function getAvailableTimeSlots(
  _date: Date,
  _partyType: PartyType
): Array<{ startTime: string; endTime: string; label: string }> {
  throw new Error(
    'getAvailableTimeSlots is deprecated. Time slots must be fetched from the database via /api/party-booking/time-slots'
  );
}

/**
 * Check if a date is valid for booking (at least 1 week in advance)
 */
export function isValidBookingDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + 7);
  return date >= minDate;
}

/**
 * @deprecated Check availability via the database, not this function
 */
export function hasAvailableSlots(_date: Date, _partyType: PartyType): boolean {
  throw new Error(
    'hasAvailableSlots is deprecated. Check availability via /api/party-booking/time-slots'
  );
}
