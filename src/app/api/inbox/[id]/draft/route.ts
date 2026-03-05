import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getInboxItem } from '@/lib/db/queries/inbox';
import { AI_MODELS } from '@/lib/ai/models';
import { REPLY_DRAFT_PROMPT } from '@/lib/ai/prompts/reply-draft';
import { sanitiseContent } from '@/lib/ai/safety/sanitise';

export const POST = withAuth(withRateLimit(10, '1 m', async (req: AuthenticatedRequest) => {
  try {
  const url = new URL(req.url);
  const segments = url.pathname.split('/');
  const itemId = segments[segments.indexOf('inbox') + 1];

  if (!itemId) {
    return NextResponse.json(
      { error: 'Missing inbox item ID', code: 'VALIDATION_ERROR' },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { instruction } = body as { instruction?: string };

  const supabase = createServiceClient();
  const item = await getInboxItem(supabase, req.user.id, itemId);

  if (!item) {
    return NextResponse.json(
      { error: 'Inbox item not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  // Sanitise the AI summary before using in prompt
  const { content: safeSummary } = sanitiseContent(
    item.ai_summary ?? '',
    `${item.provider}:${item.external_id}`
  );

  // Build prompt context
  const contextParts = [
    `From: ${item.from_name ?? item.from_email} <${item.from_email}>`,
    `Subject: ${item.subject ?? '(no subject)'}`,
    `Summary: ${safeSummary}`,
  ];

  if (instruction) {
    contextParts.push(`\nUser instruction: ${instruction}`);
  }

  // Generate draft using FAST model (reply drafting uses haiku per CLAUDE.md)
  const anthropic = new Anthropic();
  const response = await anthropic.messages.create({
    model: AI_MODELS.FAST,
    max_tokens: 1024,
    system: REPLY_DRAFT_PROMPT,
    messages: [
      {
        role: 'user',
        content: contextParts.join('\n'),
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    return NextResponse.json(
      { error: 'Failed to generate draft', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  let draft: { subject: string; body: string; tone: string };
  try {
    draft = JSON.parse(textContent.text);
  } catch {
    // Fallback if model doesn't return valid JSON
    draft = {
      subject: `Re: ${item.subject ?? ''}`,
      body: textContent.text,
      tone: 'professional',
    };
  }

  // Create pending action — email will NOT be sent until user confirms
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any;
  const { data: pendingAction, error: insertError } = await db
    .from('pending_actions')
    .insert({
      user_id: req.user.id,
      action_type: 'send_email',
      status: 'awaiting_confirmation',
      payload: {
        provider: item.provider,
        to: item.from_email,
        subject: draft.subject,
        body: draft.body,
        thread_id: item.thread_id ?? item.external_id,
        inbox_item_id: item.id,
      },
      source_context: {
        inbox_item_id: item.id,
        original_subject: item.subject,
        from: item.from_email,
        instruction: instruction ?? null,
      },
    })
    .select('id, expires_at')
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to create pending action', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }

  // Mark the inbox item as having a draft
  await db
    .from('inbox_items')
    .update({ reply_drafted: true })
    .eq('id', item.id)
    .eq('user_id', req.user.id);

  return NextResponse.json({
    data: {
      pending_action_id: pendingAction.id,
      draft: {
        subject: draft.subject,
        body: draft.body,
        tone: draft.tone,
        sources_used: 1,
      },
      expires_at: pendingAction.expires_at,
    },
  });
  } catch (error) {
    return handleApiError(error);
  }
}));
