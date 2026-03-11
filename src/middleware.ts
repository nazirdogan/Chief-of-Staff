import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Platform detection: The desktop app (Tauri) sets a `donna_client=desktop`
 * cookie at launch. This is the only reliable way to distinguish desktop
 * from web on navigation requests (custom headers don't apply to page loads).
 */
function isDesktopClient(request: NextRequest): boolean {
  return request.cookies.get('donna_client')?.value === 'desktop';
}

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
  const isDesktop = isDesktopClient(request);

  // ── Website-only routes — never shown inside the desktop app ──
  // These include marketing, download, billing confirmation, oauth return, and showcases.
  const isWebsiteOnlyRoute =
    pathname === '/' ||
    pathname === '/beta' ||
    pathname === '/download' ||
    pathname === '/connected' ||
    pathname === '/billing/success' ||
    pathname.startsWith('/showcase');

  if (isWebsiteOnlyRoute && isDesktop) {
    const url = request.nextUrl.clone();
    url.pathname = user ? '/chat' : '/login';
    return NextResponse.redirect(url);
  }

  if (isWebsiteOnlyRoute) return response;

  // ── Auth routes: desktop-only ──
  const isAuthRoute = pathname === '/login' || pathname === '/signup';

  if (isAuthRoute && !isDesktop) {
    // Web users cannot sign up or log in — redirect to download page
    const url = request.nextUrl.clone();
    url.pathname = '/download';
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && user && isDesktop) {
    const url = request.nextUrl.clone();
    url.pathname = '/chat';
    return NextResponse.redirect(url);
  }

  // ── Dashboard routes: desktop-only ──
  const isDashboardRoute =
    pathname === '/dashboard' ||
    pathname.startsWith('/inbox') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/commitments') ||
    pathname.startsWith('/people') ||
    pathname.startsWith('/heartbeat') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/memory') ||
    pathname.startsWith('/patterns') ||
    pathname.startsWith('/operations') ||
    pathname.startsWith('/reflections');

  const isOnboardingRoute = pathname === '/onboarding';
  const isGettingReadyRoute = pathname === '/getting-ready';

  // Gate: dashboard, onboarding, and getting-ready are desktop-only
  if (!isDesktop && (isDashboardRoute || isOnboardingRoute || isGettingReadyRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/download';
    return NextResponse.redirect(url);
  }

  // Unauthenticated desktop users trying to access protected routes -> login
  if (!user && (isDashboardRoute || isOnboardingRoute || isGettingReadyRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Getting-ready is a standalone authenticated route — no further checks
  if (user && isGettingReadyRoute) return response;

  // Authenticated desktop users: check onboarding status for dashboard routes.
  // Cache the result in a short-lived cookie to avoid a DB round-trip on every navigation.
  if (user && isDashboardRoute) {
    const onboardedCookie = request.cookies.get('donna_onboarded')?.value;

    if (onboardedCookie !== '1') {
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

      // Mark as onboarded in a cookie so we skip the DB check for the next hour
      if (profile?.onboarding_completed) {
        response.cookies.set('donna_onboarded', '1', {
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 60 * 60, // 1 hour
          path: '/',
        });
      }
    }
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
