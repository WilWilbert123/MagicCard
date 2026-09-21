import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kioskCode, kioskId, printerStatus, agentVersion, ipAddress, ribbonLevelPct, ribbonType } = body;

    const admin = createAdminSupabaseClient();
    const now = new Date().toISOString();

    const rawCode = kioskCode || kioskId || 'KIOSK-01';
    const altCode = rawCode.includes('-00')
      ? rawCode.replace('-00', '-0')
      : rawCode.includes('-0')
        ? rawCode.replace('-0', '-00')
        : rawCode;


    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCode);
    const filterQuery = isUuid
      ? `kiosk_code.eq.${rawCode},kiosk_code.eq.${altCode},id.eq.${rawCode}`
      : `kiosk_code.eq.${rawCode},kiosk_code.eq.${altCode}`;

    const { data: kiosk } = await admin
      .from('kiosks')
      .select('id, kiosk_code, status')
      .or(filterQuery)
      .maybeSingle();

    if (kiosk) {
      const updateData: any = {
        last_heartbeat_at: now,
        updated_at: now,
      };
      if (body.status === 'OFFLINE') {
        updateData.status = 'OFFLINE';
      } else if (kiosk.status !== 'DISABLED') {
        updateData.status = 'ONLINE';
      }
      if (printerStatus) {
        updateData.printer_status_summary = printerStatus;
        const match = printerStatus.match(/Ribbon\s*(\d+)%/i);
        if (match && match[1]) {
          updateData.ribbon_level_pct = parseInt(match[1], 10);
        }
      }
      if (typeof ribbonLevelPct === 'number') {
        updateData.ribbon_level_pct = ribbonLevelPct;
      }
      if (ribbonType) {
        updateData.ribbon_type = ribbonType;
      }
      if (agentVersion) updateData.agent_version = agentVersion;
      if (ipAddress) updateData.ip_address = ipAddress;

      await admin.from('kiosks').update(updateData).eq('id', kiosk.id);
    } else {

      const targetBranchStr = body.branchId || body.branchCode || body.branchName;
      let matchedBranch: any = null;

      if (targetBranchStr) {
        const { data: b } = await admin
          .from('branches')
          .select('id')
          .or(`id.eq.${targetBranchStr},name.eq.${targetBranchStr},code.eq.${targetBranchStr}`)
          .maybeSingle();
        matchedBranch = b;
      }

      if (!matchedBranch) {
        const { data: defaultBranch } = await admin
          .from('branches')
          .select('id')
          .or('name.eq.BRANCH-001,code.eq.BR-001')
          .maybeSingle();
        matchedBranch = defaultBranch || (await admin.from('branches').select('id').limit(1).maybeSingle()).data;
      }

      const { data: defaultCompany } = await admin.from('companies').select('id').limit(1).maybeSingle();

      if (defaultCompany && matchedBranch) {
        await admin.from('kiosks').insert([{
          kiosk_code: rawCode.toUpperCase(),
          name: `Terminal (${rawCode})`,
          company_id: defaultCompany.id,
          branch_id: matchedBranch.id,
          status: 'ONLINE',
          agent_version: agentVersion || 'v1.4.0',
          ip_address: ipAddress || '127.0.0.1',
          printer_status_summary: printerStatus || 'READY',
          max_card_capacity: 50,
          last_heartbeat_at: now,
        }]);
      }
    }

    // 2. Fetch current published template version from Supabase
    const { data: activeVersion } = await admin
      .from('card_template_versions')
      .select('id, version_number, published_at')
      .eq('status', 'PUBLISHED')
      .order('version_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      status: 'ACK',
      timestamp: now,
      activeTemplate: {
        versionId: activeVersion?.id || null,
        versionTag: activeVersion ? `v${activeVersion.version_number}.0.0` : 'v1.0.0',
        publishedAt: activeVersion?.published_at || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

