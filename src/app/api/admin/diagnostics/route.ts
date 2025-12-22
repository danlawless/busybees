/**
 * API Route: Admin Diagnostics
 * GET - Check database connectivity and customer data status
 *
 * This endpoint helps diagnose issues with customers not showing in the admin panel
 * by verifying environment variables, database connectivity, and data presence.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export async function GET() {
  const diagnostics: {
    timestamp: string;
    checks: {
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message: string;
      details?: unknown;
    }[];
    summary: {
      passed: number;
      failed: number;
      warnings: number;
    };
  } = {
    timestamp: new Date().toISOString(),
    checks: [],
    summary: { passed: 0, failed: 0, warnings: 0 },
  };

  // Check 1: Environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    diagnostics.checks.push({
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      status: 'fail',
      message: 'Environment variable is not set',
    });
  } else {
    diagnostics.checks.push({
      name: 'NEXT_PUBLIC_SUPABASE_URL',
      status: 'pass',
      message: 'Environment variable is configured',
      details: { url: supabaseUrl.substring(0, 30) + '...' },
    });
  }

  if (!serviceRoleKey) {
    diagnostics.checks.push({
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      status: 'fail',
      message: 'Environment variable is not set - admin queries will fail',
    });
  } else {
    diagnostics.checks.push({
      name: 'SUPABASE_SERVICE_ROLE_KEY',
      status: 'pass',
      message: 'Environment variable is configured',
      details: { keyPrefix: serviceRoleKey.substring(0, 10) + '...' },
    });
  }

  // Check 2: Admin client creation
  let supabase;
  try {
    supabase = createAdminClient();
    diagnostics.checks.push({
      name: 'Admin Client Creation',
      status: 'pass',
      message: 'Successfully created admin Supabase client',
    });
  } catch (error) {
    diagnostics.checks.push({
      name: 'Admin Client Creation',
      status: 'fail',
      message: 'Failed to create admin client',
      details: error instanceof Error ? error.message : 'Unknown error',
    });

    // Calculate summary and return early
    diagnostics.checks.forEach((check) => {
      if (check.status === 'pass') diagnostics.summary.passed++;
      else if (check.status === 'fail') diagnostics.summary.failed++;
      else diagnostics.summary.warnings++;
    });

    logger.error({ diagnostics }, 'Diagnostics check failed - cannot create admin client');
    return NextResponse.json(diagnostics, { status: 500 });
  }

  // Check 3: Database connectivity
  try {
    const { error: pingError } = await supabase.from('users').select('count', { count: 'exact', head: true });

    if (pingError) {
      diagnostics.checks.push({
        name: 'Database Connectivity',
        status: 'fail',
        message: 'Failed to query database',
        details: { code: pingError.code, message: pingError.message },
      });
    } else {
      diagnostics.checks.push({
        name: 'Database Connectivity',
        status: 'pass',
        message: 'Successfully connected to database',
      });
    }
  } catch (error) {
    diagnostics.checks.push({
      name: 'Database Connectivity',
      status: 'fail',
      message: 'Database connection error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check 4: Count total users
  try {
    const { count: totalUsers, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      diagnostics.checks.push({
        name: 'Total Users Count',
        status: 'fail',
        message: 'Failed to count users',
        details: { code: countError.code, message: countError.message },
      });
    } else {
      diagnostics.checks.push({
        name: 'Total Users Count',
        status: totalUsers && totalUsers > 0 ? 'pass' : 'warning',
        message: totalUsers && totalUsers > 0 ? `Found ${totalUsers} total users` : 'No users in database',
        details: { count: totalUsers },
      });
    }
  } catch (error) {
    diagnostics.checks.push({
      name: 'Total Users Count',
      status: 'fail',
      message: 'Error counting users',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check 5: Count customers specifically
  try {
    const { count: customerCount, error: customerError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'customer');

    if (customerError) {
      diagnostics.checks.push({
        name: 'Customer Count (role=customer)',
        status: 'fail',
        message: 'Failed to count customers',
        details: { code: customerError.code, message: customerError.message },
      });
    } else if (customerCount === 0) {
      diagnostics.checks.push({
        name: 'Customer Count (role=customer)',
        status: 'warning',
        message: 'No users with role=customer found - this is why no customers appear',
        details: { count: 0 },
      });
    } else {
      diagnostics.checks.push({
        name: 'Customer Count (role=customer)',
        status: 'pass',
        message: `Found ${customerCount} customers with role=customer`,
        details: { count: customerCount },
      });
    }
  } catch (error) {
    diagnostics.checks.push({
      name: 'Customer Count (role=customer)',
      status: 'fail',
      message: 'Error counting customers',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check 6: Sample customer data (first 3)
  try {
    const { data: sampleCustomers, error: sampleError } = await supabase
      .from('users')
      .select('id, phone, name, email, role, created_at')
      .eq('role', 'customer')
      .limit(3);

    if (sampleError) {
      diagnostics.checks.push({
        name: 'Sample Customer Query',
        status: 'fail',
        message: 'Failed to fetch sample customers',
        details: { code: sampleError.code, message: sampleError.message },
      });
    } else if (!sampleCustomers || sampleCustomers.length === 0) {
      diagnostics.checks.push({
        name: 'Sample Customer Query',
        status: 'warning',
        message: 'Query succeeded but returned no customers',
        details: { data: [] },
      });
    } else {
      diagnostics.checks.push({
        name: 'Sample Customer Query',
        status: 'pass',
        message: `Retrieved ${sampleCustomers.length} sample customers`,
        details: {
          samples: sampleCustomers.map((c) => ({
            id: c.id.substring(0, 8) + '...',
            name: c.name,
            role: c.role,
          })),
        },
      });
    }
  } catch (error) {
    diagnostics.checks.push({
      name: 'Sample Customer Query',
      status: 'fail',
      message: 'Error fetching sample customers',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Check 7: Verify role enum values in database
  try {
    const { data: roleData, error: roleError } = await supabase.rpc('get_distinct_roles');

    if (roleError) {
      // RPC might not exist, try alternative query
      const { data: altRoleData, error: altRoleError } = await supabase
        .from('users')
        .select('role')
        .limit(100);

      if (altRoleError) {
        diagnostics.checks.push({
          name: 'Role Values Check',
          status: 'warning',
          message: 'Could not verify role values',
          details: { error: altRoleError.message },
        });
      } else {
        const distinctRoles = [...new Set(altRoleData?.map((r) => r.role) || [])];
        diagnostics.checks.push({
          name: 'Role Values Check',
          status: 'pass',
          message: `Found ${distinctRoles.length} distinct role values in use`,
          details: { roles: distinctRoles },
        });
      }
    } else {
      diagnostics.checks.push({
        name: 'Role Values Check',
        status: 'pass',
        message: 'Role values retrieved',
        details: { roles: roleData },
      });
    }
  } catch (error) {
    diagnostics.checks.push({
      name: 'Role Values Check',
      status: 'warning',
      message: 'Could not verify role values',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Calculate summary
  diagnostics.checks.forEach((check) => {
    if (check.status === 'pass') diagnostics.summary.passed++;
    else if (check.status === 'fail') diagnostics.summary.failed++;
    else diagnostics.summary.warnings++;
  });

  logger.info({ diagnostics }, '📊 Admin diagnostics check completed');

  const statusCode = diagnostics.summary.failed > 0 ? 500 : 200;
  return NextResponse.json(diagnostics, { status: statusCode });
}
