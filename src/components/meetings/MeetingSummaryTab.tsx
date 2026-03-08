'use client';

const c = {
  surface: 'rgba(255,255,255,0.04)',
  surfaceHover: 'rgba(255,255,255,0.06)',
  surfaceElevated: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.07)',
  borderHover: 'rgba(255,255,255,0.14)',
  dawn: '#E8845C',
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

interface MeetingSummaryTabProps {
  summary:
    | {
        narrative: string;
        key_decisions: Array<{ decision: string; context: string }>;
        open_questions: string[];
        source_provider?: string;
      }
    | undefined;
}

export default function MeetingSummaryTab({ summary }: MeetingSummaryTabProps) {
  if (!summary) {
    return (
      <div
        className="rounded-xl py-12 text-center"
        style={{
          border: `1px dashed ${c.borderHover}`,
          background: c.surface,
        }}
      >
        <p className="text-[14px] font-medium" style={{ color: c.textTertiary }}>
          Summary will appear after the meeting.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Narrative */}
      <p
        className="text-[14px] leading-[1.7]"
        style={{ color: c.textSecondary }}
      >
        {summary.narrative}
      </p>

      {/* Key decisions */}
      {summary.key_decisions.length > 0 && (
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: c.textMuted }}
          >
            Key Decisions
          </p>
          <div className="flex flex-col gap-2">
            {summary.key_decisions.map((item, i) => (
              <div
                key={i}
                className="rounded-lg p-3.5"
                style={{
                  background: c.surfaceElevated,
                  borderLeft: `3px solid ${c.dawn}`,
                }}
              >
                <p className="text-[13px] font-semibold" style={{ color: c.text }}>
                  {item.decision}
                </p>
                <p
                  className="text-[12px] mt-1 leading-[1.5]"
                  style={{ color: c.textTertiary }}
                >
                  {item.context}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open questions */}
      {summary.open_questions.length > 0 && (
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wide mb-2"
            style={{ color: c.textMuted }}
          >
            Open Questions
          </p>
          <ul className="flex flex-col gap-1.5">
            {summary.open_questions.map((question, i) => (
              <li
                key={i}
                className="text-[13px] flex items-start gap-2"
                style={{ color: c.textSecondary }}
              >
                <span style={{ color: c.dawn, marginTop: 2 }}>•</span>
                {question}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Source provider badge */}
      {summary.source_provider && (
        <div className="pt-2">
          <span
            className="text-[11px] font-medium px-2.5 py-1 rounded-full"
            style={{
              background: c.surface,
              color: c.textMuted,
              border: `1px solid ${c.border}`,
            }}
          >
            Source: {summary.source_provider}
          </span>
        </div>
      )}
    </div>
  );
}
