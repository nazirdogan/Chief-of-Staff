'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showTotp, setShowTotp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = getSupabaseBrowserClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        if (signInError.message.includes('MFA')) {
          setShowTotp(true);
          setLoading(false);
          return;
        }
        setError(signInError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];

      if (!totpFactor) {
        setError('No TOTP factor found.');
        setLoading(false);
        return;
      }

      const { data: challenge, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

      if (challengeError) {
        setError(challengeError.message);
        setLoading(false);
        return;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code: totpCode,
      });

      if (verifyError) {
        setError(verifyError.message);
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md animate-slide-up">
      <Card className="border-0 shadow-lg lg:border lg:shadow-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 lg:hidden">
            <svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect width="100" height="100" rx="18" fill="#1B1F3A"/>
              <path d="M26 18 L26 82 L44 82 C76 82 80 66 80 50 C80 34 76 18 44 18 Z"
                    fill="none" stroke="#FBF7F4" strokeWidth="4.5" strokeLinejoin="round"/>
              <line x1="26" y1="50" x2="72" y2="50" stroke="#E8845C" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="26" cy="50" r="5" fill="#E8845C"/>
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>

        {!showTotp ? (
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  minLength={12}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>

              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <SocialAuthButtons />

              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{' '}
                <Link
                  href="/signup"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </CardFooter>
          </form>
        ) : (
          <form onSubmit={handleTotpVerify}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="totp">Authentication Code</Label>
                <Input
                  id="totp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  required
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowTotp(false);
                  setTotpCode('');
                  setError(null);
                }}
              >
                Back to login
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}

