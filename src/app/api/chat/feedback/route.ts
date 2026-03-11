import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { Resend } from 'resend';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';

const feedbackSchema = z.object({
  message_id: z.string().min(1),
  conversation_id: z.string().min(1),
  rating: z.enum(['thumbs_up', 'thumbs_down']),
  message_content: z.string().max(5000),
  feedback_text: z.string().max(2000).optional(),
});

const SUPPORT_EMAIL = 'support@imdonna.app';

export const POST = withAuth(
  withRateLimit(20, '1 m', async (req: AuthenticatedRequest) => {
    try {
      const body = await req.json();

      const result = feedbackSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: 'Invalid request', code: 'VALIDATION_ERROR', details: result.error.message },
          { status: 400 }
        );
      }

      const { message_id, conversation_id, rating, message_content, feedback_text } = result.data;
      const userId = req.user.id;
      const supabase = createServiceClient();

      // Persist feedback to DB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('chat_message_feedback').upsert(
        {
          user_id: userId,
          message_id,
          conversation_id,
          rating,
          message_content: message_content.slice(0, 2000),
          feedback_text: feedback_text ?? null,
        },
        { onConflict: 'user_id,message_id' }
      );

      // Fetch user profile for context
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      // Send email via Resend
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const resend = new Resend(resendKey);
        const emoji = rating === 'thumbs_up' ? '👍' : '👎';
        const label = rating === 'thumbs_up' ? 'Positive' : 'Negative';
        const accentColor = rating === 'thumbs_up' ? '#52B788' : '#D64B2A';

        await resend.emails.send({
          from: 'Donna Feedback <noreply@imdonna.app>',
          to: SUPPORT_EMAIL,
          subject: `${emoji} ${label} feedback from ${profile?.full_name ?? 'a user'}`,
          html: `
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;color:#2D2D2D">
  <h2 style="margin:0 0 4px;font-size:20px">${emoji} Chat Feedback — ${label}</h2>
  <p style="margin:0 0 20px;font-size:13px;color:#888">${new Date().toUTCString()}</p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
    <tr>
      <td style="padding:6px 0;color:#666;width:120px;font-size:13px;vertical-align:top">User</td>
      <td style="padding:6px 0;font-size:13px">${profile?.full_name ?? 'Unknown'} &lt;${profile?.email ?? userId}&gt;</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#666;font-size:13px;vertical-align:top">Conversation</td>
      <td style="padding:6px 0;font-family:monospace;font-size:11px;color:#555">${conversation_id}</td>
    </tr>
    <tr>
      <td style="padding:6px 0;color:#666;font-size:13px;vertical-align:top">Message ID</td>
      <td style="padding:6px 0;font-family:monospace;font-size:11px;color:#555">${message_id}</td>
    </tr>
  </table>

  ${feedback_text ? `
  <div style="background:#f9f9f9;border-left:3px solid ${accentColor};padding:14px 16px;border-radius:0 8px 8px 0;margin-bottom:16px">
    <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">User feedback</p>
    <p style="margin:0;font-size:14px;line-height:1.6;white-space:pre-wrap">${feedback_text}</p>
  </div>` : ''}

  <div style="background:#f6f6f6;border-left:3px solid #ddd;padding:14px 16px;border-radius:0 8px 8px 0">
    <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.06em;font-weight:600">Donna&apos;s response</p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#555;white-space:pre-wrap">${message_content.slice(0, 2000)}${message_content.length > 2000 ? '\n…(truncated)' : ''}</p>
  </div>
</div>`,
        });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  })
);
