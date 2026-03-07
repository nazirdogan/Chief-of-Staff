'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
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

interface Stats {
  waitlist_total: number;
  waitlist_pending: number;
  waitlist_approved: number;
  total_users: number;
  onboarded_users: number;
  total_briefings: number;
  active_telegram: number;
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

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Manage beta access, monitor usage, and review feedback.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border p-1 w-fit">
        {(['overview', 'waitlist', 'feedback'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t}
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
            { label: 'Telegram Connected', value: stats.active_telegram },
            { label: 'Open Feedback', value: stats.open_feedback },
            { label: 'Waitlist Total', value: stats.waitlist_total },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{value}</p>
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
              >
                {s}
              </Button>
            ))}
          </div>

          {waitlist.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No entries with status &quot;{statusFilter}&quot;
            </p>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitlist.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.email}</TableCell>
                      <TableCell>{entry.full_name ?? '-'}</TableCell>
                      <TableCell>{entry.company ?? '-'}</TableCell>
                      <TableCell>{entry.role ?? '-'}</TableCell>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {entry.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleWaitlistAction(entry.id, 'approve')}
                              disabled={actionInProgress === entry.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleWaitlistAction(entry.id, 'reject')}
                              disabled={actionInProgress === entry.id}
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
            <p className="text-sm text-muted-foreground py-8 text-center">
              No open feedback
            </p>
          ) : (
            <div className="space-y-3">
              {feedback.map((fb) => (
                <Card key={fb.id}>
                  <CardContent className="flex items-start gap-4 py-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="capitalize">
                          {fb.type}
                        </Badge>
                        {fb.rating && (
                          <span className="text-xs text-muted-foreground">
                            Rating: {fb.rating}/5
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {fb.profiles?.email ?? 'Unknown user'}
                        </span>
                      </div>
                      <p className="text-sm">{fb.message}</p>
                      {fb.page && (
                        <p className="text-xs text-muted-foreground">
                          Page: {fb.page}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(fb.created_at).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveFeedback(fb.id)}
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
  );
}
