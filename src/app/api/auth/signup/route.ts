import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/db/client';

// Public route — creates user without email verification requirement
export async function POST(req: Request) {
  const { email, password, fullName } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email verification
    user_metadata: { full_name: fullName || '' },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ userId: data.user?.id });
}
