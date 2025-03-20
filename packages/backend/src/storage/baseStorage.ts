// services/cache/storage/baseStorage.ts
export abstract class BaseStorage {
  abstract set<T>(key: string, value: T): Promise<boolean>;
  abstract get<T>(key: string): Promise<T | null>;
  abstract delete(key: string): Promise<void>;
  abstract cleanExpired(): Promise<void>;
}