import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({
            name,
            value: '',
            ...options,
          });
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser();

  // Protect admin/staff routes
  const url = request.nextUrl.clone();
  if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/staff')) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      url.pathname = '/auth/staff';
      return NextResponse.redirect(url);
    }
  }

  // Protect customer portal routes
  if (url.pathname.startsWith('/customer')) {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      url.pathname = '/auth/login';
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

