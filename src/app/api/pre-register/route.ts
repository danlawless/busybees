/**
 * API Route: Pre-Registration
 * POST - Create user account and children for families pre-registering before their visit
 *
 * This allows families to sign up before their first visit
 * so they don't hold up the line at the kiosk during check-in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { subscribeToNewsletter } from '@/lib/services/newsletter';
import { z } from 'zod';
import bcrypt from 'bcryptjs';

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
  password: z.string().min(6, 'Password must be at least 6 characters'),
  children: z.array(childSchema).min(1, 'At least one child is required'),
  marketingOptIn: z.boolean().optional(),
});

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

    const { parentName, email, password, children, marketingOptIn } = validationResult.data;

    // Clean phone number for storage (remove formatting)
    const cleanPhone = validationResult.data.phone.replace(/[^\d]/g, '');

    // Hash the password for web login
    const webPasswordHash = await bcrypt.hash(password, 10);

    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Check if user already exists by phone or email
    const { data: existingByPhone } = await supabase
      .from('users')
      .select('id, phone, email')
      .eq('phone', cleanPhone)
      .single();

    if (existingByPhone) {
      logger.info({ phone: cleanPhone }, 'Pre-registration: Phone already registered');
      return NextResponse.json(
        { error: 'This phone number is already registered. You can check in at the kiosk using your phone number.' },
        { status: 409 }
      );
    }

    // Check email in auth users
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers();
    const existingByEmail = existingAuthUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingByEmail) {
      logger.info({ email }, 'Pre-registration: Email already registered');
      return NextResponse.json(
        { error: 'This email is already registered. You may already have an account - try checking in with your phone number.' },
        { status: 409 }
      );
    }

    // Create Supabase Auth user with phone-based password (same as POS signup)
    const authPassword = `PHONE-${cleanPhone}`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: authPassword,
      email_confirm: true, // Pre-confirmed since they verified email by submitting
      user_metadata: {
        name: parentName.trim(),
        phone: cleanPhone,
        role: 'customer',
      },
    });

    if (authError) {
      logger.error({ error: authError, email }, 'Failed to create auth user for pre-registration');

      if (authError.message?.includes('already been registered') || authError.status === 422) {
        return NextResponse.json(
          { error: 'This email is already registered. You may already have an account - try checking in with your phone number.' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create account. Please try again.' },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create user profile record with web password
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: newUser, error: userError } = await (supabase.from('users') as any)
      .insert({
        id: authData.user.id,
        phone: cleanPhone,
        name: parentName.trim(),
        email: email.trim().toLowerCase(),
        role: 'customer',
        has_web_password: true,
        web_password_hash: webPasswordHash,
      })
      .select()
      .single();

    if (userError) {
      logger.error({ error: userError, email }, 'Failed to create user profile for pre-registration');
      // Clean up auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create children records
    const childrenToInsert = children.map((child) => ({
      customer_id: authData.user.id,
      name: child.name.trim(),
      birthdate: child.birthdate,
      waiver_signed: false,
    }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: childrenError } = await (supabase.from('children') as any)
      .insert(childrenToInsert);

    if (childrenError) {
      logger.error({ error: childrenError, userId: authData.user.id }, 'Failed to create children for pre-registration');
      // Don't fail the whole registration if children creation fails
      // The user can add children later at the kiosk
    }

    logger.info(
      { userId: authData.user.id, email, childrenCount: children.length },
      'Pre-registration successful - user account created'
    );

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
      message: 'Account created! You\'re all set for your visit.',
      userId: newUser.id,
    });

  } catch (error) {
    logger.error({ error }, 'Pre-registration error');
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
