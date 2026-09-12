import { createAdminSupabaseClient } from '@/lib/supabase/server';

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

export async function recordAuditLog(options: AuditLogOptions) {
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
      company_id: companyId,
      branch_id: options.branchId || null,
      actor_id: options.actorId || null,
      actor_type: options.actorType || 'USER',
      action: options.action,
      entity_type: options.entityType,
      entity_id: options.entityId || null,
      metadata: {
        actor_name: options.actorName || 'HR Administrator',
        actor_email: options.actorEmail || 'admin@magiccard.corp',
        entity_name: options.entityName || '',
        details: options.details,
        ...(options.metadata || {}),
      },
      ip_address: options.ipAddress || '127.0.0.1',
      created_at: new Date().toISOString(),
    };

    const { error } = await admin.from('audit_logs').insert([payload]);
    if (error) {
      console.warn('Notice inserting into audit_logs:', error.message);
    }
  } catch (err) {
    console.error('Audit logging error:', err);
  }
}
