import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { recordAuditLog } from '@/lib/audit/logger';
import { DEFAULT_CR80_TEMPLATE } from '@/lib/data/enterpriseStore';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const { id } = await params;
    const admin = createAdminSupabaseClient();

    // Find template record
    let { data: template } = await admin
      .from('card_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!template) {
      // Fallback search by default or return standard template
      const { data: defaultT } = await admin
        .from('card_templates')
        .select('*')
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();

      template = defaultT;
    }

    const templateId = template?.id || id;

    // Fetch published version layout
    const [{ data: version }, { data: branch }] = await Promise.all([
      admin
        .from('card_template_versions')
        .select('*')
        .eq('template_id', templateId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle(),
      template?.branch_id
        ? admin.from('branches').select('id, name, code').eq('id', template.branch_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const layout = version?.layout_json || DEFAULT_CR80_TEMPLATE;

    return NextResponse.json({
      data: {
        id: templateId,
        name: template?.name || 'Magic Card Executive Smart Badge',
        description: template?.description || 'CR80 standard dual-sided identification badge',
        isDefault: !!template?.is_default,
        branchId: template?.branch_id || null,
        branchName: (branch as any)?.name || (template?.is_default ? 'All Branches (Global Default)' : 'Unassigned'),
        versionNumber: version?.version_number || template?.current_version_number || 1,
        versionTag: `v${version?.version_number || 1}.0.0`,
        publishedAt: version?.published_at || new Date().toISOString(),
        layout: layout,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { layout, changelog, publish } = body;

    if (!layout) {
      return NextResponse.json({ error: 'Missing template layout data' }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    // Find template record
    let { data: template } = await admin
      .from('card_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!template) {
      // Find default template
      const { data: defaultT } = await admin
        .from('card_templates')
        .select('*')
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();
      template = defaultT;
    }

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const nextVer = (template.current_version_number || 1) + 1;
    const now = new Date().toISOString();

    if (publish) {
      // Archive existing published versions
      await admin
        .from('card_template_versions')
        .update({ status: 'ARCHIVED' })
        .eq('template_id', template.id)
        .eq('status', 'PUBLISHED');
    }

    // Insert new version
    const layoutStr = JSON.stringify(layout);
    const checksum = crypto.createHash('sha256').update(layoutStr).digest('hex');

    const { data: newVersion, error: vErr } = await admin
      .from('card_template_versions')
      .insert([{
        template_id: template.id,
        version_number: nextVer,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        checksum: checksum,
        layout_json: layout,
        changelog: changelog || `Version v${nextVer}.0.0 update`,
        published_at: now,
      }])
      .select()
      .single();

    if (vErr) throw vErr;

    // Update current_version_number & current_published_version_id in card_templates
    await admin
      .from('card_templates')
      .update({
        current_version_number: nextVer,
        current_published_version_id: newVersion.id,
        updated_at: now,
      })
      .eq('id', template.id);

    await recordAuditLog({
      actorId: auth.user.id,
      actorEmail: auth.user.email,
      action: 'PUBLISH_CARD_TEMPLATE',
      entityType: 'CardTemplate',
      entityId: template.id,
      entityName: template.name,
      details: `Published new template version v${nextVer}.0.0: "${changelog || 'Updated card design layout'}"`,
    });

    return NextResponse.json({
      success: true,
      versionTag: `v${nextVer}.0.0`,
      publishedAt: now,
      data: newVersion,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
