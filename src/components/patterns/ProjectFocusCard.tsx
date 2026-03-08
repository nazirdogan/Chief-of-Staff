'use client';

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

interface ProjectFocusCardProps {
  projects: Array<{ project: string; hours_this_week: number; trend: string }>;
}

function trendArrow(trend: string): { symbol: string; color: string } {
  switch (trend) {
    case 'up':
      return { symbol: '\u2191', color: c.success };
    case 'down':
      return { symbol: '\u2193', color: c.critical };
    default:
      return { symbol: '\u2192', color: c.textMuted };
  }
}

export default function ProjectFocusCard({ projects }: ProjectFocusCardProps) {
  if (projects.length === 0) return null;

  const maxHours = Math.max(...projects.map((p) => p.hours_this_week), 1);

  return (
    <div
      className="rounded-xl p-5"
      style={{
        backgroundColor: c.surface,
        border: `1px solid ${c.border}`,
      }}
    >
      <h3
        className="text-[11px] font-semibold tracking-[0.08em] uppercase mb-4"
        style={{ color: c.textMuted }}
      >
        Project Focus
      </h3>

      <div className="flex flex-col gap-3">
        {projects.map((p) => {
          const pct = (p.hours_this_week / maxHours) * 100;
          const trend = trendArrow(p.trend);
          return (
            <div key={p.project}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[13px] font-medium" style={{ color: c.textSecondary }}>
                  {p.project}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[12px]" style={{ color: c.textTertiary }}>
                    {p.hours_this_week.toFixed(1)}h
                  </span>
                  <span className="text-[12px] font-bold" style={{ color: trend.color }}>
                    {trend.symbol}
                  </span>
                </div>
              </div>
              <div
                className="h-1.5 rounded-full w-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
              >
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: 'rgba(232,132,92,0.4)',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
