import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { enterpriseStore } from '@/lib/data/enterpriseStore';

export interface AuditLogOptions {
  actorId?: string | null;
  actorType?: 'USER' | 'KIOSK' | 'SYSTEM';
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  details: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  companyId?: string | null;
  branchId?: string | null;
}

const isUUID = (id?: string | null) =>
  Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

export async function recordAuditLog(options: AuditLogOptions) {
  const logId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  // Always log to enterpriseStore for instant in-memory sync
  try {
    enterpriseStore.auditLogs.unshift({
      id: logId,
      timestamp: nowIso,
      actor: options.actorName || (options.actorType === 'USER' ? 'Admin HR (admin@acmecorp.com)' : 'KIOSK-AGENT-LOCAL'),
      actorType: options.actorType || 'USER',
      action: options.action,
      entity: options.entityType,
      entityId: options.entityId || 'SYS-EVENT',
      branchName: (options.metadata?.branchName as string) || 'SM Sorsogon City',
      ipAddress: options.ipAddress || '127.0.0.1',
      details: options.details,
    });
  } catch (storeErr) {
    console.error('enterpriseStore audit log failed:', storeErr);
  }

  try {
    const admin = createAdminSupabaseClient();

    let companyId = options.companyId;
    if (!companyId) {
      const { data: comp } = await admin
        .from('companies')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      companyId = comp?.id || null;
    }

    const payload = {
      id: logId,
      company_id: companyId,
      branch_id: options.branchId || null,
      actor_id: isUUID(options.actorId) ? options.actorId : null,
      actor_type: options.actorType || 'USER',
      action: options.action,
      entity_type: options.entityType,
      entity_id: isUUID(options.entityId) ? options.entityId : null,
      metadata: {
        actor_name: options.actorName || 'HR Administrator',
        actor_email: options.actorEmail || 'admin@magiccard.corp',
        entity_name: options.entityName || '',
        details: options.details,
        ...(options.metadata || {}),
      },
      ip_address: options.ipAddress || '127.0.0.1',
      created_at: nowIso,
    };

    const { error } = await admin.from('audit_logs').insert([payload]);
    if (error) {
      console.warn('Notice inserting into audit_logs:', error.message);
    }
  } catch (err) {
    console.error('Audit logging error:', err);
  }
}

