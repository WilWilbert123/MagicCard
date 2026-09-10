export type PrinterStatusCode = 
  | 'READY' 
  | 'BUSY' 
  | 'PRINTING' 
  | 'OUT_OF_RIBBON' 
  | 'CARD_JAM' 
  | 'HOPPER_EMPTY' 
  | 'COVER_OPEN' 
  | 'CLEANING_REQUIRED' 
  | 'OFFLINE' 
  | 'ERROR';

export interface PrinterStatus {
  online: boolean;
  status: PrinterStatusCode;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
  ribbonType: string;
  ribbonLevelPct: number;
  cardsPrintedLifetime: number;
  hopperCountApprox: number;
  temperatureCelsius: number;
  lastError?: string;
  timestamp: string;
}

export interface HardwarePrintJob {
  jobId: string;
  idempotencyKey: string;
  employeeId: string;
  employeeNumber: string;
  templateVersionId: string;
  frontCanvasDataUrl: string;
  backCanvasDataUrl?: string;
  timeoutMs?: number;
}

export interface PrintResult {
  success: boolean;
  jobId: string;
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  durationMs: number;
  ribbonConsumedPct: number;
  errorCode?: string;
  errorMessage?: string;
  timestamp: string;
}

export interface ConnectionStatus {
  connected: boolean;
  port?: string;
  driverVersion?: string;
  latencyMs: number;
  message?: string;
}

export interface CardPrinterProvider {
  getStatus(): Promise<PrinterStatus>;
  print(job: HardwarePrintJob): Promise<PrintResult>;
  cancel(jobId: string): Promise<void>;
  testConnection(): Promise<ConnectionStatus>;
}
