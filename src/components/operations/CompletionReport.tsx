'use client';

import { useState, useEffect } from 'react';
import { CheckCircle2, Mail, AlertCircle, Search, Calendar, AlertTriangle, Loader2 } from 'lucide-react';

const c = {
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  border: 'rgba(45,45,45,0.08)',
  dawnSubtle: 'rgba(232,132,92,0.15)',
  dawn: '#E8845C',
  green: '#52B788',
  yellow: '#B68D40',
  red: '#D64B2A',
};

interface ReportSection {
  title: string;
  emoji: string;
  items: Array<{
    label: string;
    detail: string;
    actionUrl?: string;
  }>;
}

interface Report {
  sections: ReportSection[];
  summary: string;
}

const SECTION_ICONS: Record<string, typeof CheckCircle2> = {
  check: CheckCircle2,
  email: Mail,
  decision: AlertCircle,
  research: Search,
  calendar: Calendar,
  warning: AlertTriangle,
};

const SECTION_COLORS: Record<string, string> = {
  check: c.green,
  email: c.dawn,
  decision: c.yellow,
  research: '#4E7DAA',
  calendar: c.dawn,
  warning: c.red,
};

export function CompletionReportPanel({ runId }: { runId?: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const url = runId
          ? `/api/operations/completion-report?runId=${runId}`
          : '/api/operations/completion-report';
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setReport(data.report);
        }
      } catch {
        // Silently fail — report may not exist yet
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [runId]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, color: c.textTertiary }}>
        <Loader2 size={16} className="animate-spin" />
        <span style={{ marginLeft: 8, fontSize: 13 }}>Loading report...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div style={{ padding: 20, textAlign: 'center', color: c.textTertiary, fontSize: 13 }}>
        No completion report available yet. Run an AM Sweep first.
      </div>
    );
  }

  return (
    <div style={{ borderRadius: 12, border: `1px solid ${c.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', background: c.dawnSubtle }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: 0 }}>Completion Report</h3>
        <p style={{ fontSize: 12, color: c.textTertiary, margin: '4px 0 0' }}>{report.summary}</p>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {report.sections.map((section, i) => {
          const Icon = SECTION_ICONS[section.emoji] ?? CheckCircle2;
          const color = SECTION_COLORS[section.emoji] ?? c.dawn;

          return (
            <div key={i}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={14} color={color} />
                <h4 style={{ fontSize: 13, fontWeight: 600, color, margin: 0 }}>{section.title}</h4>
                <span style={{ fontSize: 11, color: c.textTertiary }}>({section.items.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 22 }}>
                {section.items.map((item, j) => (
                  <div key={j} style={{
                    padding: '8px 12px', borderRadius: 6,
                    border: `1px solid ${c.border}`, background: 'rgba(45,45,45,0.04)',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: c.text }}>{item.label}</div>
                    {item.detail && (
                      <div style={{ fontSize: 11, color: c.textTertiary, marginTop: 2 }}>{item.detail}</div>
                    )}
                    {item.actionUrl && (
                      <a
                        href={item.actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 11, color: c.dawn, marginTop: 4, display: 'inline-block' }}
                      >
                        Review →
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
