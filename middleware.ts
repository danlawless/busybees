import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Handle editor routes - serve static files from public/editor
  if (pathname.startsWith('/editor')) {
    // Rewrite to serve static files from public directory
    const url = request.nextUrl.clone()
    
    // If accessing /editor or /editor/, serve index.html
    if (pathname === '/editor' || pathname === '/editor/') {
      url.pathname = '/editor/index.html'
      return NextResponse.rewrite(url)
    }
    
    // For all other /editor/* paths, serve the file directly from public
    // The files are already copied there by the build process
    return NextResponse.next()
  }

  return NextResponse.next()
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

