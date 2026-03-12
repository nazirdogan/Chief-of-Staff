import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { listTasks, insertTask } from '@/lib/db/queries/tasks';
import { validateTaskRecord } from '@/lib/ai/safety/citation-validator';
import type { TaskConfidence, TaskStatus } from '@/lib/db/types';

export const GET = withAuth(withRateLimit(60, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);

    const status = url.searchParams.get('status') as TaskStatus | null;
    const confidence = url.searchParams.get('confidence') as TaskConfidence | null;
    const limit = url.searchParams.get('limit');

    const tasks = await listTasks(supabase, req.user.id, {
      status: status ?? undefined,
      confidence: confidence ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    return handleApiError(error);
  }
}));

export const POST = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const {
      recipient_email,
      recipient_name,
      task_text,
      source_quote,
      source_ref,
      implied_deadline,
      direction,
    } = body as {
      recipient_email: string;
      recipient_name?: string;
      task_text: string;
      source_quote: string;
      source_ref: Record<string, unknown>;
      implied_deadline?: string;
      direction?: 'outbound' | 'inbound';
    };

    if (!recipient_email || !task_text || !source_quote || !source_ref) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate before insert
    validateTaskRecord({ task_text, source_quote, source_ref });

    const supabase = createServiceClient();
    const task = await insertTask(supabase, {
      user_id: req.user.id,
      recipient_email,
      recipient_name,
      task_text,
      source_quote,
      source_ref,
      confidence: 'high',
      confidence_score: 10,
      implied_deadline,
      explicit_deadline: !!implied_deadline,
      direction: direction ?? 'outbound',
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}));
