import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';

// POST: Generate a report
// - type: 'weekly_summary' | 'project_status' | 'ad_hoc_research'
// - ad_hoc_research is Pro tier only
export const POST = withAuth(withRateLimit(5, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json() as {
      type?: string;
      topic?: string;
      project?: string;
    };

    const reportType = body.type;
    if (!reportType || !['weekly_summary', 'project_status', 'ad_hoc_research'].includes(reportType)) {
      return NextResponse.json(
        { error: 'type is required and must be one of: weekly_summary, project_status, ad_hoc_research', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (reportType === 'project_status' && !body.project) {
      return NextResponse.json(
        { error: 'project is required for project_status reports', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    if (reportType === 'ad_hoc_research' && !body.topic) {
      return NextResponse.json(
        { error: 'topic is required for ad_hoc_research reports', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Ad-hoc research is Pro tier only — check subscription
    if (reportType === 'ad_hoc_research') {
      const supabase = createServiceClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('subscription_status')
        .eq('id', req.user.id)
        .single();

      const isSubscribed =
        profile?.subscription_status === 'active' ||
        profile?.subscription_status === 'trialing';

      if (!isSubscribed) {
        return NextResponse.json(
          {
            error: 'Ad-hoc research reports require a Pro subscription.',
            code: 'SUBSCRIPTION_REQUIRED',
            upgrade_url: '/settings/pricing',
          },
          { status: 403 }
        );
      }
    }

    const {
      generateWeeklySummary,
      generateProjectStatus,
      generateAdHocResearch,
    } = await import('@/lib/ai/agents/report-generator');

    let report;
    switch (reportType) {
      case 'weekly_summary':
        report = await generateWeeklySummary(req.user.id);
        break;
      case 'project_status':
        report = await generateProjectStatus(req.user.id, body.project!);
        break;
      case 'ad_hoc_research':
        report = await generateAdHocResearch(req.user.id, body.topic!);
        break;
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}));
