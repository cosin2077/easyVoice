// services/cache/storage/memoryStorage.ts
import { BaseStorage } from './baseStorage';

export class MemoryStorage extends BaseStorage {
  private cache: Map<string, any>;

  constructor() {
    super();
    this.cache = new Map();
  }

  async set<T>(key: string, value: T): Promise<boolean> {
    this.cache.set(key, value);
    return true;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get(key) || null;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async cleanExpired(): Promise<void> {
    const now = Date.now();
    for (const [key, item] of this.cache) {
      if (item.expireAt < now) {
        this.cache.delete(key);
      }
    }
  }
}