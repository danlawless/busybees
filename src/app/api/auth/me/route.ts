/**
 * Current User Session API
 * GET: Returns the current authenticated user's info from session cookies
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    const adminClient = createAdminClient();
    const { data: userData } = await adminClient
      .from('users')
      .select('id, name, role, phone, email')
      .eq('id', user.id)
      .single();

    if (!userData) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

    return NextResponse.json({ user: userData });
  } catch {
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
