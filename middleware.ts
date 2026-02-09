import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request,
  });

  // Handle editor routes - serve static files from public/editor
  if (pathname.startsWith('/editor')) {
    // Rewrite to serve static files from public directory
    const url = request.nextUrl.clone();

    // If accessing /editor or /editor/, serve index.html
    if (pathname === '/editor' || pathname === '/editor/') {
      url.pathname = '/editor/index.html';
      return NextResponse.rewrite(url);
    }

    // For all other /editor/* paths, serve the file directly from public
    // The files are already copied there by the build process
    return NextResponse.next();
  }

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
  await supabase.auth.getUser();

  // Protect admin routes - require admin role
  const url = request.nextUrl.clone();
  if (url.pathname.startsWith('/admin')) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        url.pathname = '/auth/staff';
        return NextResponse.redirect(url);
      }

      // Verify admin role
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData || userData.role !== 'admin') {
        url.pathname = '/pos';
        return NextResponse.redirect(url);
      }
    } catch {
      url.pathname = '/auth/staff';
      return NextResponse.redirect(url);
    }
  }

  // Protect staff routes - require staff or admin role
  if (url.pathname.startsWith('/staff')) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
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
      const { data: { user } } = await supabase.auth.getUser();

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
  ],
}

