import { CacheConfig } from '../interfaces/types';

export class CacheManager {
  private config: CacheConfig;
  private cache: Map<string, any>;

  constructor(config: CacheConfig) {
    this.config = config;
    this.cache = new Map();
  }

  get(key: string): any {
    return this.cache.get(key) || null;
  }

  set(key: string, value: any): void {
    this.cache.set(key, value);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  evict(targetMB: number): void {

    const entriesToRemove = Math.floor(this.cache.size * 0.2);
    const keys = Array.from(this.cache.keys()).slice(0, entriesToRemove);
    keys.forEach(key => this.cache.delete(key));
  }

  clear(): void {
    this.cache.clear();
  }
}
