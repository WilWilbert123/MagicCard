# MagicCard Trust ID Hardware Integration Boundary

## Philosophy
As mandated by enterprise architectural principles, this platform **never invents vendor APIs** and **never reports a print job as successful unless verified by hardware sensors**.

## CardPrinterProvider Interface
The boundary contract lives in `apps/kiosk-agent/src/printer/CardPrinterProvider.ts`:
```typescript
export interface CardPrinterProvider {
  getStatus(): Promise<PrinterStatus>;
  print(job: HardwarePrintJob): Promise<PrintResult>;
  cancel(jobId: string): Promise<void>;
  testConnection(): Promise<ConnectionStatus>;
}
```

## Production vs. Simulation Adapters
1. **`MockMagicCardAdapter`** (`MOCK_PRINT=true`):
   - High-fidelity hardware emulation for development, staging, and automated CI tests.
   - Emulates 2.5s YMCKO dye sublimation print cycle, card feed, flip, ribbon consumption, and hopper counter decrement.
   - Supports simulated error injection (`CARD_JAM`, `OUT_OF_RIBBON`, `OFFLINE`).

2. **`MagicCardTrustIdAdapter`** (`MOCK_PRINT=false`):
   - Production adapter delegating to the installed Trust ID executable or Windows Print Spooler.
   - Queries real-time printer status via Windows PowerShell WMI / spooler interfaces.
   - Dispatches print command: `TrustID.exe /print /printer:"Magicard 300 Duo" /job:"JOB_ID"`.
