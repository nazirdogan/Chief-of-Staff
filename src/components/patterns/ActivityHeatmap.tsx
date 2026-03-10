'use client';

const c = {
  bg: '#1B1F3A',
  surface: 'rgba(45,45,45,0.04)',
  surfaceHover: 'rgba(45,45,45,0.06)',
  surfaceElevated: 'rgba(45,45,45,0.06)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  dawn: '#E8845C',
  dawnLight: '#F09D7A',
  dawnMuted: 'rgba(232,132,92,0.15)',
  dawnBorder: 'rgba(232,132,92,0.25)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
  critical: '#D64B2A',
  success: '#52B788',
  info: '#4E7DAA',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const HOUR_LABELS: Array<{ hour: number; label: string }> = [
  { hour: 6, label: '6' },
  { hour: 9, label: '9' },
  { hour: 12, label: '12' },
  { hour: 15, label: '3' },
  { hour: 18, label: '6' },
  { hour: 21, label: '9' },
];

const HEAT_COLORS = [
  'rgba(45,45,45,0.04)',
  'rgba(232,132,92,0.15)',
  'rgba(232,132,92,0.35)',
  'rgba(232,132,92,0.6)',
  '#E8845C',
];

interface ActivityHeatmapProps {
  peakHours: Array<{ hour: number; activity_score: number }>;
  activeDays: number[];
}

export default function ActivityHeatmap({ peakHours, activeDays }: ActivityHeatmapProps) {
  // Build a map of hour -> activity_score
  const scoreByHour = new Map<number, number>();
  let maxScore = 0;
  for (const ph of peakHours) {
    scoreByHour.set(ph.hour, ph.activity_score);
    if (ph.activity_score > maxScore) maxScore = ph.activity_score;
  }

  function getColorIndex(day: number, hour: number): number {
    if (!activeDays.includes(day)) return 0;
    const score = scoreByHour.get(hour) ?? 0;
    if (score === 0 || maxScore === 0) return 0;
    const normalized = score / maxScore;
    if (normalized <= 0.25) return 1;
    if (normalized <= 0.5) return 2;
    if (normalized <= 0.75) return 3;
    return 4;
  }

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
        Activity Heatmap
      </h3>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Hour labels row */}
          <div className="flex items-end mb-1" style={{ paddingLeft: 32 }}>
            {Array.from({ length: 24 }, (_, hour) => {
              const label = HOUR_LABELS.find((h) => h.hour === hour);
              return (
                <div
                  key={hour}
                  className="text-[10px] text-center"
                  style={{
                    width: 10,
                    marginRight: 2,
                    color: c.textGhost,
                  }}
                >
                  {label ? label.label : ''}
                </div>
              );
            })}
          </div>

          {/* Grid rows */}
          {DAY_LABELS.map((dayLabel, dayIdx) => {
            const dayNum = dayIdx + 1;
            return (
              <div key={dayLabel} className="flex items-center" style={{ marginBottom: 2 }}>
                <span
                  className="text-[10px] w-[30px] flex-shrink-0 text-right mr-[2px]"
                  style={{ color: c.textMuted }}
                >
                  {dayLabel}
                </span>
                <div className="flex" style={{ gap: 2 }}>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const colorIdx = getColorIndex(dayNum, hour);
                    return (
                      <div
                        key={hour}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          backgroundColor: HEAT_COLORS[colorIdx],
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
