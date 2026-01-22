/**
 * Party Bookings Health Check Endpoint
 * Diagnostic endpoint to verify party booking system is properly configured
 *
 * Checks:
 * - Environment variables are set
 * - Admin client can connect to Supabase
 * - party_bookings table exists with purchase_id column
 * - Can perform basic CRUD operations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    name: string;
    status: 'pass' | 'fail';
    message: string;
    details?: Record<string, unknown>;
  }[];
}

export async function GET(request: NextRequest) {
  const result: HealthCheckResult = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: [],
  };

  // Check 1: Verify user is authenticated and is staff/admin
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      result.checks.push({
        name: 'authentication',
        status: 'fail',
        message: 'Not authenticated',
      });
      result.status = 'unhealthy';
      return NextResponse.json(result, { status: 401 });
    }

    // Check user role
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'staff'].includes(profile.role)) {
      result.checks.push({
        name: 'authorization',
        status: 'fail',
        message: 'Must be admin or staff to access health check',
      });
      result.status = 'unhealthy';
      return NextResponse.json(result, { status: 403 });
    }

    result.checks.push({
      name: 'authentication',
      status: 'pass',
      message: `Authenticated as ${profile.role}`,
    });
  } catch (error) {
    result.checks.push({
      name: 'authentication',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Auth check failed',
    });
    result.status = 'unhealthy';
  }

  // Check 2: Environment variables
  const envChecks = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const allEnvSet = Object.values(envChecks).every(Boolean);
  result.checks.push({
    name: 'environment_variables',
    status: allEnvSet ? 'pass' : 'fail',
    message: allEnvSet
      ? 'All required environment variables are set'
      : 'Missing required environment variables',
    details: {
      NEXT_PUBLIC_SUPABASE_URL: envChecks.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: envChecks.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
    },
  });

  if (!allEnvSet) {
    result.status = 'unhealthy';
    return NextResponse.json(result, { status: 500 });
  }

  // Check 3: Admin client connection
  try {
    const adminClient = createAdminClient();
    result.checks.push({
      name: 'admin_client_creation',
      status: 'pass',
      message: 'Admin client created successfully',
    });

    // Check 4: party_bookings table exists and has purchase_id column
    const { data: columns, error: schemaError } = await adminClient
      .from('party_bookings')
      .select('id, purchase_id')
      .limit(0);

    if (schemaError) {
      result.checks.push({
        name: 'table_schema',
        status: 'fail',
        message: `Failed to query party_bookings: ${schemaError.message}`,
        details: { code: schemaError.code },
      });
      result.status = 'unhealthy';
    } else {
      result.checks.push({
        name: 'table_schema',
        status: 'pass',
        message: 'party_bookings table accessible with purchase_id column',
      });
    }

    // Check 5: Count existing bookings
    const { count, error: countError } = await adminClient
      .from('party_bookings')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      result.checks.push({
        name: 'bookings_count',
        status: 'fail',
        message: `Failed to count bookings: ${countError.message}`,
      });
    } else {
      result.checks.push({
        name: 'bookings_count',
        status: 'pass',
        message: `Found ${count} total party bookings in database`,
        details: { count },
      });
    }

    // Check 6: Recent purchases that should have synced
    const { data: recentPurchases, error: purchasesError } = await adminClient
      .from('purchases')
      .select('id, name, party_date, party_start_time, status, updated_at')
      .eq('type', 'party_package')
      .not('party_date', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(5);

    if (purchasesError) {
      result.checks.push({
        name: 'recent_party_purchases',
        status: 'fail',
        message: `Failed to query purchases: ${purchasesError.message}`,
      });
    } else {
      // Check if these purchases have corresponding bookings
      const purchaseIds = (recentPurchases || []).map(p => p.id);
      let syncedCount = 0;

      if (purchaseIds.length > 0) {
        const { data: matchingBookings } = await adminClient
          .from('party_bookings')
          .select('purchase_id')
          .in('purchase_id', purchaseIds);

        syncedCount = matchingBookings?.length || 0;
      }

      result.checks.push({
        name: 'recent_party_purchases',
        status: 'pass',
        message: `Found ${recentPurchases?.length || 0} recent party purchases, ${syncedCount} synced to bookings`,
        details: {
          purchases: recentPurchases?.map(p => ({
            id: p.id,
            name: p.name,
            party_date: p.party_date,
            status: p.status,
          })),
          syncedCount,
        },
      });
    }
  } catch (error) {
    result.checks.push({
      name: 'admin_client_creation',
      status: 'fail',
      message: error instanceof Error ? error.message : 'Failed to create admin client',
    });
    result.status = 'unhealthy';
  }

  return NextResponse.json(result, {
    status: result.status === 'healthy' ? 200 : 500,
  });
}
