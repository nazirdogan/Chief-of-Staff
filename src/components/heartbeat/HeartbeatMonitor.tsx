'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';
import type { HeartbeatConfig, HeartbeatRun, HeartbeatFrequency, MessageDeliveryChannel } from '@/lib/db/types';

export function HeartbeatMonitor() {
  const [config, setConfig] = useState<HeartbeatConfig | null>(null);
  const [runs, setRuns] = useState<HeartbeatRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [configRes, runsRes] = await Promise.all([
        fetch('/api/heartbeat/config'),
        fetch('/api/heartbeat/runs?limit=20'),
      ]);

      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData.data);
      }

      if (runsRes.ok) {
        const runsData = await runsRes.json();
        setRuns(runsData.data);
      }
    } catch {
      setError('Failed to load heartbeat data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function updateConfig(updates: Partial<HeartbeatConfig>) {
    try {
      const res = await fetch('/api/heartbeat/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error('Failed to update config');

      const data = await res.json();
      setConfig(data.data);
      toast.success('Configuration updated');
    } catch {
      toast.error('Failed to update configuration');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  return (
    <div className="space-y-6">
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Scan frequency</Label>
                <p className="text-xs text-muted-foreground">
                  How often Heartbeat checks your integrations
                </p>
              </div>
              <Select
                value={config.scan_frequency}
                onValueChange={(v) =>
                  updateConfig({ scan_frequency: v as HeartbeatFrequency })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Every 15 min</SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Alert channel</Label>
                <p className="text-xs text-muted-foreground">
                  Where to send Heartbeat alerts
                </p>
              </div>
              <Select
                value={config.alert_channel}
                onValueChange={(v) =>
                  updateConfig({ alert_channel: v as MessageDeliveryChannel })
                }
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_app">In-app</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp (coming soon)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <ToggleRow
                label="VIP alerts"
                description="Get notified when a VIP contact messages you"
                checked={config.vip_alerts_enabled}
                onToggle={(v) => updateConfig({ vip_alerts_enabled: v })}
              />
              <ToggleRow
                label="Task checks"
                description="Scan outbound messages for new tasks"
                checked={config.task_check_enabled}
                onToggle={(v) => updateConfig({ task_check_enabled: v })}
              />
              <ToggleRow
                label="Relationship monitoring"
                description="Track contact interaction frequency and flag cold contacts"
                checked={config.relationship_check_enabled}
                onToggle={(v) => updateConfig({ relationship_check_enabled: v })}
              />
              <ToggleRow
                label="Document indexing"
                description="Index Notion pages and documents for semantic search"
                checked={config.document_index_enabled}
                onToggle={(v) => updateConfig({ document_index_enabled: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Quiet hours</Label>
                <p className="text-xs text-muted-foreground">
                  No alerts during these hours
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {config.quiet_hours_start} &ndash; {config.quiet_hours_end}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Heartbeat runs yet. Runs will appear here once your integrations
              start syncing.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Duration</TableHead>
                  <TableHead className="text-right">Started</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium text-sm">
                      {run.job_name}
                    </TableCell>
                    <TableCell>
                      <RunStatusBadge status={run.status} />
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {run.items_processed ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {run.duration_ms != null
                        ? `${(run.duration_ms / 1000).toFixed(1)}s`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {new Date(run.started_at).toLocaleString()}
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

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Badge variant="default">Completed</Badge>;
    case 'running':
      return <Badge variant="secondary">Running</Badge>;
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
