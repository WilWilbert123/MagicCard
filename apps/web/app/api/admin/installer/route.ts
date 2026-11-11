import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  const possiblePaths = [
    path.join(process.cwd(), '..', '..', 'installer', 'output', 'Admin-Printer-Agent-Setup.exe'),
    path.join(process.cwd(), 'installer', 'output', 'Admin-Printer-Agent-Setup.exe'),
    path.join(process.cwd(), '..', 'installer', 'output', 'Admin-Printer-Agent-Setup.exe'),
    path.join(process.cwd(), '..', '..', 'installer', 'output', 'Admin-Printer-Agent-Portable.zip'),
    path.join(process.cwd(), 'installer', 'output', 'Admin-Printer-Agent-Portable.zip'),
  ];

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      const fileBuffer = fs.readFileSync(filePath);
      const fileName = path.basename(filePath);
      const contentType = fileName.endsWith('.exe') ? 'application/octet-stream' : 'application/zip';

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Content-Length': fileBuffer.length.toString(),
        },
      });
    }
  }

  return NextResponse.json(
    {
      error: 'Installer file not found on server. Please run installer/build-admin-installer.ps1 to build the setup package.',
    },
    { status: 404 }
  );
}

