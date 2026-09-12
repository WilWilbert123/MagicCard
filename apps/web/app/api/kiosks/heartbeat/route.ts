import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kioskCode, kioskId, printerStatus, agentVersion, ipAddress } = body;

    const admin = createAdminSupabaseClient();
    const now = new Date().toISOString();

    const codeToSearch = kioskCode || kioskId || 'KIOSK-SOR-01';

    // 1. Fetch target kiosk from Supabase
    const { data: kiosk } = await admin
      .from('kiosks')
      .select('id, kiosk_code, status')
      .or(`kiosk_code.eq.${codeToSearch},id.eq.${codeToSearch}`)
      .maybeSingle();

    if (kiosk) {
      const updateData: any = {
        last_heartbeat_at: now,
        updated_at: now,
      };
      if (kiosk.status !== 'DISABLED') {
        updateData.status = 'ONLINE';
      }
      if (printerStatus) updateData.printer_status_summary = printerStatus;
      if (agentVersion) updateData.agent_version = agentVersion;
      if (ipAddress) updateData.ip_address = ipAddress;

      await admin.from('kiosks').update(updateData).eq('id', kiosk.id);
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

