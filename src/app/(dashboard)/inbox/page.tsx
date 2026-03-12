'use client';

import { useCallback, useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Inbox as InboxIcon,
  Mail,
  Reply,
  Loader2,
  Sparkles,
  Undo2,
  Clock,
  Send,
  Trash2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { InboxItem } from '@/lib/db/types';
import { decodeEntities } from '@/lib/utils/decode-entities';
import { ConfirmActionModal } from '@/components/shared/ConfirmActionModal';

const c = {
  surface: 'rgba(45,45,45,0.04)',
  border: 'rgba(45,45,45,0.08)',
  borderHover: 'rgba(45,45,45,0.16)',
  dawn: '#E8845C',
  dawnMuted: 'rgba(232,132,92,0.15)',
  text: '#2D2D2D',
  textSecondary: 'rgba(45,45,45,0.8)',
  textTertiary: 'rgba(45,45,45,0.6)',
  textMuted: 'rgba(45,45,45,0.5)',
  green: '#52B788',
  red: '#D64B2A',
  blue: '#4E7DAA',
};

const PROVIDER_LABELS: Record<string, string> = {
  gmail: 'Gmail',
  outlook: 'Outlook',
  slack: 'Slack',
  notion: 'Notion',
};

type FilterMode = 'all' | 'unread' | 'needs_reply' | 'starred' | 'archived_by_donna' | 'pending';

interface ArchivedItem extends InboxItem {
  archived_at?: string;
  archive_reason?: string;
}

interface PendingAction {
  id: string;
  action_type: string;
  payload: {
    to?: string;
    subject?: string;
    body?: string;
    provider?: string;
    thread_id?: string;
    inbox_item_id?: string;
  };
  source_context: {
    original_subject?: string;
    from?: string;
    instruction?: string | null;
  };
  created_at: string;
  expires_at: string;
  status: string;
}

function InboxPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<InboxItem[]>([]);
  const [archivedItems, setArchivedItems] = useState<ArchivedItem[]>([]);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>(() => {
    const tab = searchParams.get('tab');
    if (tab === 'pending') return 'pending';
    return 'all';
  });
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [bulkRestoring, setBulkRestoring] = useState(false);
  const [integrations, setIntegrations] = useState<Array<{ provider: string; status: string }>>([]);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; actionId: string; subject: string; body: string; to: string } | null>(null);
  const [expandedDraft, setExpandedDraft] = useState<string | null>(null);

  // Sync tab param → filter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'pending') setFilter('pending');
  }, [searchParams]);

  const fetchPendingActions = useCallback(async () => {
    try {
      const res = await fetch('/api/pending-actions');
      if (!res.ok) return;
      const data = await res.json();
      const actions = (data.data ?? []) as PendingAction[];
      setPendingActions(actions);
      setPendingCount(actions.length);
    } catch {
      // non-fatal
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setItems([]);
    setArchivedItems([]);
    try {
      if (filter === 'pending') {
        await fetchPendingActions();
        setLoading(false);
        return;
      }
      if (filter === 'archived_by_donna') {
        const res = await fetch('/api/inbox?filter=archived_by_donna');
        if (!res.ok) throw new Error('Failed to fetch archived items');
        const data = await res.json();
        setArchivedItems(data.items as ArchivedItem[]);
        setItems([]);
      } else {
        const params = new URLSearchParams();
        if (filter === 'unread') params.set('unread', 'true');
        if (filter === 'needs_reply') params.set('needs_reply', 'true');
        const res = await fetch(`/api/inbox?${params}`);
        if (!res.ok) throw new Error('Failed to fetch inbox');
        const data = await res.json();
        let filtered = data.items as InboxItem[];
        if (filter === 'starred') {
          filtered = filtered.filter((i) => i.is_starred);
        }
        setItems(filtered);
        setArchivedItems([]);
      }
    } catch {
      toast.error('Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, [filter, fetchPendingActions]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Always keep pending count fresh
  useEffect(() => {
    fetchPendingActions();
  }, [fetchPendingActions]);

  useEffect(() => {
    fetch('/api/integrations')
      .then((r) => r.json())
      .then((data) => setIntegrations(data.integrations ?? []))
      .catch(() => {});
  }, []);

  function handleFilterChange(newFilter: FilterMode) {
    setFilter(newFilter);
    if (newFilter === 'pending') {
      router.replace('/inbox?tab=pending');
    } else {
      router.replace('/inbox');
    }
  }

  async function handleDraftReply(itemId: string) {
    setDraftingId(itemId);
    try {
      const res = await fetch(`/api/inbox/${itemId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Failed to generate draft');

      // Mark item as drafted optimistically
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, reply_drafted: true } : i));

      toast.success('Reply draft ready', {
        description: 'Review and send from Pending Drafts.',
        action: {
          label: 'View Draft',
          onClick: () => handleFilterChange('pending'),
        },
        duration: 8000,
      });

      // Refresh pending count
      fetchPendingActions();
    } catch {
      toast.error('Failed to generate draft');
    } finally {
      setDraftingId(null);
    }
  }

  async function handleRestore(itemId: string) {
    setRestoringId(itemId);
    try {
      const res = await fetch(`/api/inbox/${itemId}/restore`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to restore');
      setArchivedItems((prev) => prev.filter((i) => i.id !== itemId));
      toast.success('Email restored');
    } catch {
      toast.error('Failed to restore email');
    } finally {
      setRestoringId(null);
    }
  }

  async function handleBulkRestore() {
    setBulkRestoring(true);
    try {
      const res = await fetch('/api/inbox/bulk-restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ since: '7d' }),
      });
      if (!res.ok) throw new Error('Failed to bulk restore');
      const data = await res.json();
      toast.success(`Restored ${data.restored} emails`);
      fetchItems();
    } catch {
      toast.error('Failed to restore emails');
    } finally {
      setBulkRestoring(false);
    }
  }

  function handleActionConfirmed(actionId: string) {
    setPendingActions((prev) => prev.filter((a) => a.id !== actionId));
    setPendingCount((n) => Math.max(0, n - 1));
    setConfirmModal(null);
    toast.success('Email sent');
  }

  function handleActionRejected(actionId: string) {
    setPendingActions((prev) => prev.filter((a) => a.id !== actionId));
    setPendingCount((n) => Math.max(0, n - 1));
    setConfirmModal(null);
    toast.success('Draft discarded');
  }

  const hasEmailIntegration = integrations.some(
    (i) => ['gmail', 'outlook'].includes(i.provider) && i.status === 'connected'
  );

  const unreadCount = items.filter((i) => !i.is_read).length;
  const needsReplyCount = items.filter((i) => i.needs_reply).length;

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = diffMs / (1000 * 60 * 60);
    if (diffHrs < 1) return `${Math.round(diffMs / 60000)}m ago`;
    if (diffHrs < 24) return `${Math.round(diffHrs)}h ago`;
    if (diffHrs < 48) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function timeUntilExpiry(expiresAt: string) {
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff < 0) return 'Expired';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `Expires in ${hours}h`;
    return `Expires in ${minutes}m`;
  }

  function urgencyColor(score: number | null): string {
    if (!score) return c.textMuted;
    if (score >= 8) return c.red;
    if (score >= 6) return '#F4C896';
    return c.textTertiary;
  }

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <InboxIcon size={20} color={c.dawn} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: c.text, margin: 0 }}>Inbox</h1>
        </div>
        <p style={{ fontSize: 13, color: c.textTertiary, margin: 0 }}>
          Unified view of messages across all connected channels
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <StatBadge label="Total" value={items.length} />
        <StatBadge label="Unread" value={unreadCount} color={c.blue} />
        <StatBadge label="Needs Reply" value={needsReplyCount} color={c.red} />
        {pendingCount > 0 && (
          <StatBadge label="Pending Drafts" value={pendingCount} color={c.dawn} />
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {([
          { key: 'all', label: 'All' },
          { key: 'unread', label: 'Unread' },
          { key: 'needs_reply', label: 'Needs Reply' },
          { key: 'starred', label: 'Starred' },
          { key: 'archived_by_donna', label: 'Archived by Donna' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500,
              border: `1px solid ${filter === key ? c.dawn : c.border}`,
              background: filter === key ? `${c.dawn}10` : c.surface,
              color: filter === key ? c.dawn : c.textTertiary,
              cursor: 'pointer',
            }}
          >
            {key === 'archived_by_donna' && <Sparkles size={12} style={{ marginRight: 4 }} />}
            {label}
          </button>
        ))}
      </div>

      {/* Archived by Donna tab content */}
      {filter === 'archived_by_donna' && !loading ? (
        archivedItems.length === 0 ? (
          <EmptyState
            icon={<Sparkles size={22} color={c.dawn} />}
            title="Nothing archived yet"
            description="Donna hasn't archived anything yet. Once she learns your email habits, low-engagement emails will appear here."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Weekly banner */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', borderRadius: 10,
              background: c.dawnMuted, border: `1px solid ${c.border}`,
            }}>
              <span style={{ fontSize: 13, color: c.textSecondary }}>
                Donna archived <strong style={{ color: c.text }}>{archivedItems.filter((i) => {
                  const d = new Date(i.archived_at ?? i.updated_at);
                  return d > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                }).length}</strong> emails this week.
              </span>
              <button
                onClick={handleBulkRestore}
                disabled={bulkRestoring}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, color: c.dawn, background: 'none',
                  border: 'none', cursor: 'pointer', fontWeight: 600,
                }}
              >
                {bulkRestoring ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
                Undo all (last 7 days)
              </button>
            </div>

            {/* Archived items list */}
            {archivedItems.map((item) => {
              const senderDomain = item.from_email?.split('@')[1] ?? '';
              const engagementScore = typeof item.archive_reason === 'string'
                ? (() => { try { const o = JSON.parse(item.archive_reason); return o.engagement_score; } catch { return null; } })()
                : null;
              const reasonLabel = engagementScore !== null && engagementScore < 0.3
                ? 'Low engagement'
                : 'Unread · No action needed';

              return (
                <div
                  key={item.id}
                  style={{
                    padding: '14px 16px', borderRadius: 10,
                    border: `1px solid ${c.border}`, background: c.surface,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>
                          {item.from_name || item.from_email}
                        </span>
                        <span style={{ fontSize: 11, color: c.textMuted }}>
                          {senderDomain}
                        </span>
                      </div>
                      <div style={{
                        fontSize: 13, color: c.textSecondary, marginTop: 2,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {item.subject ?? '(no subject)'}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <span style={{
                          fontSize: 10, padding: '2px 8px', borderRadius: 4,
                          background: 'rgba(232,132,92,0.12)', color: '#E8845C',
                          fontWeight: 600,
                        }}>
                          {reasonLabel}
                        </span>
                        <span style={{ fontSize: 11, color: c.textMuted }}>
                          {formatDate(item.archived_at ?? item.updated_at)}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestore(item.id)}
                      disabled={restoringId === item.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        fontSize: 11, padding: '4px 10px', borderRadius: 6,
                        border: `1px solid ${c.border}`, background: 'transparent',
                        color: c.textSecondary, cursor: 'pointer', fontWeight: 500,
                        marginLeft: 12, flexShrink: 0,
                      }}
                    >
                      {restoringId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />}
                      Undo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {/* Pending Drafts tab */}
      {filter === 'pending' ? (
        loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[1, 2].map((i) => (
              <div key={i} style={{ height: 100, borderRadius: 10, background: c.dawnMuted, border: `1px solid ${c.border}` }} className="animate-pulse" />
            ))}
          </div>
        ) : pendingActions.length === 0 ? (
          <EmptyState
            icon={<Clock size={22} color={c.dawn} />}
            title="No pending drafts"
            description="When Donna drafts a reply for you, it will appear here for your review before sending."
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{
              padding: '10px 16px', borderRadius: 10,
              background: c.dawnMuted, border: `1px solid ${c.border}`,
              fontSize: 13, color: c.textSecondary,
            }}>
              <strong style={{ color: c.text }}>{pendingActions.length}</strong> draft{pendingActions.length !== 1 ? 's' : ''} awaiting your review. Nothing sends until you approve.
            </div>

            {pendingActions.map((action) => {
              const isExpanded = expandedDraft === action.id;
              const to = action.payload.to ?? action.source_context.from ?? '—';
              const subject = action.payload.subject ?? action.source_context.original_subject ?? '(no subject)';
              const body = action.payload.body ?? '';
              const isExpiring = new Date(action.expires_at).getTime() - Date.now() < 2 * 60 * 60 * 1000;

              return (
                <div
                  key={action.id}
                  style={{
                    borderRadius: 12, border: `1px solid ${c.border}`,
                    background: '#FAFAFA', overflow: 'hidden',
                  }}
                >
                  {/* Draft header */}
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: c.dawn, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Draft Reply
                          </span>
                          <span style={{
                            fontSize: 10, color: isExpiring ? c.red : c.textMuted,
                            fontWeight: isExpiring ? 600 : 400,
                          }}>
                            {timeUntilExpiry(action.expires_at)}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: c.text, marginBottom: 1 }}>
                          {decodeEntities(subject)}
                        </div>
                        <div style={{ fontSize: 12, color: c.textTertiary }}>
                          To: {to}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedDraft(isExpanded ? null : action.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontSize: 11, color: c.textTertiary,
                          background: 'none', border: 'none', cursor: 'pointer',
                          marginLeft: 12, flexShrink: 0, padding: '4px 0',
                        }}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? 'Hide' : 'Preview'}
                      </button>
                    </div>

                    {/* Body preview (collapsed) */}
                    {!isExpanded && body && (
                      <div style={{
                        fontSize: 12, color: c.textTertiary, marginTop: 8,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {body.split('\n')[0]}
                      </div>
                    )}

                    {/* Body expanded */}
                    {isExpanded && body && (
                      <div style={{
                        marginTop: 12, padding: '12px 14px', borderRadius: 8,
                        background: 'rgba(45,45,45,0.03)', border: `1px solid ${c.border}`,
                        fontSize: 13, color: c.textSecondary, lineHeight: 1.6,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      }}>
                        {body}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{
                    display: 'flex', gap: 8, padding: '10px 16px',
                    borderTop: `1px solid ${c.border}`,
                    background: 'rgba(45,45,45,0.02)',
                  }}>
                    <button
                      onClick={() => setConfirmModal({ open: true, actionId: action.id, subject, body, to })}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, fontWeight: 600, padding: '7px 16px',
                        borderRadius: 8, background: c.dawn, color: '#fff',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      <Send size={12} />
                      Send
                    </button>
                    <button
                      onClick={() => {
                        // Reject without modal for discard
                        fetch('/api/actions/reject', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ pending_action_id: action.id }),
                        }).then(() => {
                          handleActionRejected(action.id);
                        }).catch(() => {
                          toast.error('Failed to discard draft');
                        });
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, fontWeight: 500, padding: '7px 14px',
                        borderRadius: 8, background: 'transparent',
                        border: `1px solid ${c.border}`, color: c.textTertiary,
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={12} />
                      Discard
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : null}

      {/* Content — standard inbox views */}
      {filter === 'archived_by_donna' || filter === 'pending' ? null : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ height: 72, borderRadius: 10, background: c.dawnMuted, border: `1px solid ${c.border}` }} className="animate-pulse" />
          ))}
        </div>
      ) : !hasEmailIntegration && items.length === 0 ? (
        <EmptyState
          icon={<Mail size={22} color={c.dawn} />}
          title="Connect your email"
          description="Connect Gmail or Outlook in Settings to see your inbox here."
          actionHref="/settings/integrations"
          actionLabel="Connect integrations"
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<InboxIcon size={22} color={c.dawn} />}
          title={filter === 'all' ? 'Inbox is empty' : `No ${filter.replace('_', ' ')} items`}
          description={filter === 'all'
            ? 'New messages will appear here as they are synced from your connected accounts.'
            : 'Try a different filter or wait for new messages to sync.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '14px 16px', borderRadius: 10,
                border: `1px solid ${c.border}`,
                background: item.is_read ? c.surface : 'rgba(255,255,255,0.06)',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = c.borderHover)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = c.border as string)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!item.is_read && (
                      <div style={{ width: 6, height: 6, borderRadius: 3, background: c.blue, flexShrink: 0 }} />
                    )}
                    <span style={{
                      fontSize: 13, fontWeight: item.is_read ? 400 : 600, color: c.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.from_name || item.from_email}
                    </span>
                    <span style={{ fontSize: 11, color: c.textMuted, flexShrink: 0 }}>
                      {(item as InboxItem & { account_label?: string | null }).account_label
                        ? (item as InboxItem & { account_label?: string | null }).account_label
                        : (PROVIDER_LABELS[item.provider] ?? item.provider)}
                    </span>
                  </div>
                  <div style={{
                    fontSize: 13, color: c.textSecondary, marginTop: 2, fontWeight: item.is_read ? 400 : 500,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {decodeEntities(item.task_title || item.subject || '(no subject)')}
                  </div>
                  {item.ai_summary && (
                    <div style={{
                      fontSize: 12, color: c.textTertiary, marginTop: 4,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {decodeEntities(item.ai_summary)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ fontSize: 11, color: c.textMuted }}>{formatDate(item.received_at)}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {item.urgency_score && item.urgency_score >= 7 && (
                      <span style={{
                        fontSize: 10, padding: '1px 6px', borderRadius: 4,
                        background: `${urgencyColor(item.urgency_score)}12`,
                        color: urgencyColor(item.urgency_score),
                        fontWeight: 600,
                      }}>
                        P{item.urgency_score >= 9 ? '1' : '2'}
                      </span>
                    )}
                    {item.needs_reply && !item.reply_drafted && (
                      <button
                        onClick={() => handleDraftReply(item.id)}
                        disabled={draftingId === item.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 3,
                          fontSize: 10, padding: '2px 8px', borderRadius: 4,
                          background: `${c.dawn}12`, color: c.dawn,
                          border: 'none', cursor: 'pointer', fontWeight: 500,
                        }}
                      >
                        {draftingId === item.id ? <Loader2 size={10} className="animate-spin" /> : <Reply size={10} />}
                        Draft
                      </button>
                    )}
                    {item.reply_drafted && (
                      <button
                        onClick={() => handleFilterChange('pending')}
                        style={{
                          fontSize: 10, padding: '1px 6px', borderRadius: 4,
                          background: `${c.green}12`, color: c.green, fontWeight: 500,
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        Drafted ↗
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {/* Tags */}
              {item.task_tags && item.task_tags.length > 0 && (
                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                  {item.task_tags.map((tag) => (
                    <span key={tag} style={{
                      fontSize: 10, padding: '1px 6px', borderRadius: 4,
                      background: c.dawnMuted, color: c.textTertiary,
                    }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirm send modal */}
      {confirmModal && (
        <ConfirmActionModal
          open={confirmModal.open}
          onOpenChange={(open) => !open && setConfirmModal(null)}
          title="Send this reply?"
          description={`To: ${confirmModal.to}\n${confirmModal.subject}\n\n${confirmModal.body.slice(0, 200)}${confirmModal.body.length > 200 ? '…' : ''}`}
          confirmLabel="Send Email"
          pendingActionId={confirmModal.actionId}
          onConfirmed={() => handleActionConfirmed(confirmModal.actionId)}
          onRejected={() => handleActionRejected(confirmModal.actionId)}
        />
      )}
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={<div style={{ padding: 48, textAlign: 'center', color: 'rgba(45,45,45,0.4)', fontSize: 13 }}>Loading…</div>}>
      <InboxPageInner />
    </Suspense>
  );
}

function StatBadge({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
      borderRadius: 8, background: c.dawnMuted, border: `1px solid ${c.border}`,
    }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: color ?? c.text }}>{value}</span>
      <span style={{ fontSize: 11, color: c.textTertiary, fontWeight: 500 }}>{label}</span>
    </div>
  );
}

function EmptyState({ icon, title, description, actionHref, actionLabel }: {
  icon: React.ReactNode; title: string; description: string;
  actionHref?: string; actionLabel?: string;
}) {
  return (
    <div style={{
      padding: 48, textAlign: 'center', borderRadius: 12,
      border: `1px dashed ${c.borderHover}`, background: c.surface,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, display: 'flex',
        alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
        background: c.dawnMuted,
      }}>
        {icon}
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: c.text }}>{title}</p>
      <p style={{ fontSize: 13, color: c.textTertiary, marginTop: 4, maxWidth: 320, margin: '4px auto 0' }}>
        {description}
      </p>
      {actionHref && (
        <a
          href={actionHref}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
            padding: '8px 20px', borderRadius: 8, background: '#E8845C', color: '#1B1F3A',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          {actionLabel}
        </a>
      )}
    </div>
  );
}
