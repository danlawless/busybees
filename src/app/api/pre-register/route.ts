/**
 * API Route: Pre-Registration
 * POST - Submit pre-registration for Grand Opening
 *
 * This allows families to pre-register before their first visit
 * so they don't hold up the line at the kiosk during check-in.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
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

// Type definitions
interface UserRecord {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

interface ChildRecord {
  name: string;
  birthdate: string;
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

    const { parentName, email, phone, children } = validationResult.data;

    // Clean phone number for storage (remove formatting)
    const cleanPhone = phone.replace(/[^\d]/g, '');

    const supabase = await createClient();

    // Check if user already exists by phone number
    // Note: Using type assertion due to Supabase client typing issues in this codebase
    const existingUserResult = await supabase
      .from('users')
      .select('id')
      .eq('phone', cleanPhone)
      .single();

    const existingUser = existingUserResult.data as UserRecord | null;

    let customerId: string;

    if (existingUser) {
      // User already exists - update their info and add any new children
      customerId = existingUser.id;

      // Update user info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('users') as any)
        .update({
          name: parentName,
          email: email,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customerId);

      logger.info({ customerId, email }, 'Updated existing pre-registration');
    } else {
      // Create new customer record
      // Generate a UUID for the new user
      const newUserId = crypto.randomUUID();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertResult = await (supabase.from('users') as any)
        .insert({
          id: newUserId,
          name: parentName,
          email: email,
          phone: cleanPhone,
          role: 'customer',
        })
        .select()
        .single();

      if (insertResult.error) {
        logger.error({ error: insertResult.error, email }, 'Failed to create pre-registration user');
        return NextResponse.json(
          { error: 'Failed to create registration', details: insertResult.error.message },
          { status: 500 }
        );
      }

      const newUser = insertResult.data as UserRecord | null;

      if (!newUser) {
        logger.error({ email }, 'No user returned after insert');
        return NextResponse.json(
          { error: 'Failed to create registration' },
          { status: 500 }
        );
      }

      customerId = newUser.id;
      logger.info({ customerId, email }, 'Created new pre-registration');
    }

    // Add children
    const childrenToInsert = children.map(child => ({
      customer_id: customerId,
      name: child.name,
      birthdate: child.birthdate,
      waiver_signed: false,
    }));

    // Get existing children for this customer
    const existingChildrenResult = await supabase
      .from('children')
      .select('name, birthdate')
      .eq('customer_id', customerId);

    const existingChildren = (existingChildrenResult.data || []) as ChildRecord[];

    // Filter out children that already exist (same name and birthdate)
    const existingChildSet = new Set(
      existingChildren.map(c => `${c.name.toLowerCase()}-${c.birthdate}`)
    );

    const newChildren = childrenToInsert.filter(
      child => !existingChildSet.has(`${child.name.toLowerCase()}-${child.birthdate}`)
    );

    if (newChildren.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const childInsertResult = await (supabase.from('children') as any).insert(newChildren);

      if (childInsertResult.error) {
        logger.error({ error: childInsertResult.error, customerId }, 'Failed to add children');
        // Don't fail the whole request - user was created successfully
      } else {
        logger.info({ customerId, childCount: newChildren.length }, 'Added children to pre-registration');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Pre-registration successful! You\'re all set for your visit.',
      customerId,
    });

  } catch (error) {
    logger.error({ error }, 'Pre-registration error');
    return NextResponse.json(
      { error: 'An unexpected error occurred', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
