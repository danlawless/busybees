/**
 * Zod validation schemas for events
 * Used in admin event CRUD API routes
 */

import { z } from 'zod';

export const EventStatusSchema = z.enum(['draft', 'published', 'cancelled']);

export const CreateEventSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  image_url: z
    .string()
    .url('Must be a valid URL'),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  event_date_end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  event_time_start: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Start time must be in HH:MM or HH:MM:SS format'),
  event_time_end: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'End time must be in HH:MM or HH:MM:SS format')
    .optional()
    .nullable(),
  is_free: z.boolean().optional().default(false),
  status: EventStatusSchema.optional().default('draft'),
});

export const UpdateEventSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .optional(),
  description: z
    .string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .nullable(),
  image_url: z
    .string()
    .url('Must be a valid URL')
    .optional(),
  event_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
  event_date_end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .optional()
    .nullable(),
  event_time_start: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Start time must be in HH:MM or HH:MM:SS format')
    .optional(),
  event_time_end: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'End time must be in HH:MM or HH:MM:SS format')
    .optional()
    .nullable(),
  is_free: z.boolean().optional(),
  status: EventStatusSchema.optional(),
});

// File validation constants
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export type CreateEventInput = z.infer<typeof CreateEventSchema>;
export type UpdateEventInput = z.infer<typeof UpdateEventSchema>;
