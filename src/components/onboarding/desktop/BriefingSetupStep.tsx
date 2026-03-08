'use client';

import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BriefingSetupStepProps {
  onNext: (settings: {
    briefingTime: string;
    timezone: string;
    autonomyLevel: 'conservative' | 'balanced' | 'autonomous';
  }) => void;
  onBack: () => void;
}

const TIMES = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00'];

function formatTime(time: string): string {
  const [h, m] = time.split(':');
  const hour = parseInt(h, 10);
  return `${hour > 12 ? hour - 12 : hour === 0 ? 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

const AUTONOMY_LEVELS = [
  {
    key: 'conservative' as const,
    label: 'Conservative',
    sublabel: 'You approve everything',
    description: 'Full review before any action. Donna only observes and reports.',
    color: '#4E7DAA',
  },
  {
    key: 'balanced' as const,
    label: 'Balanced',
    sublabel: 'Recommended',
    description: 'Auto-handles routine tasks. One-tap for important ones.',
    color: '#E8845C',
  },
  {
    key: 'autonomous' as const,
    label: 'Autonomous',
    sublabel: 'Donna takes the lead',
    description: 'Handles most actions. You only review email sends.',
    color: '#52B788',
  },
];

export function BriefingSetupStep({ onNext, onBack }: BriefingSetupStepProps) {
  const [briefingTime, setBriefingTime] = useState('07:30');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [autonomyLevel, setAutonomyLevel] = useState<'conservative' | 'balanced' | 'autonomous'>('balanced');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { requestAnimationFrame(() => setMounted(true)); }, []);

  return (
    <div className="flex flex-col items-center text-center">
      <h2
        className="transition-all duration-700"
        style={{
          fontSize: '22px', fontStyle: 'italic', color: '#FBF7F4',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        Configure your morning
      </h2>
      <p
        className="mt-3 max-w-[340px] text-[13px] leading-[1.65] transition-all duration-700"
        style={{
          color: '#9BAFC4',
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(8px)',
          transitionDelay: '100ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        When should your briefing arrive, and how much should Donna
        handle on her own?
      </p>

      <div
        className="mt-7 w-full space-y-6 text-left transition-all duration-700"
        style={{
          opacity: mounted ? 1 : 0, transform: mounted ? 'translateY(0)' : 'translateY(12px)',
          transitionDelay: '250ms', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Time + Timezone row */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="text-[10px] font-medium tracking-[0.1em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155,175,196,0.4)', textTransform: 'uppercase' as const }}>
              Briefing time
            </label>
            <Select value={briefingTime} onValueChange={setBriefingTime}>
              <SelectTrigger className="h-10 rounded-lg border-border/20 bg-[rgba(14,18,37,0.5)] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMES.map((t) => (
                  <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-[1.5] space-y-1.5">
            <label className="text-[10px] font-medium tracking-[0.1em]"
              style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155,175,196,0.4)', textTransform: 'uppercase' as const }}>
              Timezone
            </label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger className="h-10 rounded-lg border-border/20 bg-[rgba(14,18,37,0.5)] text-[13px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Intl.supportedValuesOf('timeZone').map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Autonomy */}
        <div className="space-y-2.5">
          <label className="text-[10px] font-medium tracking-[0.1em]"
            style={{ fontFamily: 'var(--font-mono)', color: 'rgba(155,175,196,0.4)', textTransform: 'uppercase' as const }}>
            Autonomy level
          </label>

          <div className="space-y-1.5">
            {AUTONOMY_LEVELS.map((level) => {
              const isSelected = autonomyLevel === level.key;
              return (
                <button
                  key={level.key}
                  onClick={() => setAutonomyLevel(level.key)}
                  className="w-full rounded-xl p-3.5 text-left transition-all duration-300"
                  style={{
                    background: isSelected ? `${level.color}08` : 'rgba(14, 18, 37, 0.3)',
                    border: isSelected
                      ? `1px solid ${level.color}25`
                      : '1px solid rgba(251, 247, 244, 0.03)',
                    borderLeft: isSelected
                      ? `2px solid ${level.color}60`
                      : '2px solid transparent',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium" style={{ color: isSelected ? '#FBF7F4' : 'rgba(251,247,244,0.5)' }}>
                      {level.label}
                    </p>
                    {level.key === 'balanced' && (
                      <span
                        className="rounded-full px-2 py-0.5 text-[8px] font-medium tracking-[0.1em]"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          background: isSelected ? 'rgba(232,132,92,0.12)' : 'rgba(251,247,244,0.04)',
                          color: isSelected ? '#E8845C' : 'rgba(155,175,196,0.3)',
                          textTransform: 'uppercase' as const,
                        }}
                      >
                        Recommended
                      </span>
                    )}
                    {isSelected && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full" style={{ background: level.color, boxShadow: `0 0 6px ${level.color}40` }} />
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-snug" style={{ color: isSelected ? 'rgba(155,175,196,0.6)' : 'rgba(155,175,196,0.3)' }}>
                    {level.description}
                  </p>
                </button>
              );
            })}
          </div>

          <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(155,175,196,0.25)' }}>
            Email sending always requires full approval. Fine-tune per action in Settings.
          </p>
        </div>
      </div>

      <div className="mt-7 flex w-full items-center justify-between">
        <button onClick={onBack} className="text-[12px] font-medium transition-colors hover:underline" style={{ color: 'rgba(155,175,196,0.4)' }}>
          Back
        </button>
        <button
          onClick={() => onNext({ briefingTime, timezone, autonomyLevel })}
          className="group rounded-lg px-5 py-2 text-[13px] font-medium transition-all duration-300"
          style={{
            background: 'linear-gradient(135deg, #E8845C, #D4704A)',
            color: '#FBF7F4',
            boxShadow: '0 0 20px rgba(232,132,92,0.12)',
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
