import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { recordAuditLog } from '@/lib/audit/logger';

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return jsonError('Authentication required.', 401);

  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  return NextResponse.json({
    data: {
      id: user.id,
      email: user.email || profile?.email || '',
      displayName: profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin HR',
    },
  });
}

export async function PATCH(request: Request) {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email) return jsonError('Authentication required.', 401);

  const body = await request.json();
  const displayName = String(body.displayName || '').trim();
  const email = String(body.email || '').trim().toLowerCase();
  const currentPassword = String(body.currentPassword || '');
  const newPassword = String(body.newPassword || '');

  if (displayName.length < 2 || displayName.length > 100) {
    return jsonError('Display name must be between 2 and 100 characters.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonError('Enter a valid email address.');
  }
  if (newPassword && newPassword.length < 12) {
    return jsonError('New password must be at least 12 characters.');
  }
  if (newPassword && !currentPassword) {
    return jsonError('Current password is required to change the password.');
  }

  const changes: { email?: string; password?: string; data?: { full_name: string } } = {
    data: { full_name: displayName },
  };
  const emailChanged = email !== user.email.toLowerCase();
  if (emailChanged) changes.email = email;
  if (newPassword) changes.password = newPassword;

  if (newPassword) {
    const verifyClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    );
    const { error: verifyError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) return jsonError('Current password is incorrect.', 403);
  }

  const { data: updated, error: updateError } = await supabase.auth.updateUser(changes);
  if (updateError || !updated.user) {
    return jsonError(updateError?.message || 'Unable to update account.', 400);
  }

  const admin = createAdminSupabaseClient();
  const { error: profileError } = await admin.from('profiles').upsert({
    id: user.id,
    email: updated.user.email || user.email,
    full_name: displayName,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (profileError) return jsonError('Account changed, but the profile could not be synchronized.', 500);

  const desc = newPassword
    ? `Updated HR Admin account display name to "${displayName}" and updated security password.`
    : `Updated HR Admin account display name to "${displayName}".`;

  await recordAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    actorName: displayName,
    action: newPassword ? 'PASSWORD_CHANGED' : 'PROFILE_UPDATED',
    entityType: 'User',
    entityId: user.id,
    entityName: `${displayName} (${user.email})`,
    details: desc,
  });

  return NextResponse.json({
    data: {
      email: updated.user.email || user.email,
      displayName,
    },
    emailConfirmationRequired: emailChanged && updated.user.email === user.email,
  });
}
