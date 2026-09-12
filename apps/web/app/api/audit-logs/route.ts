import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim()?.toLowerCase() || '';
    const typeFilter = searchParams.get('type') || 'ALL';

    const admin = createAdminSupabaseClient();

    const { data: logs, error } = await admin
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Fetch audit_logs error:', error);
    }

    const formatted = (logs || []).map((l: any) => {
      const meta = l.metadata || {};
      const actorName = meta.actor_name || l.actor_id || 'HR Administrator';
      const actorEmail = meta.actor_email ? ` (${meta.actor_email})` : '';
      const entity = meta.entity_name || l.entity_type || 'System';
      const details = meta.details || l.action || 'Security Event';

      return {
        id: l.id,
        timestamp: l.created_at || new Date().toISOString(),
        actor: `${actorName}${actorEmail}`,
        actorType: l.actor_type || 'USER',
        action: l.action || 'SECURITY_EVENT',
        entity: entity,
        entityType: l.entity_type || 'General',
        details: details,
        ipAddress: l.ip_address || '127.0.0.1',
      };
    });

    let result = formatted;
    if (typeFilter !== 'ALL') {
      result = result.filter((item) => item.actorType === typeFilter);
    }

    if (query) {
      result = result.filter(
        (item) =>
          item.actor.toLowerCase().includes(query) ||
          item.action.toLowerCase().includes(query) ||
          item.entity.toLowerCase().includes(query) ||
          item.details.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({ data: result, total: result.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, data: [], total: 0 }, { status: 500 });
  }
}
