import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/require-auth';

async function getSupabaseClient() {
  try {
    return createAdminClient();
  } catch {
    return await createServerSupabaseClient();
  }
}

export async function GET() {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const supabase = await getSupabaseClient();
    const [{ data: kiosks, error }, { data: branches }, { data: templateVersions }, { data: printJobs }] = await Promise.all([
      supabase.from('kiosks').select('*').order('created_at', { ascending: false }),
      supabase.from('branches').select('id, name'),
      supabase.from('card_template_versions').select('id, version_number, status'),
      supabase.from('print_jobs').select('id, kiosk_id, branch_id, status, created_at').eq('status', 'COMPLETED'),
    ]);

    if (error) throw error;

    const branchMap = new Map((branches || []).map((b) => [b.id, b.name]));
    const templateMap = new Map((templateVersions || []).map((t) => [t.id, `v${t.version_number}.0.0`]));
    const defaultPublishedTag =
      (templateVersions || []).find((t) => t.status === 'PUBLISHED')
        ? `v${(templateVersions || []).find((t) => t.status === 'PUBLISHED')?.version_number}.0.0`
        : 'v1.0.0';

    const now = Date.now();
    const staleKioskIds: string[] = [];

    const mapped = (kiosks || []).map((k: any) => {
      // Parse ribbon level % if explicitly stored in DB column or mentioned in printer status summary
      let ribbonPct = typeof k.ribbon_level_pct === 'number' ? k.ribbon_level_pct : 100;
      if (k.printer_status_summary) {
        const match = k.printer_status_summary.match(/Ribbon\s*(\d+)%/i);
        if (match && match[1]) {
          ribbonPct = parseInt(match[1], 10);
        }
      }

      // Count completed print jobs strictly for this specific kiosk terminal
      const kioskJobs = (printJobs || []).filter(
        (pj) => pj.kiosk_id && pj.kiosk_id === k.id
      );

      // Count print jobs completed since last tray reset timestamp
      const resetTime = k.tray_reset_at ? new Date(k.tray_reset_at).getTime() : 0;
      const currentBatchJobs = resetTime > 0
        ? kioskJobs.filter((pj: any) => {
            const pjTime = pj.created_at ? new Date(pj.created_at).getTime() : 0;
            return pjTime >= resetTime;
          })
        : kioskJobs;

      const cardsPrinted = currentBatchJobs.length;
      const totalCardsPrinted = kioskJobs.length;
      const maxCardCapacity = k.max_card_capacity || 50;
      const cardsRemaining = Math.max(0, maxCardCapacity - cardsPrinted);

      const activeTag = k.active_template_version_id
        ? templateMap.get(k.active_template_version_id) || defaultPublishedTag
        : defaultPublishedTag;

      // Real-time heartbeat validation: Kiosk sends ping every 15s. If no heartbeat within 90s, it's OFFLINE
      const lastHbTime = k.last_heartbeat_at ? new Date(k.last_heartbeat_at).getTime() : 0;
      const diffMs = now - lastHbTime;

      let computedStatus = 'OFFLINE';
      if (k.status === 'DISABLED') {
        computedStatus = 'DISABLED';
      } else if (k.last_heartbeat_at && !isNaN(diffMs) && diffMs <= 90000) {
        computedStatus = 'ONLINE';
      } else {
        computedStatus = 'OFFLINE';
        if (k.status === 'ONLINE') {
          staleKioskIds.push(k.id);
        }
      }

      const isOffline = computedStatus === 'OFFLINE';
      const printerStatusSummary = isOffline
        ? 'OFFLINE (Agent Disconnected)'
        : k.printer_status_summary || 'READY';

      return {
        id: k.id,
        code: k.kiosk_code,
        name: k.name,
        branchId: k.branch_id,
        branchName: branchMap.get(k.branch_id) || 'Unassigned',
        status: computedStatus,
        agentVersion: k.agent_version || 'v1.4.0',
        appVersion: k.app_version || 'v2.1.0',
        ipAddress: k.ip_address || '127.0.0.1',
        activeTemplateVersion: activeTag,
        printerModel: k.printer_model || k.printer_type || 'Unknown Printer',
        printerStatus: printerStatusSummary,
        ribbonLevelPct: isOffline ? 0 : ribbonPct,
        ribbonType: k.ribbon_type || 'YMCKO',
        cardsPrinted,
        maxCardCapacity,
        cardsRemaining,
        totalCardsPrinted,
        lastHeartbeat: k.last_heartbeat_at || undefined,
      };
    });

    // Asynchronously sync DB rows for kiosks whose heartbeats have expired
    if (staleKioskIds.length > 0) {
      supabase
        .from('kiosks')
        .update({ status: 'OFFLINE', updated_at: new Date().toISOString() })
        .in('id', staleKioskIds)
        .then();
    }

    return NextResponse.json({
      data: mapped,
      total: mapped.length,
      onlineCount: mapped.filter((k) => k.status === 'ONLINE').length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, data: [], total: 0, onlineCount: 0 }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { id, status, name, code, ipAddress, maxCardCapacity, resetTray } = body;
    if (!id) {
      return NextResponse.json({ error: 'Missing kiosk id' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (status) updatePayload.status = status;
    if (name) updatePayload.name = name;
    if (code) updatePayload.kiosk_code = code;
    if (ipAddress) updatePayload.ip_address = ipAddress;
    if (maxCardCapacity !== undefined && maxCardCapacity !== null) {
      updatePayload.max_card_capacity = parseInt(maxCardCapacity, 10);
    }
    if (resetTray) {
      updatePayload.tray_reset_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('kiosks')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) throw error;

    return NextResponse.json({ data: data?.[0] || { id, ...updatePayload } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    if (!body.code || !body.name) {
      return NextResponse.json({ error: 'Missing required kiosk code or name' }, { status: 400 });
    }

    const supabase = await getSupabaseClient();

    let companyId = body.companyId;
    if (!companyId) {
      const { data: comp } = await supabase.from('companies').select('id').limit(1).maybeSingle();
      companyId = comp?.id;
    }

    let branchId = body.branchId;
    if (!branchId) {
      const { data: br } = await supabase.from('branches').select('id').limit(1).maybeSingle();
      branchId = br?.id;
    }

    const newKiosk: any = {
      kiosk_code: body.code.trim().toUpperCase(),
      name: body.name.trim(),
      status: body.status || 'OFFLINE',
      agent_version: body.agentVersion || 'v1.4.0',
      app_version: body.appVersion || 'v2.1.0',
      ip_address: body.ipAddress || '127.0.0.1',
      printer_status_summary: body.printerStatus || 'READY',
      max_card_capacity: body.maxCardCapacity ? parseInt(body.maxCardCapacity, 10) : 50,
    };

    if (companyId) newKiosk.company_id = companyId;
    if (branchId) newKiosk.branch_id = branchId;

    const { data, error } = await supabase
      .from('kiosks')
      .insert([newKiosk])
      .select();

    if (error) throw error;

    return NextResponse.json({ data: data?.[0] }, { status: 201 });
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
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = await getSupabaseClient();
    const { error } = await supabase.from('kiosks').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
