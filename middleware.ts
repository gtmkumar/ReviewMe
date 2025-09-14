import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';
import { navigationTracker } from '@/lib/navigation-tracking';
import type { NextRequestWithAuth } from 'next-auth/middleware';

// Generate session ID for tracking
function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Get or create session ID from request
function getSessionId(req: NextRequestWithAuth): string {
  const existingSessionId = req.cookies.get('session-id')?.value;
  return existingSessionId || generateSessionId();
}

// Get client IP address
function getClientIP(req: NextRequestWithAuth): string {
  return req.headers.get('x-forwarded-for') || 
         req.headers.get('x-real-ip') || 
         'unknown';
}

export default withAuth(
  async function middleware(req: NextRequestWithAuth) {
    const token = req.nextauth.token;
    const isAuth = !!token;
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth');
    const isPublicPage = [
      '/',
      '/contact', // Contact page is publicly accessible
      '/about',
      '/pricing',
      '/privacy',
      '/terms'
    ].includes(req.nextUrl.pathname) || 
    req.nextUrl.pathname.startsWith('/u/'); // Public profile pages

    const sessionId = getSessionId(req);
    const userAgent = req.headers.get('user-agent') || 'unknown';
    const ipAddress = getClientIP(req);
    const userId = token?.sub;
    const fromPath = req.headers.get('referer') ? new URL(req.headers.get('referer')!).pathname : '';
    const toPath = req.nextUrl.pathname;

    // Track navigation event (fire and forget)
    navigationTracker.trackNavigation({
      userId,
      sessionId,
      fromPath,
      toPath,
      userAgent,
      ipAddress,
      timestamp: new Date(),
      isAuthenticated: isAuth,
      referrer: req.headers.get('referer') || undefined,
      metadata: {
        searchParams: Object.fromEntries(req.nextUrl.searchParams.entries()),
        method: req.method
      }
    }).catch(err => console.error('Failed to track navigation:', err));

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (isAuth && isAuthPage) {
      const redirectUrl = new URL('/dashboard', req.url);
      const response = NextResponse.redirect(redirectUrl);
      
      // Track auth redirect
      navigationTracker.trackAuthRedirect({
        fromPath: toPath,
        toPath: '/dashboard',
        reason: 'already_authenticated',
        userId,
        sessionId,
        userAgent,
        ipAddress
      }).catch(err => console.error('Failed to track auth redirect:', err));
      
      // Add session ID cookie if not exists
      if (!req.cookies.get('session-id')?.value) {
        response.cookies.set('session-id', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
      }
      
      return response;
    }

    // If user is not authenticated and trying to access protected pages
    if (!isAuth && !isPublicPage && !isAuthPage) {
      const loginUrl = new URL('/auth/signin', req.url);
      // Store the attempted URL for redirect after login
      loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
      
      // Track protected route access attempt
      navigationTracker.trackProtectedRouteAccess({
        path: toPath,
        isAllowed: false,
        userId,
        sessionId,
        userAgent,
        ipAddress,
        authStatus: 'unauthenticated'
      }).catch(err => console.error('Failed to track protected route access:', err));
      
      const response = NextResponse.redirect(loginUrl);
      
      // Add session ID cookie if not exists
      if (!req.cookies.get('session-id')?.value) {
        response.cookies.set('session-id', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
      }
      
      return response;
    }

    // Track successful protected route access
    if (isAuth && !isPublicPage && !isAuthPage) {
      navigationTracker.trackProtectedRouteAccess({
        path: toPath,
        isAllowed: true,
        userId,
        sessionId,
        userAgent,
        ipAddress,
        authStatus: 'authenticated'
      }).catch(err => console.error('Failed to track protected route access:', err));
    }

    // Create response and add session ID cookie if needed
    const response = NextResponse.next();
    if (!req.cookies.get('session-id')?.value) {
      response.cookies.set('session-id', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }

    return response;
  },
  {
    callbacks: {
      authorized: () => true, // We handle auth logic in the middleware function
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - manifest.json (PWA manifest)
     * - sw.js (service worker)
     * - icons (PWA icons)
     * - splash (PWA splash screens)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|splash|browserconfig.xml).*)',
  ],
};