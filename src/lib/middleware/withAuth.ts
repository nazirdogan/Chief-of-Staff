import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import type { SubscriptionTier } from '@/lib/db/types';

export type AuthenticatedRequest = NextRequest & {
  user: { id: string; email: string; tier: SubscriptionTier };
};

export function withAuth(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
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

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    const { data: profile } = await supabase
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
