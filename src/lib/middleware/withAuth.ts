import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { SubscriptionTier } from '@/lib/db/types';
import { createServiceClient } from '@/lib/db/client';

export type AuthenticatedRequest = NextRequest & {
  user: { id: string; email: string; tier: SubscriptionTier };
};

export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Support Bearer token auth (CLI / API clients) alongside cookie auth (browser)
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let user: { id: string; email?: string } | null = null;

    if (bearerToken) {
      // CLI / external client: authenticate via Bearer token against Supabase
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${bearerToken}` } } }
      );
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        user = { id: data.user.id, email: data.user.email };
      }
    } else {
      // Browser: authenticate via cookies
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return req.cookies.getAll().map((c) => ({
                name: c.name,
                value: c.value,
              }));
            },
            setAll() {
              // API route handlers don't need to set cookies on request
            },
          },
        }
      );
      const { data, error } = await supabase.auth.getUser();
      if (!error && data.user) {
        user = { id: data.user.id, email: data.user.email };
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Fetch profile using service client (works regardless of auth method)
    const serviceClient = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (serviceClient as any)
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: user.email!,
      tier: (profile?.subscription_tier as SubscriptionTier) ?? 'free',
    };

    return handler(req as AuthenticatedRequest);
  };
}
