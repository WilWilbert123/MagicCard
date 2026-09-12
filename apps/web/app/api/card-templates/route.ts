import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { recordAuditLog } from '@/lib/audit/logger';
import { DEFAULT_CR80_TEMPLATE } from '@/lib/data/enterpriseStore';

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const admin = createAdminSupabaseClient();

    const [{ data: templates, error: tErr }, { data: branches }, { data: versions }] = await Promise.all([
      admin.from('card_templates').select('*').order('created_at', { ascending: true }),
      admin.from('branches').select('id, name, code'),
      admin.from('card_template_versions').select('id, template_id, version_number, status, layout_json, changelog, published_at'),
    ]);

    if (tErr) throw tErr;

    const branchMap = new Map((branches || []).map((b) => [b.id, b]));

    const mapped = (templates || []).map((t: any) => {
      const templateVersions = (versions || []).filter((v) => v.template_id === t.id);
      const activeVer = templateVersions.find((v) => v.id === t.current_published_version_id || v.status === 'PUBLISHED') || templateVersions[0];

      const b = t.branch_id ? branchMap.get(t.branch_id) : null;
      const layout = activeVer?.layout_json || DEFAULT_CR80_TEMPLATE;

      return {
        id: t.id,
        name: t.name,
        description: t.description || '',
        isDefault: !!t.is_default,
        branchId: t.branch_id || null,
        branchName: b ? b.name : (t.is_default ? 'All Branches (Global Default)' : 'Unassigned'),
        branchCode: b ? b.code : null,
        currentVersionNumber: t.current_version_number || activeVer?.version_number || 1,
        versionTag: `v${t.current_version_number || activeVer?.version_number || 1}.0.0`,
        publishedAt: activeVer?.published_at || t.updated_at || t.created_at,
        frontElementCount: layout?.front?.elements?.length ?? 0,
        backElementCount: layout?.back?.elements?.length ?? 0,
        layout: layout,
        versions: templateVersions.map((v) => ({
          id: v.id,
          versionNumber: v.version_number,
          versionTag: `v${v.version_number}.0.0`,
          status: v.status,
          changelog: v.changelog || '',
          publishedAt: v.published_at || (v as any).created_at || new Date().toISOString(),
        })),
      };
    });

    return NextResponse.json({ data: mapped, branches: branches || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { name, description, branchId, isDefault, cloneFromTemplateId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    // Get company ID
    let companyId = body.companyId;
    if (!companyId) {
      const { data: comp } = await admin.from('companies').select('id').limit(1).single();
      companyId = comp?.id;
    }

    // Determine layout json to use
    let layoutToUse = JSON.parse(JSON.stringify(DEFAULT_CR80_TEMPLATE));

    if (cloneFromTemplateId) {
      const { data: cloneVer } = await admin
        .from('card_template_versions')
        .select('layout_json')
        .eq('template_id', cloneFromTemplateId)
        .eq('status', 'PUBLISHED')
        .maybeSingle();

      if (cloneVer?.layout_json) {
        layoutToUse = cloneVer.layout_json;
      }
    }

    // If making this default, reset existing defaults
    if (isDefault) {
      await admin.from('card_templates').update({ is_default: false }).eq('is_default', true);
    }

    // Insert new template
    const newTemplateRecord: any = {
      name: name.trim(),
      description: (description || '').trim(),
      is_default: !!isDefault,
      branch_id: branchId && branchId !== 'ALL' ? branchId : null,
      current_version_number: 1,
    };
    if (companyId) newTemplateRecord.company_id = companyId;

    const { data: newT, error: tErr } = await admin
      .from('card_templates')
      .insert([newTemplateRecord])
      .select()
      .single();

    if (tErr) throw tErr;

    // Create initial version v1
    const layoutStr = JSON.stringify(layoutToUse);
    const checksum = crypto.createHash('sha256').update(layoutStr).digest('hex');

    const newVersionRecord = {
      template_id: newT.id,
      version_number: 1,
      status: 'PUBLISHED',
      checksum: checksum,
      layout_json: layoutToUse,
      changelog: `Initial release of template "${newT.name}"`,
      published_at: new Date().toISOString(),
    };

    const { data: newV, error: vErr } = await admin
      .from('card_template_versions')
      .insert([newVersionRecord])
      .select()
      .single();

    if (vErr) throw vErr;

    // Update current published version ID in template
    await admin
      .from('card_templates')
      .update({ current_published_version_id: newV.id })
      .eq('id', newT.id);

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'CREATE_CARD_TEMPLATE',
      entityType: 'CardTemplate',
      entityId: newT.id,
      entityName: newT.name,
      details: `Created new ID Card template "${newT.name}" assigned to ${
        branchId && branchId !== 'ALL' ? `Branch ID ${branchId}` : 'All Branches (Global Default)'
      }.`,
    });

    return NextResponse.json({ data: newT }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { id, name, description, branchId, isDefault } = body;

    if (!id) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    if (isDefault) {
      await admin.from('card_templates').update({ is_default: false }).eq('is_default', true);
    }

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (name) updatePayload.name = name.trim();
    if (description !== undefined) updatePayload.description = description.trim();
    if (typeof isDefault === 'boolean') updatePayload.is_default = isDefault;
    if (branchId !== undefined) {
      updatePayload.branch_id = branchId && branchId !== 'ALL' ? branchId : null;
    }

    const { data, error } = await admin
      .from('card_templates')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'UPDATE_CARD_TEMPLATE',
      entityType: 'CardTemplate',
      entityId: id,
      entityName: data.name,
      details: `Updated branch assignment and metadata for template "${data.name}".`,
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Template ID required' }, { status: 400 });

    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin.from('card_templates').select('name, is_default').eq('id', id).single();

    if (existing?.is_default) {
      return NextResponse.json({ error: 'Cannot delete the Global Default Card Template' }, { status: 400 });
    }

    const { error } = await admin.from('card_templates').delete().eq('id', id);
    if (error) throw error;

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'DELETE_CARD_TEMPLATE',
      entityType: 'CardTemplate',
      entityId: id,
      entityName: existing?.name || 'Card Template',
      details: `Deleted card template "${existing?.name || id}".`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
