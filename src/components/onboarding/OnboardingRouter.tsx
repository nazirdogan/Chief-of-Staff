'use client';

import { useIsTauri } from '@/lib/utils/is-tauri';
import { OnboardingFlow } from './OnboardingFlow';
import { DesktopOnboardingFlow } from './desktop/DesktopOnboardingFlow';

export function OnboardingRouter() {
  const isTauri = useIsTauri();

  if (isTauri) {
    return <DesktopOnboardingFlow />;
  }

  return <OnboardingFlow />;
}
