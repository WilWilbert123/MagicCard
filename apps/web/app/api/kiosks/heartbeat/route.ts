import { NextResponse } from 'next/server';
import { enterpriseStore } from '@/lib/data/enterpriseStore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { kioskCode, printerStatus, templateVersion, agentVersion } = body;

    const kiosk = enterpriseStore.kiosks.find((k) => k.code === kioskCode);
    if (kiosk) {
      kiosk.lastHeartbeat = new Date().toISOString();
      if (printerStatus) kiosk.printerStatus = printerStatus;
      if (agentVersion) kiosk.agentVersion = agentVersion;
    }

    // Return current active template version info so KIOSK detects if it needs to sync
    const activeVersion = enterpriseStore.templateVersions.find((v) => v.status === 'PUBLISHED');

    return NextResponse.json({
      status: 'ACK',
      timestamp: new Date().toISOString(),
      activeTemplate: {
        versionId: activeVersion?.id,
        versionTag: activeVersion?.versionTag,
        publishedAt: activeVersion?.publishedAt,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
