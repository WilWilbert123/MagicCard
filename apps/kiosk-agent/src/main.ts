import dotenv from 'dotenv';
import { MockMagicCardAdapter } from './printer/MockMagicCardAdapter.js';
import { MagicCardTrustIdAdapter } from './printer/MagicCardTrustIdAdapter.js';
import { PrinterService } from './printer/PrinterService.js';
import { LocalCache } from './sync/LocalCache.js';
import { createAgentServer } from './server/server.js';

dotenv.config({ path: '../../.env.local' });
dotenv.config();

const PORT = parseInt(process.env.KIOSK_AGENT_PORT || '7125', 10);
const HOST = '127.0.0.1'; // Strictly localhost
const isMock = process.env.MOCK_PRINT !== 'false';

console.log('====================================================');
console.log('  ENTERPRISE KIOSK HARDWARE AGENT DAEMON');
console.log('====================================================');
console.log(`[BOOT] Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`[BOOT] Port: ${PORT}`);
console.log(`[BOOT] Hardware Mode: ${isMock ? 'MOCK SIMULATOR (MockMagicCardAdapter)' : 'PHYSICAL HARDWARE (MagicCardTrustIdAdapter)'}`);

// Initialize Hardware Adapter
const adapter = isMock
  ? new MockMagicCardAdapter({ simulatedDelayMs: 2500 })
  : new MagicCardTrustIdAdapter({
      trustIdExecutablePath: process.env.MAGICCARD_TRUST_ID_PATH || 'C:\\Program Files\\Magicard\\TrustID\\TrustID.exe',
      printerName: process.env.PRINTER_NAME || 'Magicard 300 Duo',
      configFile: process.env.MAGICCARD_TRUST_ID_CONFIG,
    });

const printerService = new PrinterService(adapter);
const localCache = new LocalCache();

const app = createAgentServer(printerService, localCache, {
  secretToken: process.env.KIOSK_AGENT_SECRET || 'super-secret-local-agent-token-2026',
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[READY] Kiosk Agent successfully listening on http://${HOST}:${PORT}`);
  console.log(`[READY] Health: http://${HOST}:${PORT}/health`);
  console.log(`[READY] Printer Status: http://${HOST}:${PORT}/printer/status`);
});

process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Terminating Kiosk Agent...');
  server.close(() => process.exit(0));
});
