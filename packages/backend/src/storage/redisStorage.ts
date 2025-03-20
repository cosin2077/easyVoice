// services/cache/storage/redisStorage.ts
// import { BaseStorage } from './baseStorage';
// export class RedisStorage extends BaseStorage { }
// import { createClient, RedisClientType } from 'redis';

// interface RedisStorageOptions {
//   url?: string;
// }

// export class RedisStorage extends BaseStorage {
//   private client: RedisClientType;

//   constructor(options: RedisStorageOptions = {}) {
//     super(options);
//     this.client = createClient({ url: options.url || 'redis://localhost:6379' });
//     this.client.connect();
//   }

//   async set<T>(key: string, value: T & { expireAt: number }): Promise<boolean> {
//     const ttl = Math.floor((value.expireAt - Date.now()) / 1000); // 转换为秒
//     await this.client.set(key, JSON.stringify(value), { EX: ttl });
//     return true;
//   }

//   async get<T>(key: string): Promise<T | null> {
//     const data = await this.client.get(key);
//     return data ? JSON.parse(data) : null;
//   }

//   async delete(key: string): Promise<void> {
//     await this.client.del(key);
//   }

//   async cleanExpired(): Promise<void> {
//     // Redis 自带 TTL，无需手动清理
//   }
// }