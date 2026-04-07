// IMPORTANT: After modifying this file, update CHANGELOG.md with a summary of your changes.
import { NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/api/auth'];

const STATIC_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.otf'];

export default async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Allow static assets through regardless of auth state.
  // Next.js 16 uses proxy.js as the middleware entry point.
  if (STATIC_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    return NextResponse.next();
  }

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionToken =
    request.cookies.get('better-auth.session_token')?.value ||
    request.cookies.get('__Secure-better-auth.session_token')?.value;

  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.svg|.*\\.gif|.*\\.ico|.*\\.webp).*)'],
};
