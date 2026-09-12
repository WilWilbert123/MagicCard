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
    const branchId = searchParams.get('branchId') || 'ALL';
    const deptId = searchParams.get('departmentId') || 'ALL';

    const admin = createAdminSupabaseClient();

    // 1. Fetch audit logs and branch/dept lookups
    const [{ data: logs, error }, { data: branches }, { data: departments }] = await Promise.all([
      admin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(300),
      admin.from('branches').select('id, name, code'),
      admin.from('departments').select('id, name, code'),
    ]);

    if (error) {
      console.error('Fetch audit_logs error:', error);
    }

    const branchMap = new Map((branches || []).map((b) => [b.id, b]));
    const deptMap = new Map((departments || []).map((d) => [d.id, d]));

    const formatted = (logs || []).map((l: any) => {
      const meta = l.metadata || {};
      const actorName = meta.actor_name || l.actor_id || 'HR Administrator';
      const actorEmail = meta.actor_email ? ` (${meta.actor_email})` : '';
      const entity = meta.entity_name || l.entity_type || 'System';
      const details = meta.details || l.action || 'Security Event';

      const bObj = branchMap.get(l.branch_id);
      const bName = meta.branchName || bObj?.name || '';
      const bId = l.branch_id || meta.branchId || bObj?.id || '';

      const dName = meta.departmentName || '';
      const dId = meta.departmentId || '';

      return {
        id: l.id,
        timestamp: l.created_at || new Date().toISOString(),
        actor: `${actorName}${actorEmail}`,
        actorType: l.actor_type || 'USER',
        action: l.action || 'SECURITY_EVENT',
        entity: entity,
        entityType: l.entity_type || 'General',
        details: details,
        branchId: bId,
        branchName: bName,
        departmentId: dId,
        departmentName: dName,
        ipAddress: l.ip_address || '127.0.0.1',
      };
    });

    let result = formatted;
    if (typeFilter !== 'ALL') {
      result = result.filter((item) => item.actorType === typeFilter);
    }

    if (branchId !== 'ALL') {
      result = result.filter(
        (item) =>
          item.branchId === branchId ||
          item.branchName.toLowerCase().includes(branchId.toLowerCase()) ||
          item.details.toLowerCase().includes(branchId.toLowerCase())
      );
    }

    if (deptId !== 'ALL') {
      result = result.filter(
        (item) =>
          item.departmentId === deptId ||
          item.departmentName.toLowerCase().includes(deptId.toLowerCase()) ||
          item.details.toLowerCase().includes(deptId.toLowerCase())
      );
    }

    if (query) {
      result = result.filter(
        (item) =>
          item.actor.toLowerCase().includes(query) ||
          item.action.toLowerCase().includes(query) ||
          item.entity.toLowerCase().includes(query) ||
          item.details.toLowerCase().includes(query) ||
          item.branchName.toLowerCase().includes(query) ||
          item.departmentName.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({ data: result, total: result.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
