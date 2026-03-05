'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BriefingSection } from '@/components/briefing/BriefingSection';
import { CitationDrawer } from '@/components/briefing/CitationDrawer';
import { MeetingPrepCard } from '@/components/people/MeetingPrepCard';
import type { Briefing, BriefingItem, BriefingItemSection, MeetingPrepData, SourceRef } from '@/lib/db/types';

interface BriefingResponse {
  briefing: (Briefing & { items: BriefingItem[] }) | null;
}

const SECTION_ORDER: BriefingItemSection[] = [
  'priority_inbox',
  'todays_schedule',
  'commitment_queue',
  'at_risk',
  'quick_wins',
  'decision_queue',
  'people_context',
];

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<BriefingResponse['briefing']>(null);
  const [meetingPreps, setMeetingPreps] = useState<MeetingPrepData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerItem, setDrawerItem] = useState<BriefingItem | null>(null);

  const fetchBriefing = useCallback(async () => {
    try {
      const res = await fetch('/api/briefing/today');
      if (!res.ok) throw new Error('Failed to fetch briefing');
      const data: BriefingResponse = await res.json();
      setBriefing(data.briefing);
      setMeetingPreps(data.briefing?.meeting_preps ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  async function handleFeedback(itemId: string, feedback: 1 | -1) {
    try {
      const res = await fetch('/api/briefing/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId, feedback }),
      });
      if (!res.ok) throw new Error('Failed to save feedback');
      toast.success(feedback === 1 ? 'Marked as helpful' : 'Feedback recorded');
    } catch {
      toast.error('Failed to save feedback');
    }
  }

  function handleCitationClick(item: BriefingItem) {
    setDrawerItem(item);
  }

  function handlePrepCitationClick(sourceRef: SourceRef, title: string) {
    // Create a synthetic BriefingItem-like object for the drawer
    setDrawerItem({
      source_ref: sourceRef,
      title,
    } as BriefingItem);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Daily Briefing</h1>
        <p className="text-sm text-muted-foreground">Loading your briefing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Daily Briefing</h1>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!briefing || briefing.items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Daily Briefing</h1>
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm font-medium">No briefing yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Your daily briefing will appear here once you connect integrations and data is synced.
            Go to <a href="/settings/integrations" className="underline underline-offset-4 hover:text-foreground">Settings &rarr; Integrations</a> to get started.
          </p>
        </div>
      </div>
    );
  }

  // Group items by section
  const grouped: Partial<Record<BriefingItemSection, BriefingItem[]>> = {};
  for (const item of briefing.items) {
    if (!grouped[item.section]) grouped[item.section] = [];
    grouped[item.section]!.push(item);
  }

  const dateStr = new Date(briefing.briefing_date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daily Briefing</h1>
        <p className="text-sm text-muted-foreground">{dateStr}</p>
      </div>

      {SECTION_ORDER.map(section => {
        const items = grouped[section];
        if (!items || items.length === 0) return null;
        return (
          <div key={section}>
            <BriefingSection
              section={section}
              items={items}
              onFeedback={handleFeedback}
              onCitationClick={handleCitationClick}
            />

            {/* Show meeting prep cards after today's schedule section */}
            {section === 'todays_schedule' && meetingPreps.length > 0 && (
              <div className="mt-3 space-y-2">
                {meetingPreps.map(prep => (
                  <MeetingPrepCard
                    key={prep.event_id}
                    prep={prep}
                    onCitationClick={handlePrepCitationClick}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <CitationDrawer
        open={drawerItem !== null}
        onClose={() => setDrawerItem(null)}
        sourceRef={drawerItem?.source_ref ?? null}
        title={drawerItem?.title ?? ''}
      />
    </div>
  );
}
