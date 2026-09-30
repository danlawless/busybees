import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { decidePageAccess, decideApiAccess } from '@/lib/admin/access';
import { apiLevelForPath } from '@/lib/admin/api-access';
import { readStamp, STAMP_COOKIE } from '@/lib/admin/session-stamp';

// Carry cookies refreshed by getUser() (rotated refresh token) onto a replacement response
function withCookies<T extends NextResponse>(from: NextResponse, to: T): T {
  from.cookies.getAll().forEach(c => to.cookies.set(c));
  return to;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request,
  });

  // Supabase auth session refresh
  // Uses getAll/setAll to correctly handle chunked JWT cookies
  // (the old get/set/remove pattern corrupted multi-chunk tokens on refresh)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  // This also updates chunked auth cookies via the setAll callback above
  const { data: { user } } = await supabase.auth.getUser();

  // One gate for admin pages, the editor, and the admin + settings APIs
  const isAdminPage = pathname === '/admin' || pathname.startsWith('/admin/');
  const isEditor = pathname === '/editor' || pathname.startsWith('/editor/');
  const isGuardedApi = pathname.startsWith('/api/admin') || pathname.startsWith('/api/settings') || pathname.startsWith('/api/editor');

  if (isAdminPage || isEditor || isGuardedApi) {
    // Ungated API paths (kiosk polls, self-authenticated routes) skip the role query and stamp check
    if (isGuardedApi) {
      const need = apiLevelForPath(pathname, request.method);
      if (need === null || need === 'self') return response;
    }

    let role: string | null = null;
    if (user) {
      const { data } = await supabase.from('users').select('role').eq('id', user.id).single();
      role = data?.role ?? null;
    }
    const secret = process.env.ADMIN_SESSION_SECRET;
    const startedAt = secret ? await readStamp(request.cookies.get(STAMP_COOKIE)?.value, secret) : null;
    const now = Date.now();

    if (isGuardedApi) {
      const d = decideApiAccess({ pathname, method: request.method, role, signedIn: !!user, startedAt, now });
      if (d.kind === 'deny') {
        return withCookies(response, NextResponse.json({ error: d.status === 401 ? 'session-ended' : 'forbidden' }, { status: d.status }));
      }
      return response;
    }

    const d = decidePageAccess({ pathname, role, startedAt, now });
    if (d.kind === 'login') {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      loginUrl.search = `?to=${encodeURIComponent(d.to)}`;
      return withCookies(response, NextResponse.redirect(loginUrl));
    }

    // Allowed editor requests fall through; next.config.ts rewrites /editor and /editor/ to index.html
    return response;
  }

  const url = request.nextUrl.clone();

  // Protect staff routes - require staff or admin role
  if (url.pathname.startsWith('/staff')) {
    try {
      if (!user) {
        url.pathname = '/auth/staff';
        return NextResponse.redirect(url);
      }

      // Verify staff or admin role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData || !['staff', 'admin'].includes(userData.role)) {
        url.pathname = '/pos';
        return NextResponse.redirect(url);
      }
    } catch {
      url.pathname = '/auth/staff';
      return NextResponse.redirect(url);
    }
  }

  // Protect customer portal routes (except login/signup/verify pages)
  if (url.pathname.startsWith('/customer') &&
      !url.pathname.startsWith('/customer/login') &&
      !url.pathname.startsWith('/customer/signup') &&
      !url.pathname.startsWith('/customer/verify-email')) {
    try {

      if (!user) {
        url.pathname = '/customer/login';
        return NextResponse.redirect(url);
      }

      // Check if email is verified (required for online portal access)
      // POS users might not have verified emails, so redirect them to verify
      if (!user.email_confirmed_at && user.email) {
        url.pathname = '/customer/verify-email';
        return NextResponse.redirect(url);
      }

      // If no email at all, redirect to verify page to add one
      if (!user.email) {
        url.pathname = '/customer/verify-email';
        return NextResponse.redirect(url);
      }

      // Verify user has customer or admin role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userData && !['customer', 'admin'].includes(userData.role)) {
        url.pathname = '/customer/login';
        return NextResponse.redirect(url);
      }
    } catch {
      // Auth error - redirect to login
      url.pathname = '/customer/login';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/api/admin/:path*',
    '/api/settings/:path*',
    '/api/editor/:path*',
    '/api/settings',
  ],
}

