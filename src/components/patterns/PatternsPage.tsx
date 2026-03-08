'use client';

import { useEffect, useState } from 'react';
import InsightBanner from './InsightBanner';
import ScheduleCard from './ScheduleCard';
import ActivityHeatmap from './ActivityHeatmap';
import CommunicationCard from './CommunicationCard';
import ProjectFocusCard from './ProjectFocusCard';
import CollaboratorsCard from './CollaboratorsCard';

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

interface WorkingPatterns {
  typical_start_time: string | null;
  typical_end_time: string | null;
  peak_hours: Array<{ hour: number; activity_score: number }>;
  active_days: number[];
  avg_emails_per_day: number;
  avg_slack_messages_per_day: number;
  avg_meetings_per_day: number;
  response_time_p50_minutes: number | null;
  response_time_p90_minutes: number | null;
  busiest_day_of_week: number | null;
  quietest_day_of_week: number | null;
  deep_work_windows: Array<{ start: string; end: string; day: number }>;
  meeting_heavy_days: number[];
  context_switch_frequency: number | null;
  active_projects_ranked: Array<{ project: string; hours_this_week: number; trend: string }>;
  top_collaborators: Array<{ email: string; interaction_count: number; channels: string[] }>;
  working_style_summary: string | null;
  recent_changes: string | null;
  analysis_window_days: number;
  last_analyzed_at: string;
}

function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={`rounded-xl p-5 animate-pulse ${className ?? ''}`}
      style={{
        backgroundColor: c.surface,
        border: `1px solid ${c.border}`,
      }}
    >
      <div
        className="h-3 w-24 rounded mb-4"
        style={{ backgroundColor: c.surfaceHover }}
      />
      <div
        className="h-6 w-32 rounded mb-3"
        style={{ backgroundColor: c.surfaceHover }}
      />
      <div
        className="h-4 w-full rounded mb-2"
        style={{ backgroundColor: c.surfaceHover }}
      />
      <div
        className="h-4 w-3/4 rounded"
        style={{ backgroundColor: c.surfaceHover }}
      />
    </div>
  );
}

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<WorkingPatterns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPatterns() {
      try {
        const res = await fetch('/api/context/patterns');
        if (res.status === 404) {
          setPatterns(null);
          setLoading(false);
          return;
        }
        if (!res.ok) {
          throw new Error('Failed to fetch patterns');
        }
        const data = await res.json();
        setPatterns(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchPatterns();
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div
            className="h-5 w-48 rounded animate-pulse mb-1"
            style={{ backgroundColor: c.surfaceHover }}
          />
          <div
            className="h-3 w-24 rounded animate-pulse"
            style={{ backgroundColor: c.surfaceHover }}
          />
        </div>
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <p className="text-[14px]" style={{ color: c.critical }}>
          {error}
        </p>
      </div>
    );
  }

  if (!patterns) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-[20px] font-semibold mb-1" style={{ color: c.text }}>
          Your Working Patterns
        </h1>
        <div
          className="rounded-xl p-8 mt-6 text-center"
          style={{
            backgroundColor: c.surface,
            border: `1px solid ${c.border}`,
          }}
        >
          <p className="text-[14px] leading-relaxed" style={{ color: c.textTertiary }}>
            Donna is still learning your patterns. Check back after a few days of activity.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-[20px] font-semibold" style={{ color: c.text }}>
          Your Working Patterns
        </h1>
        <p className="text-[13px] mt-0.5" style={{ color: c.textTertiary }}>
          Last {patterns.analysis_window_days} days
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <InsightBanner
          summary={patterns.working_style_summary}
          changes={patterns.recent_changes}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ScheduleCard
            startTime={patterns.typical_start_time}
            endTime={patterns.typical_end_time}
            peakHours={patterns.peak_hours}
            deepWorkWindows={patterns.deep_work_windows}
          />
          <ActivityHeatmap
            peakHours={patterns.peak_hours}
            activeDays={patterns.active_days}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CommunicationCard
            avgEmailsPerDay={patterns.avg_emails_per_day}
            avgSlackMessagesPerDay={patterns.avg_slack_messages_per_day}
            avgMeetingsPerDay={patterns.avg_meetings_per_day}
            responseTimeP50Minutes={patterns.response_time_p50_minutes}
            responseTimeP90Minutes={patterns.response_time_p90_minutes}
            busiestDayOfWeek={patterns.busiest_day_of_week}
            quietestDayOfWeek={patterns.quietest_day_of_week}
          />
          <ProjectFocusCard projects={patterns.active_projects_ranked} />
        </div>

        <CollaboratorsCard collaborators={patterns.top_collaborators} />
      </div>
    </div>
  );
}
