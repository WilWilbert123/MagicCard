export const KIOSK_AGENT_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_KIOSK_AGENT_URL || 'http://127.0.0.1:7125',
  healthEndpoint: '/health',
  printEndpoint: '/api/print',
  statusEndpoint: '/api/kiosk/status',
};
