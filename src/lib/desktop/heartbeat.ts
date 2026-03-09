/**
 * Desktop heartbeat client.
 *
 * Pings /api/desktop/heartbeat every 60 seconds while the desktop app is
 * running. Reports observer status so the server has ground truth about
 * whether the desktop app is alive and observing.
 */

let intervalId: ReturnType<typeof setInterval> | null = null;

interface HeartbeatPayload {
  observer_running: boolean;
  observation_count: number;
  app_version?: string;
}

async function sendHeartbeat(payload: HeartbeatPayload): Promise<void> {
  try {
    await fetch('/api/desktop/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-fatal — heartbeat will retry on next interval
  }
}

/**
 * Start the heartbeat loop. Sends an immediate ping, then every 60 seconds.
 * Returns a cleanup function to stop the loop.
 */
export function startHeartbeat(getPayload: () => HeartbeatPayload): () => void {
  // Prevent duplicate loops
  if (intervalId) return () => stopHeartbeat();

  // Immediate first ping
  sendHeartbeat(getPayload());

  intervalId = setInterval(() => {
    sendHeartbeat(getPayload());
  }, 60_000);

  return () => stopHeartbeat();
}

export function stopHeartbeat(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
