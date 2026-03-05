import { HeartbeatMonitor } from '@/components/heartbeat/HeartbeatMonitor';

export default function HeartbeatPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Heartbeat Monitor</h1>
        <p className="text-sm text-muted-foreground">
          Configure how often your integrations sync and view recent run history.
        </p>
      </div>
      <HeartbeatMonitor />
    </div>
  );
}
