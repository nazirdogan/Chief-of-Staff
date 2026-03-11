import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

// Public route — handles Supabase auth callbacks (email verification, OAuth).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/chat';

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const cookieStore = await cookies();

  // Collect any cookies that Supabase needs to set (session tokens).
  // We must forward these onto the redirect response manually because
  // NextResponse.redirect() is a new Response — it doesn't inherit cookies
  // written to the Next.js cookie store mid-handler.
  const pendingCookies: Array<{ name: string; value: string; options: Partial<ResponseCookie> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }));
        },
        setAll(cookiesToSet) {
          pendingCookies.push(...cookiesToSet);
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  // Determine where to send the user: onboarding if they haven't completed it,
  // otherwise the intended destination (defaults to /chat).
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', data.user.id)
    .single();

  const needsOnboarding = !profile || !profile.onboarding_completed;
  const destination = needsOnboarding ? `${origin}/onboarding` : `${origin}${next}`;

  const response = NextResponse.redirect(destination);

  // Forward session cookies onto the redirect response so middleware can read
  // the authenticated session on the very next request.
  for (const { name, value, options } of pendingCookies) {
    response.cookies.set(name, value, options ?? {});
  }

  // Stamp the desktop cookie so middleware gates open correctly.
  // All auth callbacks originate from the desktop app.
  response.cookies.set('donna_client', 'desktop', {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    httpOnly: false, // must be readable by client-side JS too
  });

  return response;
}
