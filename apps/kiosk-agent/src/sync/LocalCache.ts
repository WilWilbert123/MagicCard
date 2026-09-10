import * as fs from 'node:fs';
import * as path from 'node:path';

export interface LocalCacheData {
  kioskCode: string;
  templateVersionId?: string;
  templateVersionNumber?: number;
  templateChecksum?: string;
  templateLayoutJson?: Record<string, unknown>;
  lastSyncedAt?: string;
}

export class LocalCache {
  private cacheFilePath: string;
  private memoryCache: LocalCacheData;

  constructor(cacheDirectory = './.cache') {
    if (!fs.existsSync(cacheDirectory)) {
      try {
        fs.mkdirSync(cacheDirectory, { recursive: true });
      } catch {
        // Fallback to temp if readonly
      }
    }
    this.cacheFilePath = path.join(cacheDirectory, 'kiosk_local_cache.json');
    this.memoryCache = this.loadFromDisk();
  }

  private loadFromDisk(): LocalCacheData {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // Ignore parse error and fallback to default
    }
    return {
      kioskCode: process.env.KIOSK_CODE || 'KIOSK-NYC-01',
    };
  }

  public getCache(): LocalCacheData {
    return this.memoryCache;
  }

  public updateTemplate(
    versionId: string,
    versionNumber: number,
    checksum: string,
    layout: Record<string, unknown>
  ) {
    this.memoryCache.templateVersionId = versionId;
    this.memoryCache.templateVersionNumber = versionNumber;
    this.memoryCache.templateChecksum = checksum;
    this.memoryCache.templateLayoutJson = layout;
    this.memoryCache.lastSyncedAt = new Date().toISOString();

    try {
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.memoryCache, null, 2), 'utf-8');
    } catch {
      // Best effort write
    }
  }
}
