'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

const STEPS = [
  {
    number: '01',
    title: 'Connect your tools',
    description:
      'Link Gmail, Calendar, Slack, and Notion. We read across your digital life so you don\'t have to.',
  },
  {
    number: '02',
    title: 'Get daily briefings',
    description:
      'Every morning, a single briefing tells you what matters, what you promised, and who needs your attention.',
  },
  {
    number: '03',
    title: 'Act with one tap',
    description:
      'Draft replies, resolve commitments, and prep for meetings directly from your briefing via Telegram.',
  },
];

const FEATURES = [
  {
    label: 'Daily Briefing',
    detail: 'A ranked, prioritised morning brief synthesised from every channel. No more inbox triage.',
  },
  {
    label: 'Commitment Tracker',
    detail: 'Automatically extracts promises you\'ve made in emails and messages. Never drop a ball again.',
  },
  {
    label: 'Relationship Intelligence',
    detail: 'Scores every professional relationship by recency and frequency. Alerts you before contacts go cold.',
  },
  {
    label: 'Meeting Prep',
    detail: 'Auto-generates briefs with attendee context, open items, and suggested talking points.',
  },
];

export default function BetaLandingPage() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormState('submitting');
    setErrorMessage('');

    const formData = new FormData(e.currentTarget);
    const payload = {
      email: formData.get('email') as string,
      full_name: formData.get('full_name') as string || undefined,
      company: formData.get('company') as string || undefined,
      role: formData.get('role') as string || undefined,
    };

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setFormState('success');
      } else {
        const data = await res.json();
        setErrorMessage(data.error ?? 'Something went wrong. Please try again.');
        setFormState('error');
      }
    } catch {
      setErrorMessage('Network error. Please check your connection and try again.');
      setFormState('error');
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <span className="text-sm font-semibold tracking-wide uppercase">
            Chief of Staff
          </span>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24 sm:pt-40 sm:pb-32">
        {/* Subtle grain texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Geometric accent — thin diagonal line */}
        <div className="pointer-events-none absolute top-0 right-0 h-full w-px bg-gradient-to-b from-transparent via-border to-transparent translate-x-[-10vw] opacity-40" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid gap-16 lg:grid-cols-[1fr_420px] lg:gap-24 lg:items-start">
            {/* Left — Copy */}
            <div className="max-w-xl">
              <p
                className="mb-6 text-xs font-medium tracking-[0.25em] uppercase text-muted-foreground"
                style={{ animationDelay: '0ms' }}
              >
                Private Beta
              </p>
              <h1
                className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem]"
                style={{ animationDelay: '80ms' }}
              >
                Your morning
                <br />
                intelligence brief.
              </h1>
              <p
                className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl"
                style={{ animationDelay: '160ms' }}
              >
                Chief of Staff reads across your email, calendar, and messages
                — then delivers one proactive daily briefing telling you what
                matters, what you promised, who you&apos;ve gone cold with,
                and what to do first.
              </p>
              <p
                className="mt-4 text-sm text-muted-foreground/70"
                style={{ animationDelay: '240ms' }}
              >
                Not a chat assistant. A background-running intelligence layer
                for executives who are done context-switching.
              </p>
            </div>

            {/* Right — Form */}
            <div
              className="rounded-xl border border-border bg-card p-8 shadow-sm"
              style={{ animationDelay: '200ms' }}
            >
              {formState === 'success' ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <svg
                      className="h-6 w-6 text-primary"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold">You&apos;re on the list</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    We&apos;ll review your application and send you an invite
                    within 48 hours.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-semibold">Request early access</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Limited to 50 beta users. No credit card required.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="email">Work email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@company.com"
                        autoComplete="email"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="full_name">Full name</Label>
                      <Input
                        id="full_name"
                        name="full_name"
                        type="text"
                        placeholder="Jane Smith"
                        autoComplete="name"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="company">Company</Label>
                        <Input
                          id="company"
                          name="company"
                          type="text"
                          placeholder="Acme Inc."
                          autoComplete="organization"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="role">Role</Label>
                        <Input
                          id="role"
                          name="role"
                          type="text"
                          placeholder="COO"
                        />
                      </div>
                    </div>

                    {formState === 'error' && errorMessage && (
                      <p className="text-sm text-destructive">{errorMessage}</p>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={formState === 'submitting'}
                    >
                      {formState === 'submitting'
                        ? 'Submitting...'
                        : 'Join the waitlist'}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* How it works */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted-foreground">
            How it works
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Three steps. Five minutes.
          </h2>

          <div className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step) => (
              <div key={step.number} className="relative">
                <span className="block font-mono text-5xl font-light text-border select-none">
                  {step.number}
                </span>
                <h3 className="mt-4 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="mx-auto max-w-6xl px-6">
        <div className="h-px bg-border" />
      </div>

      {/* Features */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <p className="text-xs font-medium tracking-[0.25em] uppercase text-muted-foreground">
            What you get
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Intelligence, not information.
          </h2>

          <div className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.label}
                className="bg-card p-8 transition-colors hover:bg-accent/30"
              >
                <h3 className="text-sm font-semibold tracking-wide">
                  {feature.label}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {feature.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-border py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Stop reacting. Start anticipating.
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Join the beta and be among the first to experience what a proactive
            intelligence layer can do for your day.
          </p>
          <Button
            className="mt-8"
            size="lg"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Request early access
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <span className="text-xs font-medium tracking-wide uppercase text-muted-foreground">
              Chief of Staff
            </span>
            <p className="text-xs text-muted-foreground">
              Built for executives who value their time.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
