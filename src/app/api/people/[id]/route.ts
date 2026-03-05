import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getContact, getContactInteractions } from '@/lib/db/queries/contacts';

export const GET = withAuth(withRateLimit(30, '1 m', async (req: AuthenticatedRequest) => {
  try {
    const url = new URL(req.url);
    const segments = url.pathname.split('/');
    const contactId = segments[segments.indexOf('people') + 1];

    if (!contactId) {
      return NextResponse.json(
        { error: 'Missing contact ID', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();
    const contact = await getContact(supabase, req.user.id, contactId);

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const interactions = await getContactInteractions(supabase, req.user.id, contactId, 20);

    return NextResponse.json({ contact, interactions });
  } catch (error) {
    return handleApiError(error);
  }
}));
