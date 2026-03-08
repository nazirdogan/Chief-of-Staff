'use client';

import { Zap } from 'lucide-react';

const c = {
  bg: '#1B1F3A',
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.06)',
  surfaceElevated: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  dawn: '#E8845C',
  dawnLight: '#F09D7A',
  dawnMuted: 'rgba(232,132,92,0.15)',
  dawnBorder: 'rgba(232,132,92,0.25)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.85)',
  textTertiary: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  textGhost: 'rgba(255,255,255,0.2)',
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

interface InsightBannerProps {
  summary: string | null;
  changes: string | null;
}

export default function InsightBanner({ summary, changes }: InsightBannerProps) {
  if (!summary && !changes) return null;

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: c.surfaceElevated,
        borderLeft: `3px solid ${c.dawn}`,
      }}
    >
      {summary && (
        <p
          className="text-[14px] leading-[1.7]"
          style={{ color: c.textSecondary }}
        >
          {summary}
        </p>
      )}
      {changes && (
        <div className="flex items-start gap-2 mt-3">
          <Zap
            size={14}
            className="mt-[2px] flex-shrink-0"
            style={{ color: c.info }}
          />
          <p className="text-[13px] leading-[1.6]" style={{ color: c.info }}>
            {changes}
          </p>
        </div>
      )}
    </div>
  );
}
