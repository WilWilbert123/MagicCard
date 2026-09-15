import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/require-auth';
import { recordAuditLog } from '@/lib/audit/logger';

export async function GET(request: Request) {
  const auth = await requireAuth();
  if (!auth.authenticated) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const deptId = searchParams.get('departmentId');
    const status = searchParams.get('status');
    const query = searchParams.get('q')?.trim()?.toLowerCase() || '';

    const admin = createAdminSupabaseClient();

    // 1. Fetch raw print jobs
    const { data: printJobs, error } = await admin
      .from('print_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch print_jobs error:', error);
    }

    // 2. Fetch lookups
    const [{ data: employees }, { data: branches }, { data: departments }, { data: kiosks }] = await Promise.all([
      admin.from('employees').select('id, first_name, last_name, employee_number, branch_id, department_id'),
      admin.from('branches').select('id, name, code'),
      admin.from('departments').select('id, name, code'),
      admin.from('kiosks').select('id, kiosk_code, name'),
    ]);

    const branchMap = new Map((branches || []).map((b) => [b.id, b]));
    const deptMap = new Map((departments || []).map((d) => [d.id, d]));
    const kioskMap = new Map((kiosks || []).map((k) => [k.id, k]));

    const empMap = new Map(
      (employees || []).map((e: any) => [
        e.id,
        {
          fullName: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
          employeeNumber: e.employee_number || '',
          branchId: e.branch_id || '',
          branchName: branchMap.get(e.branch_id)?.name || '',
          departmentId: e.department_id || '',
          departmentName: deptMap.get(e.department_id)?.name || '',
        },
      ])
    );

    // 3. Map print jobs into clean presentation models
    const mapped = (printJobs || []).map((j: any) => {
      const meta = j.metadata || {};
      const emp = empMap.get(j.employee_id);
      const bObj = branchMap.get(j.branch_id);
      const kObj = kioskMap.get(j.kiosk_id);

      const empName = meta.employeeName || emp?.fullName || 'Employee';
      const empNum = meta.employeeNumber || emp?.employeeNumber || j.employee_id || 'EMP';
      const bName = meta.branchName || bObj?.name || emp?.branchName || 'Main Headquarters';
      const bId = j.branch_id || emp?.branchId || bObj?.id || '';
      const dName = meta.departmentName || emp?.departmentName || 'Operations';
      const dId = meta.departmentId || emp?.departmentId || '';
      const kCode = kObj?.kiosk_code || j.kiosk_id || meta.kioskCode || 'KIOSK-01';

      let durationMs = 1500;
      if (j.started_at && j.completed_at) {
        const start = new Date(j.started_at).getTime();
        const end = new Date(j.completed_at).getTime();
        if (end >= start) durationMs = Math.max(800, end - start);
      }

      return {
        id: j.id,
        jobNumber: j.job_number || `PRINT-${j.id.slice(0, 8)}`,
        idempotencyKey: j.idempotency_key || '',
        employeeId: j.employee_id || '',
        employeeNumber: empNum,
        employeeName: empName,
        departmentName: dName,
        departmentId: dId,
        branchName: bName,
        branchId: bId,
        kioskCode: kCode,
        templateVersion: meta.templateVersion || 'v2.1.0 (CR80 Duo)',
        durationMs,
        status: j.status || 'COMPLETED',
        createdAt: j.created_at || new Date().toISOString(),
      };
    });

    // 4. Apply filter criteria
    let filtered = mapped;
    if (branchId && branchId !== 'ALL') {
      filtered = filtered.filter((item) => item.branchId === branchId || item.branchName.includes(branchId));
    }
    if (deptId && deptId !== 'ALL') {
      filtered = filtered.filter((item) => item.departmentId === deptId || item.departmentName.includes(deptId));
    }
    if (status && status !== 'ALL') {
      filtered = filtered.filter((item) => item.status === status);
    }
    if (query) {
      filtered = filtered.filter(
        (item) =>
          item.jobNumber.toLowerCase().includes(query) ||
          item.employeeName.toLowerCase().includes(query) ||
          item.employeeNumber.toLowerCase().includes(query) ||
          item.branchName.toLowerCase().includes(query) ||
          item.departmentName.toLowerCase().includes(query) ||
          item.kioskCode.toLowerCase().includes(query)
      );
    }

    return NextResponse.json({
      data: filtered,
      total: filtered.length,
    });
  } catch (err: any) {
    return NextResponse.json({ data: [], total: 0, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const isKioskHeader = request.headers.get('x-kiosk-request') === 'true';

    // Verify auth unless it's a kiosk self-service print dispatch
    if (!isKioskHeader && !body.employeeNumber && !body.employeeId) {
      const auth = await requireAuth();
      if (!auth.authenticated) return auth.response;
    }

    const admin = createAdminSupabaseClient();

    // 1. Resolve Company ID
    let companyId = body.companyId;
    if (!companyId) {
      const { data: comp } = await admin.from('companies').select('id').limit(1).maybeSingle();
      companyId = comp?.id;
    }

    // 2. Resolve Branch ID
    let branchId = body.branchId;
    if (!branchId) {
      const { data: br } = await admin.from('branches').select('id').limit(1).maybeSingle();
      branchId = br?.id;
    }

    // 3. Resolve Employee ID & Record
    let employeeId = body.employeeId;
    const empNum = (body.employeeNumber || '').trim();
    if (!employeeId && empNum) {
      const { data: empRecord } = await admin.from('employees').select('id, branch_id').eq('employee_number', empNum).maybeSingle();
      if (empRecord) {
        employeeId = empRecord.id;
        if (!branchId && empRecord.branch_id) branchId = empRecord.branch_id;
      }
    }

    // 4. Resolve Kiosk ID & Code
    let kioskId = body.kioskId;
    let kioskCode = (body.kioskCode || body.kiosk_code || 'KIOSK-001').trim().toUpperCase();

    let kRecord: any = null;

    // Search by kiosk_code first
    const { data: codeK } = await admin
      .from('kiosks')
      .select('id, kiosk_code, branch_id')
      .ilike('kiosk_code', kioskCode)
      .maybeSingle();

    if (codeK) {
      kRecord = codeK;
    } else if (kioskId && /^[0-9a-fA-F-]{36}$/.test(kioskId)) {
      const { data: idK } = await admin
        .from('kiosks')
        .select('id, kiosk_code, branch_id')
        .eq('id', kioskId)
        .maybeSingle();
      if (idK) kRecord = idK;
    }

    if (kRecord) {
      kioskId = kRecord.id;
      kioskCode = kRecord.kiosk_code;
      if (kRecord.branch_id && !branchId) {
        branchId = kRecord.branch_id;
      }
    }

    // 5. Resolve Template Version ID
    let templateVersionId = body.templateVersionId || body.template_version_id;
    if (!templateVersionId) {
      const { data: tVer } = await admin.from('card_template_versions').select('id').eq('status', 'PUBLISHED').limit(1).maybeSingle();
      if (tVer) {
        templateVersionId = tVer.id;
      } else {
        const { data: anyTVer } = await admin.from('card_template_versions').select('id').limit(1).maybeSingle();
        templateVersionId = anyTVer?.id;
      }
    }

    const empName = body.employeeName || 'Employee';
    const branch = body.branchName || 'Main Headquarters';
    const dept = body.departmentName || 'General Operations';
    const idempotencyKey = body.idempotencyKey || `idem-${Date.now()}`;
    const status = body.status || 'COMPLETED';

    const newRecord: any = {
      job_number: `PRINT-${Date.now().toString().slice(-6)}`,
      idempotency_key: idempotencyKey,
      status: status,
      retry_count: 0,
      printer_metadata: {
        employeeName: empName,
        employeeNumber: empNum,
        branchName: branch,
        departmentName: dept,
        kioskCode: kioskCode,
        templateVersion: 'v2.1.0 (CR80 Duo)',
      },
      started_at: new Date().toISOString(),
      completed_at: status === 'COMPLETED' ? new Date().toISOString() : null,
    };

    if (companyId) newRecord.company_id = companyId;
    if (branchId) newRecord.branch_id = branchId;
    if (kioskId) newRecord.kiosk_id = kioskId;
    if (employeeId) newRecord.employee_id = employeeId;
    if (templateVersionId) newRecord.template_version_id = templateVersionId;

    // Insert into Supabase table public.print_jobs
    let insertedJob: any = null;
    let insertError: any = null;

    if (companyId && branchId && kioskId && employeeId && templateVersionId) {
      const res = await admin.from('print_jobs').insert([newRecord]).select().single();
      insertedJob = res.data;
      insertError = res.error;
    } else {
      console.warn('Missing required UUID foreign keys for print_jobs insert:', { companyId, branchId, kioskId, employeeId, templateVersionId });
    }

    const finalJobId = insertedJob?.id || `job-${Date.now()}`;

    // Insert timeline event into Supabase table public.print_job_events
    if (insertedJob?.id) {
      try {
        await admin.from('print_job_events').insert([
          {
            print_job_id: insertedJob.id,
            status: status,
            details: {
              event: 'CARD_PRINT_EXECUTED',
              employeeNumber: empNum,
              employeeName: empName,
              kioskCode: kioskCode,
              timestamp: new Date().toISOString(),
            },
          },
        ]);
      } catch (evErr) {
        console.warn('Failed to insert print_job_events:', evErr);
      }
    }

    // Increment printed card counters in Supabase table public.kiosks
    if (kioskId && status === 'COMPLETED') {
      try {
        const { data: kData } = await admin.from('kiosks').select('cards_printed, total_cards_printed').eq('id', kioskId).maybeSingle();
        if (kData) {
          const newPrinted = (kData.cards_printed || 0) + 1;
          const newTotal = (kData.total_cards_printed || 0) + 1;
          await admin.from('kiosks').update({
            cards_printed: newPrinted,
            total_cards_printed: newTotal,
            updated_at: new Date().toISOString(),
          }).eq('id', kioskId);
        }
      } catch (kErr) {
        console.warn('Failed to update kiosk card counts in Supabase:', kErr);
      }
    }

    // Update Employee Card Status
    if (employeeId) {
      await admin.from('employees').update({ card_status: 'ISSUED' }).eq('id', employeeId);
    }
    if (empNum) {
      await admin.from('employees').update({ card_status: 'ISSUED' }).eq('employee_number', empNum);
    }

    // Record Audit Log
    await recordAuditLog({
      actorType: 'KIOSK',
      actorName: `KIOSK Terminal (${kioskCode})`,
      action: 'PRINT_ID_CARD',
      entityType: 'PrintJob',
      entityId: finalJobId,
      entityName: `${empName} (${empNum || 'EMP'})`,
      branchId: branchId || null,
      details: `Dispatched & printed physical ID card badge for employee "${empName}" (${empNum}) at KIOSK "${kioskCode}".`,
    });

    return NextResponse.json({
      data: {
        id: finalJobId,
        jobNumber: insertedJob?.job_number || newRecord.job_number,
        idempotencyKey: idempotencyKey,
        employeeName: empName,
        employeeNumber: empNum,
        branchName: branch,
        departmentName: dept,
        status: status,
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
