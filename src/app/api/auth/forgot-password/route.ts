import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/db/client';

// Public route — generates a password reset link and sends it via Resend.
// We bypass Supabase's built-in email delivery (unreliable on free tier)
// and send through Resend instead.
export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
  }

  const origin = new URL(req.url).origin;
  const supabase = createServiceClient();

  // Generate a signed recovery link server-side — no email sent by Supabase
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: email.trim().toLowerCase(),
    options: {
      redirectTo: `${origin}/reset-password`,
    },
  });

  if (error || !data?.properties?.action_link) {
    // Return success regardless to avoid leaking whether the email exists
    return NextResponse.json({ success: true });
  }

  const resetLink = data.properties.action_link;

  // Send via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: 'Donna <noreply@imdonna.app>',
      to: email.trim(),
      subject: 'Reset your Donna password',
      html: `
<div style="font-family:'DM Sans',system-ui,sans-serif;max-width:480px;margin:0 auto;color:#2D2D2D;background:#FAF9F6;padding:40px 32px;border-radius:12px">
  <h1 style="font-family:Georgia,serif;font-size:26px;font-weight:700;margin:0 0 8px;letter-spacing:-0.01em">
    Reset your password
  </h1>
  <p style="font-size:14px;line-height:1.65;color:#8D99AE;margin:0 0 28px">
    We received a request to reset the password for your Donna account.
    Click the button below to choose a new password.
  </p>

  <a
    href="${resetLink}"
    style="display:inline-block;padding:12px 24px;background:#E8845C;color:#FFFFFF;font-size:14px;font-weight:600;border-radius:8px;text-decoration:none;letter-spacing:0.01em"
  >
    Reset password
  </a>

  <p style="font-size:12px;color:#B0BAC9;margin:28px 0 0;line-height:1.6">
    This link expires in 1 hour. If you didn't request a password reset,
    you can safely ignore this email — your password won't change.
  </p>

  <hr style="border:none;border-top:1px solid rgba(45,45,45,0.08);margin:28px 0 20px" />
  <p style="font-size:11px;color:#C8D0DA;margin:0">
    Donna · <a href="https://imdonna.app" style="color:#C8D0DA;text-decoration:none">imdonna.app</a>
  </p>
</div>`,
    });
  }

  return NextResponse.json({ success: true });
}
