/**
 * API Route: Pre-Registration
 * GET - List all pre-registrations (staff/admin only)
 * POST - Submit pre-registration for Grand Opening
 *
 * This allows families to pre-register before their first visit
 * so they don't hold up the line at the kiosk during check-in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { subscribeToNewsletter } from '@/lib/services/newsletter';
import { z } from 'zod';

// Child schema for validation
const childSchema = z.object({
  name: z.string().min(1, 'Child name is required'),
  birthdate: z.string().min(1, 'Birth date is required'),
});

// Pre-registration request schema
const preRegisterSchema = z.object({
  parentName: z.string().min(1, 'Parent/Guardian name is required'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Please enter a valid phone number'),
  children: z.array(childSchema).min(1, 'At least one child is required'),
  marketingOptIn: z.boolean().optional(),
});

// Type definitions for pre-registration records
interface PreRegistrationRecord {
  id: string;
  email: string;
  phone: string;
}

// Type for child data in pre-registrations
interface PreRegistrationChild {
  name: string;
  birthdate: string;
}

// Type for full pre-registration row
interface PreRegistrationRow {
  id: string;
  parent_name: string;
  email: string;
  phone: string;
  children: PreRegistrationChild[];
  marketing_opt_in: boolean;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * GET /api/pre-register
 * List all pre-registrations (staff/admin only)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user role - only staff and admin can view pre-registrations
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userData || !['staff', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Use admin client to fetch all pre-registrations
    const adminSupabase = createAdminClient();
    const { data: preRegistrations, error } = await adminSupabase
      .from('pre_registrations')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch pre-registrations');
      return NextResponse.json(
        { error: 'Failed to fetch pre-registrations' },
        { status: 500 }
      );
    }

    // Calculate stats
    const total = preRegistrations?.length || 0;
    const totalChildren = (preRegistrations as PreRegistrationRow[] || []).reduce(
      (sum, reg) => sum + (Array.isArray(reg.children) ? reg.children.length : 0),
      0
    );

    logger.info(
      { userId: user.id, count: total },
      'Pre-registrations fetched'
    );

    return NextResponse.json({
      preRegistrations: preRegistrations || [],
      stats: {
        total,
        totalChildren,
      },
    });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch pre-registrations');
    return NextResponse.json(
      { error: 'Failed to fetch pre-registrations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate the request body
    const validationResult = preRegisterSchema.safeParse(body);

    if (!validationResult.success) {
      const errorMessages = validationResult.error.issues.map((issue) => issue.message).join(', ');
      logger.warn({ errors: errorMessages }, 'Pre-registration validation failed');
      return NextResponse.json(
        { error: 'Validation failed', details: errorMessages },
        { status: 400 }
      );
    }

    const { parentName, email, children, marketingOptIn } = validationResult.data;

    // Clean phone number for storage (remove formatting)
    const cleanPhone = validationResult.data.phone.replace(/[^\d]/g, '');

    // Use admin client to bypass RLS for public pre-registration
    const supabase = createAdminClient();

    // Check if pre-registration already exists by phone or email
    // Note: Using type assertion due to Supabase client typing issues in this codebase
    const existingResult = await supabase
      .from('pre_registrations')
      .select('id, email, phone')
      .or(`phone.eq.${cleanPhone},email.eq.${email.toLowerCase()}`)
      .single();

    const existing = existingResult.data as PreRegistrationRecord | null;

    if (existing) {
      // Update existing pre-registration with new info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updateError } = await (supabase.from('pre_registrations') as any)
        .update({
          parent_name: parentName,
          email: email.toLowerCase(),
          phone: cleanPhone,
          children: children,
          marketing_opt_in: marketingOptIn ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (updateError) {
        logger.error({ error: updateError, email }, 'Failed to update pre-registration');
        return NextResponse.json(
          { error: 'Failed to update registration', details: updateError.message },
          { status: 500 }
        );
      }

      logger.info({ preRegistrationId: existing.id, email }, 'Updated existing pre-registration');

      // Subscribe to newsletter if marketing opt-in is enabled
      if (marketingOptIn !== false) {
        await subscribeToNewsletter({
          email,
          name: parentName,
          source: 'pre_register',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Pre-registration updated! Your information has been refreshed.',
        preRegistrationId: existing.id,
      });
    }

    // Create new pre-registration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertResult = await (supabase.from('pre_registrations') as any)
      .insert({
        parent_name: parentName,
        email: email.toLowerCase(),
        phone: cleanPhone,
        children: children,
        marketing_opt_in: marketingOptIn ?? true,
      })
      .select('id')
      .single();

    if (insertResult.error) {
      logger.error({ error: insertResult.error, email }, 'Failed to create pre-registration');
      return NextResponse.json(
        { error: 'Failed to create registration', details: insertResult.error.message },
        { status: 500 }
      );
    }

    const newRegistration = insertResult.data as { id: string } | null;

    if (!newRegistration) {
      logger.error({ email }, 'No pre-registration returned after insert');
      return NextResponse.json(
        { error: 'Failed to create registration' },
        { status: 500 }
      );
    }

    logger.info({ preRegistrationId: newRegistration.id, email }, 'Created new pre-registration');

    // Subscribe to newsletter if marketing opt-in is enabled (defaults to true)
    if (marketingOptIn !== false) {
      await subscribeToNewsletter({
        email,
        name: parentName,
        source: 'pre_register',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Pre-registration successful! You\'re all set for your visit.',
      preRegistrationId: newRegistration.id,
    });

  } catch (error) {
    logger.error({ error }, 'Pre-registration error');
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
