'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = getSupabaseBrowserClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('Authentication failed.');
        setLoading(false);
        return;
      }

      // Verify admin status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_admin')
        .eq('id', data.user.id)
        .single() as { data: { is_admin: boolean } | null };

      if (!profile?.is_admin) {
        await supabase.auth.signOut();
        setError('You do not have admin access.');
        setLoading(false);
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: '#0E1225' }}>
      <div className="w-full max-w-md px-4">
        <Card className="border-0 shadow-lg" style={{ background: '#1B1F3A', borderColor: 'rgba(251,247,244,0.08)' }}>
          <CardHeader className="text-center">
            <div className="mx-auto mb-3">
              <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect width="100" height="100" rx="18" fill="#1B1F3A"/>
                <path d="M26 18 L26 82 L44 82 C76 82 80 66 80 50 C80 34 76 18 44 18 Z"
                      fill="none" stroke="#FBF7F4" strokeWidth="4.5" strokeLinejoin="round"/>
                <line x1="26" y1="50" x2="72" y2="50" stroke="#E8845C" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="26" cy="50" r="5" fill="#E8845C"/>
              </svg>
            </div>
            <CardTitle className="text-xl font-bold tracking-tight" style={{ color: '#FBF7F4' }}>
              Admin Access
            </CardTitle>
            <p className="text-sm" style={{ color: 'rgba(155,175,196,0.85)' }}>
              Restricted area. Authorised personnel only.
            </p>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md p-3 text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" style={{ color: 'rgba(251,247,244,0.85)' }}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@donna.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" style={{ color: 'rgba(251,247,244,0.85)' }}>Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  minLength={12}
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/30"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                style={{ background: '#E8845C', color: '#FBF7F4' }}
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
