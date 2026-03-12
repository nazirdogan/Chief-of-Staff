import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceClient } from '@/lib/db/client';

// Use process.env directly with defaults — avoids importing the full env validator
// at module load time (which would fail during build if other required vars are missing).
const GITHUB_OWNER = process.env.GITHUB_REPO_OWNER ?? 'imdonna';
const GITHUB_REPO = process.env.GITHUB_REPO_NAME ?? 'donna';

/**
 * GET /api/download/mac
 *
 * Public route — serves as a stable download URL for the macOS DMG.
 * Redirects to the latest GitHub release asset (Donna.dmg) and logs
 * the download event to the download_events table (fire-and-forget).
 *
 * This route is intentionally unauthenticated so that anyone can
 * download the app without needing an account first.
 */
export async function GET(req: NextRequest) {
  const owner = GITHUB_OWNER;
  const repo = GITHUB_REPO;
  const downloadUrl = `https://github.com/${owner}/${repo}/releases/latest/download/Donna.dmg`;

  // Log download event (fire-and-forget — don't block the redirect)
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const userAgent = req.headers.get('user-agent') ?? 'unknown';

  try {
    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabase as any).from('download_events').insert({
      ip_hash: ipHash,
      user_agent: userAgent.slice(0, 500),
      platform: 'macos',
    });
  } catch {
    // Non-fatal — logging failure should never block a download
  }

  return NextResponse.redirect(downloadUrl, 302);
}
