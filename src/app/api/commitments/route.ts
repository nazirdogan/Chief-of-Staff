import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { listCommitments, insertCommitment } from '@/lib/db/queries/commitments';
import { validateCommitmentRecord } from '@/lib/ai/safety/citation-validator';
import type { CommitmentConfidence, CommitmentStatus } from '@/lib/db/types';

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const supabase = createServiceClient();
    const url = new URL(req.url);

    const status = url.searchParams.get('status') as CommitmentStatus | null;
    const confidence = url.searchParams.get('confidence') as CommitmentConfidence | null;
    const limit = url.searchParams.get('limit');

    const commitments = await listCommitments(supabase, req.user.id, {
      status: status ?? undefined,
      confidence: confidence ?? undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return NextResponse.json({ commitments });
  } catch (error) {
    return handleApiError(error);
  }
});

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const {
      recipient_email,
      recipient_name,
      commitment_text,
      source_quote,
      source_ref,
      implied_deadline,
    } = body as {
      recipient_email: string;
      recipient_name?: string;
      commitment_text: string;
      source_quote: string;
      source_ref: Record<string, unknown>;
      implied_deadline?: string;
    };

    if (!recipient_email || !commitment_text || !source_quote || !source_ref) {
      return NextResponse.json(
        { error: 'Missing required fields', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Validate before insert
    validateCommitmentRecord({ commitment_text, source_quote, source_ref });

    const supabase = createServiceClient();
    const commitment = await insertCommitment(supabase, {
      user_id: req.user.id,
      recipient_email,
      recipient_name,
      commitment_text,
      source_quote,
      source_ref,
      confidence: 'high',
      confidence_score: 10,
      implied_deadline,
      explicit_deadline: !!implied_deadline,
    });

    return NextResponse.json({ commitment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
});
