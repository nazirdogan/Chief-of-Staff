'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Users,
  TrendingUp,
  Lightbulb,
  ChevronDown,
} from 'lucide-react';
import type { Reflection, ReflectionType } from '@/lib/db/types';
import { CompletionReportPanel } from '@/components/operations/CompletionReport';

/* Donna brand tokens */
const c = {
  surface: 'rgba(45,45,45,0.04)',
  surfaceElevated: 'rgba(45,45,45,0.06)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.15)',
  dawnBorder: 'rgba(232,132,92,0.25)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  textGhost: 'rgba(45,45,45,0.4)',
  sage: '#52B788',
  sageBg: 'rgba(82,183,136,0.08)',
  sageBorder: 'rgba(82,183,136,0.2)',
  alert: '#D64B2A',
  alertBg: 'rgba(214,75,42,0.08)',
  alertBorder: 'rgba(214,75,42,0.2)',
  dusk: '#4E7DAA',
  duskBg: 'rgba(78,125,170,0.08)',
  duskBorder: 'rgba(78,125,170,0.2)',
  gold: '#F4C896',
  goldBg: 'rgba(244,200,150,0.08)',
  goldBorder: 'rgba(244,200,150,0.2)',
};

function formatPeriod(start: string, end: string, type: ReflectionType): string {
  const s = new Date(start);
  const e = new Date(end);
  if (type === 'weekly') {
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} \u2013 ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }
  return s.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function ReflectionCard({ reflection }: { reflection: Reflection }) {
  const [expanded, setExpanded] = useState(false);

  const accomplishments = reflection.accomplishments ?? [];
  const slipped = reflection.slipped_items ?? [];
  const relationships = reflection.relationship_highlights ?? [];
  const patterns = reflection.patterns ?? [];

  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{
        background: c.surface,
        border: `1px solid ${c.border}`,
      }}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left transition-all duration-150"
        onMouseEnter={(e) => { e.currentTarget.style.background = c.surfaceElevated; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-2">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
              style={{
                background: reflection.reflection_type === 'weekly' ? c.duskBg : c.goldBg,
              }}
            >
              {reflection.reflection_type === 'weekly'
                ? <Calendar size={13} style={{ color: c.dusk }} />
                : <BookOpen size={13} style={{ color: c.gold }} />
              }
            </div>
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]"
              style={{
                background: reflection.reflection_type === 'weekly' ? c.duskBg : c.goldBg,
                color: reflection.reflection_type === 'weekly' ? c.dusk : c.gold,
                border: `1px solid ${reflection.reflection_type === 'weekly' ? c.duskBorder : c.goldBorder}`,
              }}
            >
              {reflection.reflection_type}
            </span>
            <span
              className="text-[12px] font-medium"
              style={{ color: c.textMuted, fontFamily: "'JetBrains Mono', monospace" }}
            >
              {formatPeriod(reflection.period_start, reflection.period_end, reflection.reflection_type)}
            </span>
          </div>
          <p className="text-[13px] leading-[1.7]" style={{ color: c.textSecondary }}>
            {reflection.summary}
          </p>

          {/* Quick stats row */}
          <div className="flex items-center gap-4 mt-3">
            {accomplishments.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: c.sage }}>
                <CheckCircle2 size={11} />
                {accomplishments.length} accomplished
              </span>
            )}
            {slipped.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: c.alert }}>
                <AlertTriangle size={11} />
                {slipped.length} slipped
              </span>
            )}
            {relationships.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: c.dusk }}>
                <Users size={11} />
                {relationships.length} relationship{relationships.length > 1 ? 's' : ''}
              </span>
            )}
            {patterns.length > 0 && (
              <span className="flex items-center gap-1 text-[11px] font-medium" style={{ color: c.gold }}>
                <TrendingUp size={11} />
                {patterns.length} pattern{patterns.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          size={16}
          className="mt-1 shrink-0 transition-transform duration-200"
          style={{
            color: c.textMuted,
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {/* Expanded content */}
      {expanded && (
        <div
          className="px-5 pb-5 pt-0 space-y-5"
          style={{ borderTop: `1px solid ${c.border}` }}
        >
          {/* Accomplishments */}
          {accomplishments.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5 pt-4">
                <CheckCircle2 size={13} style={{ color: c.sage }} />
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: c.sage }}>
                  Accomplished
                </h3>
              </div>
              <ul className="space-y-2">
                {accomplishments.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                    style={{ background: c.sageBg, border: `1px solid ${c.sageBorder}` }}
                  >
                    <div
                      className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: c.sage }}
                    />
                    <p className="text-[13px] leading-[1.6]" style={{ color: c.textSecondary }}>
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Slipped items */}
          {slipped.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <AlertTriangle size={13} style={{ color: c.alert }} />
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: c.alert }}>
                  Slipped
                </h3>
              </div>
              <ul className="space-y-2">
                {slipped.map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg px-3 py-2.5"
                    style={{ background: c.alertBg, border: `1px solid ${c.alertBorder}` }}
                  >
                    <div
                      className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: c.alert }}
                    />
                    <p className="text-[13px] leading-[1.6]" style={{ color: c.textSecondary }}>
                      {item.description}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Relationship highlights */}
          {relationships.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Users size={13} style={{ color: c.dusk }} />
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: c.dusk }}>
                  Relationships
                </h3>
              </div>
              <div className="space-y-2">
                {relationships.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2.5"
                    style={{ background: c.duskBg, border: `1px solid ${c.duskBorder}` }}
                  >
                    <span className="text-[12px] font-semibold" style={{ color: c.dusk }}>
                      {item.contact_name}
                    </span>
                    <p className="mt-0.5 text-[13px] leading-[1.6]" style={{ color: c.textSecondary }}>
                      {item.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Patterns */}
          {patterns.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <TrendingUp size={13} style={{ color: c.gold }} />
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em]" style={{ color: c.gold }}>
                  Patterns Observed
                </h3>
              </div>
              <div className="space-y-2">
                {patterns.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg px-3 py-2.5"
                    style={{ background: c.goldBg, border: `1px solid ${c.goldBorder}` }}
                  >
                    <p className="text-[13px] leading-[1.6]" style={{ color: c.textSecondary }}>
                      {item.observation}
                    </p>
                    {item.suggestion && (
                      <p className="mt-1 flex items-start gap-1.5 text-[12px]" style={{ color: c.gold }}>
                        <Lightbulb size={11} className="mt-0.5 shrink-0" />
                        {item.suggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {reflection.recommendations && (
            <div
              className="rounded-lg px-4 py-3"
              style={{
                background: c.dawnMuted,
                border: `1px solid ${c.dawnBorder}`,
                borderLeft: `3px solid ${c.dawn}`,
              }}
            >
              <p
                className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5"
                style={{ color: c.dawn }}
              >
                Recommendations
              </p>
              <p className="text-[13px] leading-[1.7]" style={{ color: c.textSecondary }}>
                {reflection.recommendations}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReflectionsPage() {
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReflectionType | 'all'>('all');

  const fetchReflections = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '20' });
      if (filter !== 'all') params.set('type', filter);
      const res = await fetch(`/api/reflections?${params}`);
      if (!res.ok) throw new Error('Failed to fetch reflections');
      const data = await res.json();
      setReflections(data.reflections ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    fetchReflections();
  }, [fetchReflections]);

  const filterButtons: Array<{ value: ReflectionType | 'all'; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="text-[28px] tracking-[-0.02em] leading-tight"
            style={{
              color: c.text,
              fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
            }}
          >
            Reflections
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: c.textMuted }}>
            Weekly and monthly reviews of your activity, accomplishments, and patterns.
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5">
        {filterButtons.map(btn => {
          const active = filter === btn.value;
          return (
            <button
              key={btn.value}
              onClick={() => setFilter(btn.value)}
              className="rounded-lg px-3 py-1.5 text-[12px] font-medium transition-all duration-150"
              style={{
                background: active ? c.dawnMuted : 'transparent',
                color: active ? c.dawn : c.textMuted,
                border: `1px solid ${active ? c.dawnBorder : 'transparent'}`,
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.background = c.surface;
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.background = 'transparent';
              }}
            >
              {btn.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl"
              style={{ background: c.dawnMuted, border: `1px solid ${c.border}` }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div
          className="rounded-xl p-6 text-center"
          style={{ background: c.alertBg, border: `1px solid ${c.alertBorder}` }}
        >
          <p className="text-[13px]" style={{ color: c.alert }}>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && reflections.length === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: c.surface, border: `1px dashed ${c.borderHover}` }}
        >
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: c.dawnMuted }}
          >
            <BookOpen size={22} style={{ color: c.dawn }} />
          </div>
          <p className="text-[14px] font-semibold" style={{ color: c.text }}>
            No reflections yet
          </p>
          <p
            className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed"
            style={{ color: c.textTertiary }}
          >
            Donna will generate your first weekly reflection after a full week of briefings.
            Monthly reflections arrive on the 1st of each month.
          </p>
        </div>
      )}

      {/* Reflections list + completion report (only after load) */}
      {!loading && !error && (
        <>
          <CompletionReportPanel />
          {reflections.length > 0 && (
            <div className="space-y-3">
              {reflections.map(reflection => (
                <ReflectionCard key={reflection.id} reflection={reflection} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
