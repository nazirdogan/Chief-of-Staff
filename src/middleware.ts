import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          }));
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const isPublicRoute = pathname === '/' || pathname === '/beta';

  // If a logged-in user hits the landing page, send them to dashboard
  if (isPublicRoute && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  if (isPublicRoute) return response;

  const isDashboardRoute =
    pathname === '/dashboard' ||
    pathname.startsWith('/inbox') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/commitments') ||
    pathname.startsWith('/people') ||
    pathname.startsWith('/heartbeat') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/admin');

  const isOnboardingRoute = pathname === '/onboarding';
  const isGettingReadyRoute = pathname === '/getting-ready';

  // Unauthenticated users trying to access protected routes -> login
  if (!user && (isDashboardRoute || isOnboardingRoute || isGettingReadyRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Getting-ready is a standalone authenticated route — no further checks
  if (user && isGettingReadyRoute) return response;

  // Authenticated users: check onboarding status for dashboard routes
  if (user && isDashboardRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    if (profile && !profile.onboarding_completed) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  }

  // Authenticated users trying to access auth routes -> redirect to dashboard
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder assets
     * - api routes (handled by their own auth middleware)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api).*)',
  ],
};
