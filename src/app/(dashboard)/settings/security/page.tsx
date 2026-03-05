'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Monitor, Smartphone, Shield } from 'lucide-react';
import type { UserSession, IntegrationAuditLog } from '@/lib/db/types';

export default function SecuritySettingsPage() {
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [auditLog, setAuditLog] = useState<IntegrationAuditLog[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditProvider, setAuditProvider] = useState<string>('all');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.data);
      }
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const fetchAuditLog = useCallback(async (provider?: string) => {
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (provider && provider !== 'all') {
        params.set('provider', provider);
      }
      const res = await fetch(`/api/settings/audit-log?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLog(data.data);
        setAuditTotal(data.meta.total);
      }
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchAuditLog();
  }, [fetchSessions, fetchAuditLog]);

  async function handleRevoke(sessionId: string) {
    setRevokingId(sessionId);
    try {
      const res = await fetch('/api/settings/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      }
    } finally {
      setRevokingId(null);
    }
  }

  function handleProviderFilter(value: string) {
    setAuditProvider(value);
    fetchAuditLog(value);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Security</h1>
        <p className="text-sm text-muted-foreground">
          Manage sessions, view audit logs, and configure two-factor authentication.
        </p>
      </div>

      {/* 2FA Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4" />
            Two-factor authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Two-factor authentication adds an extra layer of security to your
            account. When enabled, you will need to enter a code from your
            authenticator app when signing in.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            2FA can be configured in your Supabase account settings. Contact
            support if you need help enabling it.
          </p>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active sessions found.
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <DeviceIcon type={session.device_type} />
                    <div>
                      <p className="text-sm font-medium">
                        {session.device_name ?? 'Unknown device'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {session.ip_address && <span>{session.ip_address}</span>}
                        <span>
                          Last active:{' '}
                          {new Date(session.last_active_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRevoke(session.id)}
                    disabled={revokingId === session.id}
                  >
                    {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">
            Audit log
            {auditTotal > 0 && (
              <Badge variant="secondary" className="ml-2">
                {auditTotal} entries
              </Badge>
            )}
          </CardTitle>
          <Select value={auditProvider} onValueChange={handleProviderFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              <SelectItem value="gmail">Gmail</SelectItem>
              <SelectItem value="google_calendar">Google Calendar</SelectItem>
              <SelectItem value="outlook">Outlook</SelectItem>
              <SelectItem value="slack">Slack</SelectItem>
              <SelectItem value="notion">Notion</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loadingAudit ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No API calls logged yet. Activity will appear here as your
              integrations sync.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLog.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-sm">
                      <Badge variant="outline">{entry.provider}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {entry.action}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {entry.status_code != null ? (
                        <StatusCodeBadge code={entry.status_code} />
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {entry.duration_ms != null
                        ? `${entry.duration_ms}ms`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(entry.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DeviceIcon({ type }: { type: string | null }) {
  switch (type) {
    case 'ios':
    case 'android':
      return <Smartphone className="h-5 w-5 text-muted-foreground" />;
    default:
      return <Monitor className="h-5 w-5 text-muted-foreground" />;
  }
}

function StatusCodeBadge({ code }: { code: number }) {
  if (code >= 200 && code < 300) {
    return <Badge variant="default">{code}</Badge>;
  }
  if (code >= 400) {
    return <Badge variant="destructive">{code}</Badge>;
  }
  return <Badge variant="secondary">{code}</Badge>;
}
