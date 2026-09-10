import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrinterService } from '../printer/PrinterService.js';
import { LocalCache } from '../sync/LocalCache.js';

export function createAgentServer(
  printerService: PrinterService,
  localCache: LocalCache,
  options?: { secretToken?: string }
) {
  const app = express();
  const secretToken = options?.secretToken || process.env.KIOSK_AGENT_SECRET || 'super-secret-local-agent-token-2026';

  app.use(cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:7125',
      'http://127.0.0.1:7125',
    ],
    credentials: true,
  }));

  app.use(express.json({ limit: '20mb' })); // Support high-resolution canvas base64 payloads

  // Security Auth Middleware (Loopback protection)
  const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Health is public for monitoring
    if (req.path === '/health') return next();

    const authHeader = req.headers['x-kiosk-agent-secret'];
    if (!authHeader || authHeader !== secretToken) {
      // Allow browser dev testing if query token present or localhost
      if (req.query.token === secretToken) {
        return next();
      }
      return res.status(401).json({
        error: 'UNAUTHORIZED_LOCAL_AGENT',
        message: 'Missing or invalid X-Kiosk-Agent-Secret header',
      });
    }
    next();
  };

  app.use(authMiddleware);

  // 1. GET /health
  app.get('/health', async (_req: Request, res: Response) => {
    const memory = process.memoryUsage();
    res.json({
      status: 'OK',
      agentVersion: '1.4.0',
      nodeVersion: process.version,
      platform: process.platform,
      uptimeSeconds: Math.floor(process.uptime()),
      memoryUsageMb: Math.round(memory.rss / 1024 / 1024),
      timestamp: new Date().toISOString(),
    });
  });

  // 2. GET /printer/status
  app.get('/printer/status', async (_req: Request, res: Response) => {
    try {
      const status = await printerService.getStatus();
      const connection = await printerService.testConnection();
      res.json({
        ...status,
        connection,
      });
    } catch (err) {
      res.status(500).json({
        online: false,
        status: 'ERROR',
        error: (err as Error).message,
      });
    }
  });

  // 3. POST /print
  app.post('/print', async (req: Request, res: Response) => {
    try {
      const {
        jobId,
        idempotencyKey,
        employeeId,
        employeeNumber,
        templateVersionId,
        frontCanvasDataUrl,
        backCanvasDataUrl,
      } = req.body;

      if (!jobId || !idempotencyKey || !employeeNumber || !frontCanvasDataUrl) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_PRINT_PAYLOAD',
          message: 'Missing required fields: jobId, idempotencyKey, employeeNumber, or frontCanvasDataUrl',
        });
      }

      const result = await printerService.submitPrintJob({
        jobId,
        idempotencyKey,
        employeeId: employeeId || 'emp-unknown',
        employeeNumber,
        templateVersionId: templateVersionId || 'tmpl-unknown',
        frontCanvasDataUrl,
        backCanvasDataUrl,
      });

      res.status(result.success ? 200 : 500).json(result);
    } catch (err) {
      res.status(409).json({
        success: false,
        error: (err as Error).message,
      });
    }
  });

  // 4. POST /print/:id/cancel
  app.post('/print/:id/cancel', async (req: Request, res: Response) => {
    try {
      await printerService.cancelJob(req.params.id);
      res.json({ success: true, message: `Print job ${req.params.id} cancellation requested.` });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  });

  // 5. GET /device/status
  app.get('/device/status', (_req: Request, res: Response) => {
    const cache = localCache.getCache();
    res.json({
      device: {
        kioskCode: cache.kioskCode,
        agentPort: process.env.KIOSK_AGENT_PORT || 7125,
        lastSyncedAt: cache.lastSyncedAt,
        cachedTemplateVersionId: cache.templateVersionId,
        cachedTemplateVersionNumber: cache.templateVersionNumber,
        cachedChecksum: cache.templateChecksum,
      },
    });
  });

  // 6. POST /device/sync-template
  app.post('/device/sync-template', (req: Request, res: Response) => {
    const { versionId, versionNumber, checksum, layoutJson } = req.body;
    if (!versionId || !versionNumber || !layoutJson) {
      return res.status(400).json({ error: 'INVALID_SYNC_PAYLOAD' });
    }
    localCache.updateTemplate(versionId, versionNumber, checksum || '', layoutJson);
    res.json({ success: true, message: 'Local template cache updated successfully' });
  });

  return app;
}
