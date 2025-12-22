/**
 * Admin Party Packages API
 * GET /api/admin/party-packages - Get party package configuration
 * PUT /api/admin/party-packages - Update party package configuration
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { PACKAGE_PRICING } from '@/lib/validations/party-booking';
import { z } from 'zod';

const PackageConfigSchema = z.object({
  queen_bee: z.object({
    name: z.string(),
    semiPrivatePrice: z.number().min(0),
    privatePrice: z.number().min(0),
    maxGuests: z.number().min(1),
    duration: z.number().min(1),
    description: z.string(),
    features: z.array(z.string()),
  }),
  worker_bee: z.object({
    name: z.string(),
    semiPrivatePrice: z.number().min(0),
    privatePrice: z.number().min(0),
    maxGuests: z.number().min(1),
    duration: z.number().min(1),
    description: z.string(),
    features: z.array(z.string()),
  }),
  basic_bee: z.object({
    name: z.string(),
    semiPrivatePrice: z.number().min(0),
    privatePrice: z.number().min(0),
    maxGuests: z.number().min(1),
    duration: z.number().min(1),
    description: z.string(),
    features: z.array(z.string()),
  }),
});

async function checkAdminAuth(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();

  if (!userData || !['admin', 'staff'].includes(userData.role)) {
    return { authorized: false, error: 'Forbidden - Admin access required', status: 403 };
  }

  return { authorized: true, user };
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await checkAdminAuth(supabase);

    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // For now, return the package pricing from the validation file
    // In the future, this could be stored in the database for dynamic updates
    const packages = PACKAGE_PRICING;

    logger.info({ adminEmail: auth.user?.email }, 'Fetched party packages configuration');

    return NextResponse.json(packages);
  } catch (error) {
    logger.error({ error }, 'Unexpected error fetching party packages');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await checkAdminAuth(supabase);

    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const validatedData = PackageConfigSchema.parse(body);

    // TODO: Store package configuration in database
    // For now, this endpoint validates the data structure
    // In production, you would:
    // 1. Store the configuration in a settings table
    // 2. Update the validation file to read from the database
    // 3. Implement versioning for pricing changes

    logger.info({ adminEmail: auth.user?.email, updates: validatedData }, 'Updated party packages configuration');

    return NextResponse.json({
      success: true,
      message: 'Package configuration validated successfully',
      note: 'Configuration updates require code deployment to take effect',
      data: validatedData,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid package configuration', details: error.issues }, { status: 400 });
    }

    logger.error({ error }, 'Unexpected error updating party packages');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
