'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type MacVersion = 'sequoia' | 'ventura' | 'monterey';

const MAC_VERSIONS: { id: MacVersion; label: string; subtitle: string }[] = [
  { id: 'sequoia', label: 'macOS 15 Sequoia', subtitle: '(latest)' },
  { id: 'ventura', label: 'macOS 13/14 Ventura & Sonoma', subtitle: '' },
  { id: 'monterey', label: 'macOS 12 and earlier', subtitle: '' },
];

const INSTRUCTIONS: Record<MacVersion, { steps: string[] }> = {
  sequoia: {
    steps: [
      'Open the downloaded Donna.dmg and drag Donna to your Applications folder.',
      'Try to open Donna from Applications. macOS will show a warning that it cannot verify the developer.',
      'Open System Settings (Apple menu > System Settings).',
      'Go to Privacy & Security.',
      'Scroll down to the Security section. You will see a message about Donna being blocked.',
      'Click "Open Anyway" and authenticate with your password or Touch ID.',
      'Donna will launch. You only need to do this once.',
    ],
  },
  ventura: {
    steps: [
      'Open the downloaded Donna.dmg and drag Donna to your Applications folder.',
      'In Finder, navigate to your Applications folder.',
      'Right-click (or Control-click) on Donna.',
      'Select "Open" from the context menu.',
      'A dialog will appear warning about an unidentified developer. Click "Open".',
      'Donna will launch. Future opens will work normally without the right-click step.',
    ],
  },
  monterey: {
    steps: [
      'Open the downloaded Donna.dmg and drag Donna to your Applications folder.',
      'Double-click Donna to open it. macOS will show a dialog saying it cannot be opened.',
      'Click "OK" to dismiss the dialog.',
      'Open System Preferences > Security & Privacy > General.',
      'At the bottom, you will see a message about Donna being blocked. Click "Open Anyway".',
      'A confirmation dialog will appear. Click "Open".',
      'Donna will launch. You only need to do this once.',
    ],
  },
};

export function InstallInstructions() {
  const [selected, setSelected] = useState<MacVersion>('sequoia');
  const { steps } = INSTRUCTIONS[selected];

  return (
    <div className="w-full max-w-2xl space-y-6">
      <h3 className="text-lg font-semibold">First-time install instructions</h3>
      <p className="text-sm text-muted-foreground">
        Since Donna is not yet signed with an Apple Developer certificate, macOS Gatekeeper
        will block the first launch. Choose your macOS version below for bypass instructions.
      </p>

      {/* Version selector tabs */}
      <div className="flex flex-wrap gap-2">
        {MAC_VERSIONS.map((v) => (
          <button
            key={v.id}
            onClick={() => setSelected(v.id)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm font-medium transition-colors',
              selected === v.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-foreground hover:bg-accent'
            )}
          >
            {v.label} {v.subtitle && <span className="text-xs opacity-70">{v.subtitle}</span>}
          </button>
        ))}
      </div>

      {/* Steps */}
      <ol className="list-inside list-decimal space-y-3 rounded-lg border bg-muted/30 p-5 text-sm leading-relaxed">
        {steps.map((step, i) => (
          <li key={i} className="pl-1">
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
