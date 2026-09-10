import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: kiosks, error } = await supabase
      .from('kiosks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const { data: branches } = await supabase.from('branches').select('id, name');
    const branchMap = new Map((branches || []).map((b) => [b.id, b.name]));

    const mapped = (kiosks || []).map((k: any) => {
      // Parse ribbon level % if mentioned in printer status summary e.g. "Ribbon 94%"
      let ribbonPct = 100;
      if (k.printer_status_summary) {
        const match = k.printer_status_summary.match(/Ribbon\s*(\d+)%/i);
        if (match && match[1]) {
          ribbonPct = parseInt(match[1], 10);
        }
      }

      return {
        id: k.id,
        code: k.kiosk_code,
        name: k.name,
        branchId: k.branch_id,
        branchName: branchMap.get(k.branch_id) || 'Unassigned',
        status: k.status || 'OFFLINE',
        agentVersion: k.agent_version || 'v1.4.0',
        appVersion: k.app_version || 'v2.1.0',
        ipAddress: k.ip_address || '127.0.0.1',
        activeTemplateVersion: 'v1.0.0',
        printerModel: 'Magicard 300 Duo',
        printerStatus: k.printer_status_summary || 'READY',
        ribbonLevelPct: ribbonPct,
        lastHeartbeat: k.last_heartbeat_at || k.created_at,
      };
    });

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
  try {
    const body = await request.json();
    const { id, status, name, code, ipAddress } = body;
    if (!id) {
      return NextResponse.json({ error: 'Missing kiosk id' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };
    if (status) updatePayload.status = status;
    if (name) updatePayload.name = name;
    if (code) updatePayload.kiosk_code = code;
    if (ipAddress) updatePayload.ip_address = ipAddress;

    const { data, error } = await supabase
      .from('kiosks')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.code || !body.name) {
      return NextResponse.json({ error: 'Missing required kiosk code or name' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    let companyId = body.companyId;
    if (!companyId) {
      const { data: comp } = await supabase.from('companies').select('id').limit(1).single();
      companyId = comp?.id;
    }

    let branchId = body.branchId;
    if (!branchId) {
      const { data: br } = await supabase.from('branches').select('id').limit(1).single();
      branchId = br?.id;
    }

    const newKiosk: any = {
      kiosk_code: body.code.trim().toUpperCase(),
      name: body.name.trim(),
      status: body.status || 'ONLINE',
      agent_version: body.agentVersion || 'v1.4.0',
      app_version: body.appVersion || 'v2.1.0',
      ip_address: body.ipAddress || '127.0.0.1',
      printer_status_summary: body.printerStatus || 'READY',
    };

    if (companyId) newKiosk.company_id = companyId;
    if (branchId) newKiosk.branch_id = branchId;

    const { data, error } = await supabase
      .from('kiosks')
      .insert([newKiosk])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.from('kiosks').delete().eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
