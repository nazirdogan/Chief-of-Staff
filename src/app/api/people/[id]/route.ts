import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedRequest } from '@/lib/middleware/withAuth';
import { withRateLimit } from '@/lib/middleware/withRateLimit';
import { handleApiError } from '@/lib/api-utils';
import { createServiceClient } from '@/lib/db/client';
import { getContact, getContactInteractions, updateContact } from '@/lib/db/queries/contacts';

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

export const PATCH = withAuth(withRateLimit(20, '1 m', async (req: AuthenticatedRequest) => {
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

    const body = await req.json();
    const supabase = createServiceClient();

    // Validate contact exists and belongs to user
    const contact = await getContact(supabase, req.user.id, contactId);
    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Only allow safe fields to be updated
    const allowedFields: Record<string, unknown> = {};
    if (typeof body.is_vip === 'boolean') allowedFields.is_vip = body.is_vip;
    if (typeof body.user_notes === 'string') allowedFields.user_notes = body.user_notes;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    await updateContact(supabase, req.user.id, contactId, allowedFields);

    const updated = await getContact(supabase, req.user.id, contactId);
    return NextResponse.json({ contact: updated });
  } catch (error) {
    return handleApiError(error);
  }
}));
