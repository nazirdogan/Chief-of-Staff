'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [verified, setVerified] = useState(false);
  const supabase = getSupabaseBrowserClient();

  // Login page doesn't need the admin guard
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      setVerified(true); // eslint-disable-line react-hooks/set-state-in-effect -- login page doesn't need guard
      return;
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.replace('/admin/login');
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single() as { data: { is_admin: boolean } | null };

      if (!profile?.is_admin) {
        router.replace('/admin/login');
        return;
      }

      setVerified(true);
    });
  }, [supabase, router, isLoginPage]);

  if (!verified) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: '#0E1225', color: '#FBF7F4' }}
      >
        <p className="text-sm" style={{ color: 'rgba(155,175,196,0.85)' }}>
          Verifying access...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
