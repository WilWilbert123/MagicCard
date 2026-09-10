import {
  CardPrinterProvider,
  PrinterStatus,
  HardwarePrintJob,
  PrintResult,
  ConnectionStatus,
  PrinterStatusCode,
} from './CardPrinterProvider.js';

export class MockMagicCardAdapter implements CardPrinterProvider {
  private currentStatus: PrinterStatusCode = 'READY';
  private ribbonLevelPct = 94;
  private cardCountLifetime = 1428;
  private hopperCount = 85;
  private simulatedDelayMs = 2500; // Simulated physical print cycle duration
  private activeJobId: string | null = null;
  private forceError: string | null = null;

  constructor(options?: { simulatedDelayMs?: number }) {
    if (options?.simulatedDelayMs !== undefined) {
      this.simulatedDelayMs = options.simulatedDelayMs;
    }
  }

  /**
   * For testing failure recovery scenarios
   */
  public setSimulatedError(error: 'CARD_JAM' | 'OUT_OF_RIBBON' | 'OFFLINE' | null) {
    this.forceError = error;
    if (error === 'CARD_JAM') this.currentStatus = 'CARD_JAM';
    else if (error === 'OUT_OF_RIBBON') this.currentStatus = 'OUT_OF_RIBBON';
    else if (error === 'OFFLINE') this.currentStatus = 'OFFLINE';
    else this.currentStatus = 'READY';
  }

  public async getStatus(): Promise<PrinterStatus> {
    return {
      online: this.currentStatus !== 'OFFLINE',
      status: this.currentStatus,
      model: 'Magicard 300 Duo (Hardware Emulator)',
      serialNumber: 'MC300-EMU-202688',
      firmwareVersion: 'v2.4.1-rc3',
      ribbonType: 'MA300YMCKO Color Ribbon',
      ribbonLevelPct: this.ribbonLevelPct,
      cardsPrintedLifetime: this.cardCountLifetime,
      hopperCountApprox: this.hopperCount,
      temperatureCelsius: 38.5,
      lastError: this.forceError || undefined,
      timestamp: new Date().toISOString(),
    };
  }

  public async testConnection(): Promise<ConnectionStatus> {
    const startTime = Date.now();
    return {
      connected: this.currentStatus !== 'OFFLINE',
      port: 'USB001 (Simulated)',
      driverVersion: 'Magicard Advanced Driver v4.2.0',
      latencyMs: Date.now() - startTime + 5,
      message: 'Magicard 300 Duo hardware emulation responding normally.',
    };
  }

  public async print(job: HardwarePrintJob): Promise<PrintResult> {
    const startTime = Date.now();
    this.activeJobId = job.jobId;

    if (this.forceError) {
      this.activeJobId = null;
      return {
        success: false,
        jobId: job.jobId,
        status: 'FAILED',
        durationMs: Date.now() - startTime,
        ribbonConsumedPct: 0,
        errorCode: `ERR_${this.forceError}`,
        errorMessage: `Simulated Magicard hardware error: ${this.forceError}`,
        timestamp: new Date().toISOString(),
      };
    }

    if (this.currentStatus !== 'READY') {
      return {
        success: false,
        jobId: job.jobId,
        status: 'FAILED',
        durationMs: Date.now() - startTime,
        ribbonConsumedPct: 0,
        errorCode: 'ERR_PRINTER_BUSY_OR_NOT_READY',
        errorMessage: `Cannot print: Printer status is ${this.currentStatus}`,
        timestamp: new Date().toISOString(),
      };
    }

    // Begin physical print sequence simulation
    this.currentStatus = 'PRINTING';

    // Sleep for simulated print duration
    await new Promise((resolve) => setTimeout(resolve, this.simulatedDelayMs));

    // Decrement ribbon and hopper, increment lifetime
    this.ribbonLevelPct = Math.max(0, this.ribbonLevelPct - 1);
    this.hopperCount = Math.max(0, this.hopperCount - 1);
    this.cardCountLifetime += 1;
    this.currentStatus = 'READY';
    this.activeJobId = null;

    return {
      success: true,
      jobId: job.jobId,
      status: 'COMPLETED',
      durationMs: Date.now() - startTime,
      ribbonConsumedPct: 1,
      timestamp: new Date().toISOString(),
    };
  }

  public async cancel(jobId: string): Promise<void> {
    if (this.activeJobId === jobId) {
      this.currentStatus = 'READY';
      this.activeJobId = null;
    }
  }
}
