import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/db/client';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient({
    getAll() {
      return cookieStore.getAll().map((c) => ({
        name: c.name,
        value: c.value,
      }));
    },
    set(name: string, value: string, options?: Record<string, unknown>) {
      cookieStore.set(name, value, options);
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  if ((profile as { onboarding_completed: boolean } | null)?.onboarding_completed) {
    redirect('/dashboard');
  }

  return <OnboardingFlow />;
}
