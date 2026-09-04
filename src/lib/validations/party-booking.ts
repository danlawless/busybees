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
export const PackageNameSchema = z.enum(['queen_bee', 'worker_bee', 'basic_bee', 'group_rate'], {
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

// Guest count schema (Step 6) - Max 20 children (30 for group rate)
export const GuestCountSchema = z.object({
  childName: z
    .string()
    .min(1, 'Birthday child\'s name is required')
    .max(50, 'Child name must be less than 50 characters')
    .transform((val) => val.trim()),
  childAge: z
    .number({
      required_error: 'Please enter the age the child is turning',
      invalid_type_error: 'Please enter the age the child is turning',
    })
    .min(1, 'Age must be at least 1')
    .max(12, 'Age must be 12 or less'),
  guestCount: z
    .number()
    .min(1, 'At least 1 guest is required')
    .max(30, 'Maximum 30 children allowed'),
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

  // Guest Info - Max 20 children per issue #101 (30 for group rate)
  childName: z
    .string()
    .min(1, 'Birthday child\'s name is required')
    .max(50, 'Child name must be less than 50 characters')
    .transform((val) => val.trim()),
  childAge: z
    .number({
      required_error: 'Please enter the age the child is turning',
      invalid_type_error: 'Please enter the age the child is turning',
    })
    .min(1, 'Age must be at least 1')
    .max(12, 'Age must be 12 or less'),
  guestCount: z
    .number()
    .min(1, 'At least 1 guest is required')
    .max(30, 'Maximum 30 children allowed'),
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
    privatePrice: 600,
    maxGuests: 25,
    includedKids: 20,
    duration: 2,
    description: 'Largest package — 20 kids included',
    features: [
      '20 kids included',
      'Paper goods (plates, cups, napkins, utensils)',
      'Exclusive use of party room',
      'Customized digital invitations for your guests',
      'Dedicated party host assistance',
      'Cleanup service included',
      'Party setup & breakdown handled',
      'Access to play area during party',
      'Bring your own food, cake and decorations',
    ],
  },
  worker_bee: {
    name: 'Worker Bee+',
    semiPrivatePrice: 450,
    privatePrice: 550,
    maxGuests: 20,
    includedKids: 15,
    duration: 2,
    description: 'Room, invitations and a dedicated host',
    features: [
      '15 kids included',
      'Paper goods (plates, cups, napkins, utensils)',
      'Exclusive use of party room',
      'Customized digital invitations for your guests',
      'Dedicated party host assistance',
      'Cleanup service included',
      'Party setup & breakdown handled',
      'Access to play area during party',
      'Bring your own food, cake and decorations',
    ],
  },
  basic_bee: {
    name: 'Basic Bee',
    semiPrivatePrice: 400,
    privatePrice: 500,
    maxGuests: 20,
    includedKids: 10,
    duration: 2,
    description: 'Standard package — 10 kids included',
    features: [
      '10 kids included',
      'Paper goods (plates, cups, napkins, utensils)',
      'Exclusive use of party room',
      'Customized digital invitations for your guests',
      'Access to play area during party',
      'Dedicated party host assistance',
      'Cleanup service included',
      'Party setup & breakdown handled',
      'Bring your own food, cake and decorations',
    ],
  },
  group_rate: {
    name: 'Group Rate',
    semiPrivatePrice: 0, // Not applicable - uses per-child pricing
    privatePrice: 0, // Not applicable - uses per-child pricing
    maxGuests: 30,
    duration: 2,
    description: 'Group rate: $15 per child, any age, min 10, max 30',
    features: [
      '$15 per child, any age',
      'Minimum 10 children',
      'Maximum 30 children',
      'Access to play area',
      'Dedicated group coordinator',
    ],
  },
} as const;

// Time slots are now stored in the database (party_time_slots table)
// No hardcoded fallbacks - fetch from /api/party-booking/time-slots

// Additional kids pricing - per issue #101
export const ADDITIONAL_KIDS_PRICE = 15; // $15 per additional kid
/**
 * Fallback for screens that need a number before a package has been chosen.
 * The authoritative count is PACKAGE_PRICING[pkg].includedKids, which differs
 * per tier -- do not treat this as "what a package includes".
 */
export const INCLUDED_KIDS = 15;
export const MAX_CHILDREN = 20; // Maximum 20 children total per issue #101

// Group rate pricing (age-based)
/**
 * One rate per child, whatever their age. The group rate used to split at age
 * two ($12 / $5); from 1 October 2026 it is flat, so there is a single number
 * here rather than two that have to be kept in step.
 */
export const GROUP_RATE_PRICE_PER_CHILD = 15;
export const GROUP_RATE_MIN_CHILDREN = 10;
export const GROUP_RATE_MAX_CHILDREN = 30;

/**
 * Calculate total price for a party booking
 */
export function calculateBookingPrice(
  packageName: PackageName,
  partyType: PartyType,
  guestCount: number
): { basePrice: number; additionalKidsPrice: number; totalPrice: number; additionalKids: number } {
  // Group rate is charged per child at one flat rate, so the guest count is
  // the whole calculation -- no base price and no additional-child tier.
  if (packageName === 'group_rate') {
    const totalPrice = guestCount * GROUP_RATE_PRICE_PER_CHILD;
    return {
      basePrice: 0,
      additionalKidsPrice: 0,
      totalPrice,
      additionalKids: 0,
    };
  }

  const packageInfo = PACKAGE_PRICING[packageName];
  const basePrice = partyType === 'private' ? packageInfo.privatePrice : packageInfo.semiPrivatePrice;

  const includedKids = packageInfo.includedKids;
  const additionalKids = Math.max(0, guestCount - includedKids);
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
