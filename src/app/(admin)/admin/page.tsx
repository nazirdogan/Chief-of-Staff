'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/db/browser-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { LogOut } from 'lucide-react';

/* Donna brand tokens */
const t = {
  bg: '#1B1F3A',
  deep: '#0E1225',
  text: '#FBF7F4',
  textSecondary: 'rgba(251,247,244,0.85)',
  textTertiary: 'rgba(155,175,196,0.85)',
  textQuaternary: 'rgba(155,175,196,0.45)',
  dawn: '#E8845C',
  border: 'rgba(251,247,244,0.08)',
};

interface Stats {
  waitlist_total: number;
  waitlist_pending: number;
  waitlist_approved: number;
  total_users: number;
  onboarded_users: number;
  total_briefings: number;
  open_feedback: number;
}

interface WaitlistEntry {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  role: string | null;
  referral: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface FeedbackEntry {
  id: string;
  type: string;
  message: string;
  page: string | null;
  rating: number | null;
  resolved: boolean;
  created_at: string;
  profiles?: { email: string; full_name: string | null } | null;
}

type Tab = 'overview' | 'waitlist' | 'feedback';

export default function AdminPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.status === 403) {
        setError('You do not have admin access.');
        return;
      }
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    }
  }, []);

  const fetchWaitlist = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/waitlist?status=${statusFilter}`);
      if (!res.ok) throw new Error('Failed to fetch waitlist');
      const data = await res.json();
      setWaitlist(data.entries ?? []);
    } catch {
      toast.error('Failed to load waitlist');
    }
  }, [statusFilter]);

  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/feedback?resolved=false');
      if (!res.ok) throw new Error('Failed to fetch feedback');
      const data = await res.json();
      setFeedback(data.feedback ?? []);
    } catch {
      toast.error('Failed to load feedback');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchWaitlist(), fetchFeedback()]).finally(() =>
      setLoading(false)
    );
  }, [fetchStats, fetchWaitlist, fetchFeedback]);

  useEffect(() => {
    if (tab === 'waitlist') fetchWaitlist();
  }, [statusFilter, tab, fetchWaitlist]);

  async function handleWaitlistAction(id: string, action: 'approve' | 'reject') {
    setActionInProgress(id);
    try {
      const res = await fetch('/api/admin/waitlist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(action === 'approve' ? 'User approved and invite sent' : 'Application rejected');
      fetchWaitlist();
      fetchStats();
    } catch {
      toast.error('Failed to update waitlist entry');
    } finally {
      setActionInProgress(null);
    }
  }

  async function handleResolveFeedback(id: string) {
    try {
      const res = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, resolved: true }),
      });
      if (!res.ok) throw new Error('Failed to resolve');
      toast.success('Feedback marked as resolved');
      fetchFeedback();
      fetchStats();
    } catch {
      toast.error('Failed to resolve feedback');
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: t.bg, color: t.text, fontFamily: "'Inter', sans-serif" }}
    >
      {/* Top bar */}
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-8 py-4"
        style={{ background: t.deep, borderBottom: `1px solid ${t.border}` }}
      >
        <div className="flex items-center gap-3">
          <svg width="26" height="26" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <rect width="100" height="100" rx="18" fill="#1B1F3A"/>
            <path d="M26 18 L26 82 L44 82 C76 82 80 66 80 50 C80 34 76 18 44 18 Z"
                  fill="none" stroke="#FBF7F4" strokeWidth="4.5" strokeLinejoin="round"/>
            <line x1="26" y1="50" x2="72" y2="50" stroke="#E8845C" strokeWidth="3" strokeLinecap="round"/>
            <circle cx="26" cy="50" r="5" fill="#E8845C"/>
          </svg>
          <span
            className="text-[17px]"
            style={{
              fontFamily: "var(--font-cormorant), 'Cormorant Garamond', Georgia, serif",
              fontWeight: 300,
              fontStyle: 'italic',
              color: t.text,
            }}
          >
            donna
          </span>
          <span
            className="ml-2 rounded px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
            style={{ background: 'rgba(232,132,92,0.15)', color: t.dawn }}
          >
            Admin
          </span>
        </div>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors"
          style={{ color: t.textQuaternary }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = t.textSecondary;
            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = t.textQuaternary;
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={14} />
          Sign out
        </button>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-[1200px] px-8 py-8">
        {error ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-sm" style={{ color: '#f87171' }}>{error}</p>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-sm" style={{ color: t.textTertiary }}>Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm" style={{ color: t.textTertiary }}>
                Manage beta access, monitor usage, and review feedback.
              </p>
            </div>

            {/* Tabs */}
            <div
              className="flex gap-1 rounded-lg p-1 w-fit"
              style={{ border: `1px solid ${t.border}` }}
            >
              {(['overview', 'waitlist', 'feedback'] as Tab[]).map((tabName) => (
                <button
                  key={tabName}
                  onClick={() => setTab(tabName)}
                  className="rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors"
                  style={{
                    background: tab === tabName ? t.dawn : 'transparent',
                    color: tab === tabName ? t.text : t.textTertiary,
                  }}
                >
                  {tabName}
                </button>
              ))}
            </div>

            {/* Overview */}
            {tab === 'overview' && stats && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'Waitlist (Pending)', value: stats.waitlist_pending },
                  { label: 'Waitlist (Approved)', value: stats.waitlist_approved },
                  { label: 'Total Users', value: stats.total_users },
                  { label: 'Onboarded', value: stats.onboarded_users },
                  { label: 'Briefings Generated', value: stats.total_briefings },
                  { label: 'Open Feedback', value: stats.open_feedback },
                  { label: 'Waitlist Total', value: stats.waitlist_total },
                ].map(({ label, value }) => (
                  <Card
                    key={label}
                    style={{ background: t.deep, border: `1px solid ${t.border}` }}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium" style={{ color: t.textTertiary }}>
                        {label}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold" style={{ color: t.text }}>{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Waitlist */}
            {tab === 'waitlist' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {['pending', 'approved', 'rejected', 'all'].map((s) => (
                    <Button
                      key={s}
                      variant={statusFilter === s ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(s)}
                      className="capitalize"
                      style={
                        statusFilter === s
                          ? { background: t.dawn, color: t.text }
                          : { borderColor: t.border, color: t.textTertiary }
                      }
                    >
                      {s}
                    </Button>
                  ))}
                </div>

                {waitlist.length === 0 ? (
                  <p className="text-sm py-8 text-center" style={{ color: t.textTertiary }}>
                    No entries with status &quot;{statusFilter}&quot;
                  </p>
                ) : (
                  <div className="rounded-lg" style={{ border: `1px solid ${t.border}` }}>
                    <Table>
                      <TableHeader>
                        <TableRow style={{ borderColor: t.border }}>
                          <TableHead style={{ color: t.textTertiary }}>Email</TableHead>
                          <TableHead style={{ color: t.textTertiary }}>Name</TableHead>
                          <TableHead style={{ color: t.textTertiary }}>Company</TableHead>
                          <TableHead style={{ color: t.textTertiary }}>Role</TableHead>
                          <TableHead style={{ color: t.textTertiary }}>Status</TableHead>
                          <TableHead style={{ color: t.textTertiary }}>Applied</TableHead>
                          <TableHead className="text-right" style={{ color: t.textTertiary }}>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {waitlist.map((entry) => (
                          <TableRow key={entry.id} style={{ borderColor: t.border }}>
                            <TableCell className="font-medium" style={{ color: t.text }}>{entry.email}</TableCell>
                            <TableCell style={{ color: t.textSecondary }}>{entry.full_name ?? '-'}</TableCell>
                            <TableCell style={{ color: t.textSecondary }}>{entry.company ?? '-'}</TableCell>
                            <TableCell style={{ color: t.textSecondary }}>{entry.role ?? '-'}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  entry.status === 'approved'
                                    ? 'default'
                                    : entry.status === 'rejected'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                                className="capitalize"
                              >
                                {entry.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm" style={{ color: t.textQuaternary }}>
                              {new Date(entry.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              {entry.status === 'pending' && (
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleWaitlistAction(entry.id, 'approve')}
                                    disabled={actionInProgress === entry.id}
                                    style={{ background: t.dawn, color: t.text }}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleWaitlistAction(entry.id, 'reject')}
                                    disabled={actionInProgress === entry.id}
                                    style={{ borderColor: t.border, color: t.textTertiary }}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Feedback */}
            {tab === 'feedback' && (
              <div className="space-y-4">
                {feedback.length === 0 ? (
                  <p className="text-sm py-8 text-center" style={{ color: t.textTertiary }}>
                    No open feedback
                  </p>
                ) : (
                  <div className="space-y-3">
                    {feedback.map((fb) => (
                      <Card
                        key={fb.id}
                        style={{ background: t.deep, border: `1px solid ${t.border}` }}
                      >
                        <CardContent className="flex items-start gap-4 py-4">
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="capitalize">
                                {fb.type}
                              </Badge>
                              {fb.rating && (
                                <span className="text-xs" style={{ color: t.textQuaternary }}>
                                  Rating: {fb.rating}/5
                                </span>
                              )}
                              <span className="text-xs" style={{ color: t.textQuaternary }}>
                                {fb.profiles?.email ?? 'Unknown user'}
                              </span>
                            </div>
                            <p className="text-sm" style={{ color: t.textSecondary }}>{fb.message}</p>
                            {fb.page && (
                              <p className="text-xs" style={{ color: t.textQuaternary }}>
                                Page: {fb.page}
                              </p>
                            )}
                            <p className="text-xs" style={{ color: t.textQuaternary }}>
                              {new Date(fb.created_at).toLocaleString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolveFeedback(fb.id)}
                            style={{ borderColor: t.border, color: t.textTertiary }}
                          >
                            Resolve
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
