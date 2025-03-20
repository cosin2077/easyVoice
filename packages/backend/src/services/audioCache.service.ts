import { AUDIO_CACHE_DIR } from '../config';
import { logger } from '../utils/logger';
import CacheService, { CacheOptions } from './cache.service';

interface AudioData {
  voice: string;
  text: string;
  rate: string;
  pitch: string;
  volume: string;
  audio: string;
  srt: string;
  file: string;
}
class AudioCacheService {
  private cache: CacheService;

  constructor({ storageType, ttl, storageOptions }: CacheOptions) {
    if (!storageOptions?.cacheDir) throw new Error(`AudioCacheService cacheDir needed!`)
    logger.info(`init AudioCacheService with`, { storageType, ttl, storageOptions })
    this.cache = new CacheService({
      storageType,
      ttl,
      storageOptions,
    });
  }

  async setAudio(str: string, audioData: AudioData): Promise<boolean> {
    return this.cache.set(str, audioData);
  }

  async getAudio(str: string): Promise<AudioData | null> {
    return this.cache.get(str);
  }

  async hasAudio(str: string): Promise<boolean> {
    return this.cache.has(str);
  }

  async cleanExpired(): Promise<void> {
    return this.cache.cleanExpired();
  }
}

const instance = new AudioCacheService({
  storageType: 'file',
  ttl: 365 * 24 * 60 * 60 * 1e3,
  storageOptions: { cacheDir: AUDIO_CACHE_DIR },
});

export default instance;