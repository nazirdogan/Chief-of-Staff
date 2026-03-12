import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';

// GET: Download a report as markdown text
// Returns the report content with Content-Disposition header for file download.
// PDF generation can be layered on top later — for now returns raw markdown.
export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    // Path: /api/reports/[id]/download  → id is two segments before 'download'
    const downloadIdx = segments.indexOf('download');
    const reportId = downloadIdx > 0 ? segments[downloadIdx - 1] : null;

    if (!reportId) {
      return NextResponse.json(
        { error: 'Report ID is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: report, error } = await (supabase as any)
      .from('reports')
      .select('id, user_id, type, title, content, sections, created_at')
      .eq('id', reportId)
      .eq('user_id', req.user.id)
      .single();

    if (error || !report) {
      return NextResponse.json(
        { error: 'Report not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Sanitise title for use as a filename
    const safeTitle = (report.title as string)
      .replace(/[^a-zA-Z0-9\s\-_]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 80);

    const filename = `${safeTitle}-${new Date(report.created_at as string).toISOString().split('T')[0]}.md`;

    return new NextResponse(report.content as string, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}));
