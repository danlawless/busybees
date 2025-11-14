/**
 * API Route: Settings
 * GET - List all settings (admin only)
 * POST - Create or update a setting (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch settings
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*')
      .order('key', { ascending: true });

    if (error) throw error;

    // Mask encrypted values for security
    const maskedSettings = settings?.map(setting => ({
      ...setting,
      value: setting.is_encrypted && setting.value
        ? '••••' + setting.value.slice(-4)
        : setting.value,
      actual_value: setting.is_encrypted ? undefined : setting.value,
    }));

    return NextResponse.json(maskedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 });
    }

    // Upsert setting
    const { data, error } = await supabase
      .from('settings')
      .upsert({ key, value }, { onConflict: 'key' })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating setting:', error);
    return NextResponse.json(
      { error: 'Failed to update setting', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

