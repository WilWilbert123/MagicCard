import { describe, it, expect } from 'vitest';
import { MockMagicCardAdapter } from '../src/printer/MockMagicCardAdapter.js';
import { PrinterService } from '../src/printer/PrinterService.js';
import { HardwarePrintJob } from '../src/printer/CardPrinterProvider.js';

describe('Kiosk Hardware Agent & Print Service Tests', () => {
  it('should query printer status from Mock adapter', async () => {
    const adapter = new MockMagicCardAdapter();
    const status = await adapter.getStatus();
    expect(status.online).toBe(true);
    expect(status.status).toBe('READY');
    expect(status.model).toContain('Magicard 300 Duo');
  });

  it('should successfully execute a print job and report duration', async () => {
    const adapter = new MockMagicCardAdapter({ simulatedDelayMs: 50 });
    const service = new PrinterService(adapter);

    const testJob: HardwarePrintJob = {
      jobId: 'JOB-VITEST-01',
      idempotencyKey: 'idem-test-01',
      employeeId: 'emp-01',
      employeeNumber: 'EMP-000123',
      templateVersionId: 'tmpl-v2',
      frontCanvasDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    };

    const result = await service.submitPrintJob(testJob);
    expect(result.success).toBe(true);
    expect(result.status).toBe('COMPLETED');
    expect(result.durationMs).toBeGreaterThanOrEqual(40);
  });

  it('should prevent duplicate print jobs with the same idempotency key', async () => {
    const adapter = new MockMagicCardAdapter({ simulatedDelayMs: 20 });
    const service = new PrinterService(adapter);

    const testJob: HardwarePrintJob = {
      jobId: 'JOB-VITEST-02',
      idempotencyKey: 'idem-unique-key-99',
      employeeId: 'emp-02',
      employeeNumber: 'EMP-000124',
      templateVersionId: 'tmpl-v2',
      frontCanvasDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    };

    // First submission
    const result1 = await service.submitPrintJob(testJob);
    expect(result1.success).toBe(true);

    // Second submission with exact same idempotency key: should return cached result without reprinting
    const result2 = await service.submitPrintJob(testJob);
    expect(result2.success).toBe(true);
    expect(result2.jobId).toBe('JOB-VITEST-02');
  });

  it('should gracefully handle simulated hardware failure (CARD_JAM)', async () => {
    const adapter = new MockMagicCardAdapter({ simulatedDelayMs: 20 });
    adapter.setSimulatedError('CARD_JAM');
    const service = new PrinterService(adapter);

    const testJob: HardwarePrintJob = {
      jobId: 'JOB-VITEST-03',
      idempotencyKey: 'idem-jam-01',
      employeeId: 'emp-03',
      employeeNumber: 'EMP-000125',
      templateVersionId: 'tmpl-v2',
      frontCanvasDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    };

    const result = await service.submitPrintJob(testJob);
    expect(result.success).toBe(false);
    expect(result.status).toBe('FAILED');
    expect(result.errorCode).toBe('ERR_CARD_JAM');
  });
});
