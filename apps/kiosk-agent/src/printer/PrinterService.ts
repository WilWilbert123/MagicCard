import {
  CardPrinterProvider,
  HardwarePrintJob,
  PrintResult,
  PrinterStatus,
} from './CardPrinterProvider.js';

export interface ActiveJobRecord {
  job: HardwarePrintJob;
  status: 'QUEUED' | 'PRINTING' | 'COMPLETED' | 'FAILED';
  startedAt: number;
  result?: PrintResult;
}

export class PrinterService {
  private provider: CardPrinterProvider;
  private idempotencyCache = new Map<string, ActiveJobRecord>();
  private isProcessing = false;

  constructor(provider: CardPrinterProvider) {
    this.provider = provider;
  }

  public async getStatus(): Promise<PrinterStatus> {
    return this.provider.getStatus();
  }

  public async testConnection() {
    return this.provider.testConnection();
  }

  /**
   * Submits a print job with strict duplicate protection and state tracking.
   */
  public async submitPrintJob(job: HardwarePrintJob): Promise<PrintResult> {
    // 1. Idempotency Check: if this exact request is currently processing or already done, return cached outcome
    if (this.idempotencyCache.has(job.idempotencyKey)) {
      const existing = this.idempotencyCache.get(job.idempotencyKey)!;
      if (existing.result) {
        return existing.result;
      }
      if (existing.status === 'PRINTING' || existing.status === 'QUEUED') {
        throw new Error('DUPLICATE_REQUEST: Print job is already in progress for this request.');
      }
    }

    // 2. Hardware concurrency lock: ensure one card is physically fed and printed at a time
    if (this.isProcessing) {
      throw new Error('PRINTER_BUSY: Another physical card is currently being fed and printed.');
    }

    // 3. Register job state
    const jobRecord: ActiveJobRecord = {
      job,
      status: 'QUEUED',
      startedAt: Date.now(),
    };
    this.idempotencyCache.set(job.idempotencyKey, jobRecord);
    this.isProcessing = true;

    try {
      jobRecord.status = 'PRINTING';
      const result = await this.provider.print(job);
      jobRecord.status = result.success ? 'COMPLETED' : 'FAILED';
      jobRecord.result = result;
      return result;
    } catch (err) {
      const failedResult: PrintResult = {
        success: false,
        jobId: job.jobId,
        status: 'FAILED',
        durationMs: Date.now() - jobRecord.startedAt,
        ribbonConsumedPct: 0,
        errorCode: 'ERR_HARDWARE_EXCEPTION',
        errorMessage: (err as Error).message,
        timestamp: new Date().toISOString(),
      };
      jobRecord.status = 'FAILED';
      jobRecord.result = failedResult;
      return failedResult;
    } finally {
      this.isProcessing = false;
    }
  }

  public async cancelJob(jobId: string) {
    await this.provider.cancel(jobId);
    this.isProcessing = false;
  }
}
