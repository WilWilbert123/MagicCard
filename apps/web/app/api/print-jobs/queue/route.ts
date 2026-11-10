import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Fast shared memory queue for active print dispatch
interface QueuedJob {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  targetPrinter: string;
  duplexMode: string;
  frontCanvasDataUrl: string;
  backCanvasDataUrl: string;
  idempotencyKey: string;
  status: 'PENDING' | 'PRINTING' | 'COMPLETED' | 'FAILED';
  createdAt: number;
  completedAt?: number;
  error?: string;
}

// Global in-memory queue
const globalQueuedJobs = new Map<string, QueuedJob>();

// Clean up stale jobs older than 10 minutes
function cleanupOldJobs() {
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (const [id, job] of globalQueuedJobs.entries()) {
    if (job.createdAt < tenMinutesAgo) {
      globalQueuedJobs.delete(id);
    }
  }
}

// GET /api/print-jobs/queue?jobId=... OR GET /api/print-jobs/queue (fetch next pending for agent)
export async function GET(request: Request) {
  cleanupOldJobs();
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (jobId) {
    const job = globalQueuedJobs.get(jobId);
    if (job) {
      return NextResponse.json({
        id: job.id,
        status: job.status,
        error: job.error,
        completedAt: job.completedAt,
      });
    }

    // Fallback to Supabase
    try {
      const admin = createAdminSupabaseClient();
      const { data } = await admin.from('print_jobs').select('*').eq('id', jobId).maybeSingle();
      if (data) {
        return NextResponse.json({
          id: data.id,
          status: data.status || 'COMPLETED',
        });
      }
    } catch {}

    return NextResponse.json({ status: 'PENDING' });
  }

  // Agent polling for next pending jobs
  const pendingJobs = Array.from(globalQueuedJobs.values()).filter((j) => j.status === 'PENDING');
  return NextResponse.json({ jobs: pendingJobs });
}

// POST /api/print-jobs/queue - submit a print job from admin web console
export async function POST(request: Request) {
  cleanupOldJobs();
  try {
    const body = await request.json();
    const {
      employeeId,
      employeeNumber,
      employeeName,
      targetPrinter = 'Magicard 600NEO',
      duplexMode = 'Duplex',
      frontCanvasDataUrl,
      backCanvasDataUrl,
      idempotencyKey,
    } = body;

    const id = `JOB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newJob: QueuedJob = {
      id,
      employeeId: employeeId || '',
      employeeNumber: employeeNumber || '',
      employeeName: employeeName || 'Employee',
      targetPrinter,
      duplexMode,
      frontCanvasDataUrl: frontCanvasDataUrl || '',
      backCanvasDataUrl: backCanvasDataUrl || '',
      idempotencyKey: idempotencyKey || `idem-${id}`,
      status: 'PENDING',
      createdAt: Date.now(),
    };

    globalQueuedJobs.set(id, newJob);

    // Also persist into Supabase if configured
    try {
      const admin = createAdminSupabaseClient();
      await admin.from('print_jobs').insert([
        {
          id,
          idempotency_key: newJob.idempotencyKey,
          status: 'PENDING',
          printer_metadata: {
            employeeId,
            employeeNumber,
            employeeName,
            targetPrinter,
            duplexMode,
          },
          started_at: new Date().toISOString(),
        },
      ]);
    } catch {}

    return NextResponse.json({
      success: true,
      jobId: id,
      message: 'Print job successfully queued for hardware spooler',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PATCH /api/print-jobs/queue - agent updates job status to COMPLETED or FAILED
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { jobId, status, error } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    const job = globalQueuedJobs.get(jobId);
    if (job) {
      job.status = status || 'COMPLETED';
      job.completedAt = Date.now();
      if (error) job.error = error;
    }

    // Update in Supabase
    try {
      const admin = createAdminSupabaseClient();
      await admin
        .from('print_jobs')
        .update({
          status: status || 'COMPLETED',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId);

      // Update employee status to PRINTED
      if (job?.employeeId && status === 'COMPLETED') {
        await admin
          .from('employees')
          .update({ card_status: 'PRINTED', updated_at: new Date().toISOString() })
          .eq('id', job.employeeId);
      }
    } catch {}

    return NextResponse.json({ success: true, jobId, status });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

