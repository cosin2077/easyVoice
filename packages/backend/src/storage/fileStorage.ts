// services/cache/storage/fileStorage.ts
import { BaseStorage } from './baseStorage';
import * as fs from 'fs/promises';
import * as path from 'path';

interface FileStorageOptions {
  cacheDir: string;
}

export class FileStorage extends BaseStorage {
  private cacheDir: string;

  constructor(options: FileStorageOptions) {
    super();
    this.cacheDir = options.cacheDir;
    this.initDir();
  }

  private async initDir() {
    await fs.mkdir(this.cacheDir, { recursive: true });
  }

  private getFilePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  async set<T>(key: string, value: T): Promise<boolean> {
    const filePath = this.getFilePath(key);
    await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
    return true;
  }

  async get<T>(key: string): Promise<T | null> {
    const filePath = this.getFilePath(key);
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = this.getFilePath(key);
    await fs.unlink(filePath)
  }

  async cleanExpired(): Promise<void> {
    const files = await fs.readdir(this.cacheDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(this.cacheDir, file);
      const data = await fs.readFile(filePath, 'utf8');
      const item = JSON.parse(data);
      if (item?.expireAt < now) {
        await fs.unlink(filePath);
      }
    }
  }
}