import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { enterpriseStore } from '@/lib/data/enterpriseStore';

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

    const storeLogs = (enterpriseStore.auditLogs || []).map((l: any) => ({
      id: l.id,
      timestamp: l.timestamp || new Date().toISOString(),
      actor: l.actor || 'KIOSK-SOR-01 Terminal (SM Sorsogon City)',
      actorType: l.actorType || 'KIOSK',
      action: l.action || 'HR_ASSISTANCE_REQUESTED',
      entity: l.entity || 'SupportDispatch',
      entityType: l.entity || 'SupportDispatch',
      details: l.details || '',
      branchId: l.branchId || '',
      branchName: l.branchName || 'SM Sorsogon City',
      departmentId: '',
      departmentName: '',
      ipAddress: l.ipAddress || '127.0.0.1',
    }));

    const combinedMap = new Map<string, any>();
    const seenContentKeys = new Set<string>();

    [...formatted, ...storeLogs].forEach((item) => {
      if (!item.id) return;

      // Create a content fingerprint based on action, details, and 10s time bucket
      const timeBucket = Math.floor(new Date(item.timestamp).getTime() / 10000);
      const contentKey = `${item.action}|${item.details}|${timeBucket}`;

      if (!combinedMap.has(item.id) && !seenContentKeys.has(contentKey)) {
        combinedMap.set(item.id, item);
        seenContentKeys.add(contentKey);
      }
    });

    const combined = Array.from(combinedMap.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    let result = combined;
    if (typeFilter !== 'ALL') {
      result = result.filter((item) => item.actorType === typeFilter);
    }

    if (branchId !== 'ALL') {
      const bObj = branchMap.get(branchId) || (branches || []).find(
        (b: any) =>
          b.id === branchId ||
          b.name.toLowerCase() === branchId.toLowerCase() ||
          b.code?.toLowerCase() === branchId.toLowerCase()
      );

      const targetId = (bObj?.id || branchId).toLowerCase();
      const targetName = (bObj?.name || branchId).toLowerCase();
      const targetCode = (bObj?.code || '').toLowerCase();

      result = result.filter((item) => {
        const itemBId = (item.branchId || '').toLowerCase();
        const itemBName = (item.branchName || '').toLowerCase();
        const itemDetails = (item.details || '').toLowerCase();

        // 1. Exact branch ID match
        if (itemBId && itemBId === targetId) return true;

        // 2. Branch name match (e.g. "SM Sorsogon City" or "Sorsogon")
        if (targetName && (itemBName.includes(targetName) || itemDetails.includes(targetName) || targetName.includes('sorsogon') && (itemBName.includes('sorsogon') || itemDetails.includes('sorsogon')))) return true;

        // 3. Branch code match (e.g. "BR-SOR-01" or "SOR")
        if (targetCode && (itemBName.includes(targetCode) || itemDetails.includes(targetCode))) return true;

        // 4. Fallback filter string match
        if (itemBName.includes(targetId) || itemDetails.includes(targetId)) return true;

        return false;
      });
    }

    if (deptId !== 'ALL') {
      const dObj = deptMap.get(deptId) || (departments || []).find(
        (d: any) =>
          d.id === deptId ||
          d.name.toLowerCase() === deptId.toLowerCase() ||
          d.code?.toLowerCase() === deptId.toLowerCase()
      );

      const targetId = (dObj?.id || deptId).toLowerCase();
      const targetName = (dObj?.name || deptId).toLowerCase();
      const targetCode = (dObj?.code || '').toLowerCase();

      result = result.filter((item) => {
        const itemDId = (item.departmentId || '').toLowerCase();
        const itemDName = (item.departmentName || '').toLowerCase();
        const itemDetails = (item.details || '').toLowerCase();

        if (itemDId && itemDId === targetId) return true;
        if (targetName && (itemDName.includes(targetName) || itemDetails.includes(targetName))) return true;
        if (targetCode && (itemDName.includes(targetCode) || itemDetails.includes(targetCode))) return true;
        if (itemDName.includes(targetId) || itemDetails.includes(targetId)) return true;

        return false;
      });
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const isKioskHeader = request.headers.get('x-kiosk-request') === 'true';

    if (!isKioskHeader) {
      const auth = await requireAuth();
      if (!auth.authenticated) return auth.response;
    }

    const { recordAuditLog } = await import('@/lib/audit/logger');

    const kioskCode = body.kioskCode || 'KIOSK-SOR-01';
    let branchName = body.branchName || 'SM Sorsogon City';
    let branchId = body.branchId || null;

    const admin = createAdminSupabaseClient();

    if (!branchId) {
      const { data: branchesData } = await admin.from('branches').select('id, name, code');
      if (branchesData) {
        const matched = branchesData.find(
          (b: any) =>
            b.name.toLowerCase() === branchName.toLowerCase() ||
            b.name.toLowerCase().includes('sorsogon') ||
            (b.code && b.code.toLowerCase().includes('sor'))
        );
        if (matched) {
          branchId = matched.id;
          branchName = matched.name;
        }
      }
    }

    const category = body.category || 'General Support Request';
    const userNotes = (body.userNotes || body.details || '').trim();
    const employeeId = body.employeeId;
    const employeeName = body.employeeName;

    const userDetailsStr = userNotes ? `Details: "${userNotes}"` : 'No additional notes provided';
    const categoryStr = `Topic: ${category}`;
    const employeeStr = employeeName || employeeId ? `Employee: ${employeeName || ''} (${employeeId || ''})`.trim() : '';

    const parts = [userDetailsStr, categoryStr, employeeStr, `Terminal: ${kioskCode} (${branchName})`].filter(Boolean);
    const fullDetails = `🚨 [HR SUPPORT DISPATCH] ${parts.join(' • ')}`;

    await recordAuditLog({
      actorType: body.actorType || 'KIOSK',
      actorName: `${kioskCode} Terminal (${branchName})`,
      action: body.action || 'HR_ASSISTANCE_REQUESTED',
      entityType: body.entityType || 'SupportDispatch',
      entityId: body.entityId || `dispatch-${Date.now()}`,
      entityName: `${kioskCode} - ${category}`,
      branchId: branchId,
      details: fullDetails,
      metadata: {
        branchName: branchName,
        kioskCode: kioskCode,
        category: category,
        userNotes: userNotes,
        employeeId: employeeId,
        employeeName: employeeName,
      },
    });

    return NextResponse.json(
      { success: true, message: `Support dispatch report sent to HR Operations Desk for ${kioskCode} (${branchName}).` },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
