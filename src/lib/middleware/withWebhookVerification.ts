import crypto from 'crypto';
import { NextRequest } from 'next/server';

export function verifyNangoWebhook(req: NextRequest, body: string): boolean {
  const signature = req.headers.get('X-Nango-Signature');
  if (!signature) return false;

  const expected = crypto
    .createHmac('sha256', process.env.NANGO_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}
