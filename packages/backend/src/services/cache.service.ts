// services/cache/cacheService.ts
import { BaseStorage } from '../storage/baseStorage'
import { MemoryStorage } from '../storage/memoryStorage'
import { FileStorage } from '../storage/fileStorage'
// import { RedisStorage } from '../storage/redisStorage'; // 可选 Redis 实现

export interface CacheOptions {
  storageType?: 'memory' | 'file' | 'redis' // 存储类型
  ttl?: number // 默认 TTL（毫秒）
  storageOptions?: any // 存储特定配置
}

interface CacheItem<T> {
  value: T
  expireAt: number
  // original: string; // 用于校验
}

class CacheService {
  private storage: BaseStorage
  private defaultTtl: number

  constructor(options: CacheOptions = {}) {
    const { storageType = 'memory', ttl = 3600 * 1000, storageOptions = {} } = options
    this.defaultTtl = ttl

    // 根据类型选择存储后端
    switch (storageType) {
      case 'file':
        this.storage = new FileStorage(storageOptions)
        break
      case 'memory':
        this.storage = new MemoryStorage()
        break
      case 'redis':
        // this.storage = new RedisStorage(storageOptions);
        throw new Error('Redis storage not implemented yet')
      default:
        throw new Error(`Unsupported storage type: ${storageType}`)
    }
  }

  // 生成 key
  private generateKey(str: string): string {
    return require('crypto').createHash('md5').update(str).digest('hex')
  }

  // 设置缓存
  async set<T>(str: string, value: T, customTtl?: number): Promise<boolean> {
    const key = this.generateKey(str)
    const ttl = customTtl ?? this.defaultTtl
    const item: CacheItem<T> = {
      value,
      expireAt: Date.now() + ttl,
      // original: str,
    }
    return this.storage.set(key, item)
  }

  // 获取缓存
  async get<T>(str: string): Promise<T | null> {
    const key = this.generateKey(str)
    const item = await this.storage.get<CacheItem<T>>(key)
    if (!item || item.expireAt < Date.now()) {
      await this.storage.delete(key) // 删除过期项
      return null
    }
    return item.value
  }

  // 检查是否存在
  async has(str: string): Promise<boolean> {
    const key = this.generateKey(str)
    const item = await this.storage.get<CacheItem<any>>(key)
    return !!(item && item.expireAt >= Date.now())
  }

  // 清理过期项
  async cleanExpired(): Promise<void> {
    await this.storage.cleanExpired()
  }
}

export default CacheService
