import { PerformanceMetrics } from '../interfaces/types';
import { EventEmitter } from './EventEmitter';

export class PerformanceMonitor extends EventEmitter {
  private metrics: PerformanceMetrics;
  private frameCount: number;
  private lastFrameTime: number;
  private intervalId: number | null;
  private startTime: number;
  private networkRequestCount: number;
  private loadTimes: number[];
  private cacheHits: number;
  private cacheMisses: number;

  constructor() {
    super();
    this.metrics = this.initializeMetrics();
    this.frameCount = 0;
    this.lastFrameTime = performance.now();
    this.intervalId = null;
    this.startTime = 0;
    this.networkRequestCount = 0;
    this.loadTimes = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      memoryUsedMB: 0,
      featuresRendered: 0,
      tilesInView: 0,
      cacheHitRate: 0,
      networkRequests: 0,
      avgLoadTime: 0
    };
  }

  start(): void {
    if (this.intervalId) return;

    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;

    this.intervalId = window.setInterval(() => {
      this.updateMetrics();
    }, 1000);

    this.measureFPS();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private measureFPS(): void {
    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastFrameTime;

    this.frameCount++;

    if (deltaTime >= 1000) {
      this.metrics.fps = Math.round((this.frameCount * 1000) / deltaTime);
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
    }

    if (this.intervalId) {
      requestAnimationFrame(() => this.measureFPS());
    }
  }

  private updateMetrics(): void {
    this.updateMemoryUsage();
    this.updateCacheHitRate();
    this.updateAverageLoadTime();

    this.emit('update', this.metrics);

    if (this.metrics.memoryUsedMB > 80) {
      this.emit('warning', this.metrics);
    }
  }

  private updateMemoryUsage(): void {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      this.metrics.memoryUsedMB = Math.round(
        (memory.usedJSHeapSize / 1024 / 1024) * 100
      ) / 100;
    } else {
      const roughEstimate = this.metrics.featuresRendered * 0.001;
      this.metrics.memoryUsedMB = Math.min(roughEstimate, 100);
    }
  }

  private updateCacheHitRate(): void {
    const total = this.cacheHits + this.cacheMisses;
    if (total > 0) {
      this.metrics.cacheHitRate = Math.round((this.cacheHits / total) * 100);
    }
  }

  private updateAverageLoadTime(): void {
    if (this.loadTimes.length > 0) {
      const sum = this.loadTimes.reduce((a, b) => a + b, 0);
      this.metrics.avgLoadTime = Math.round(sum / this.loadTimes.length);
    }
  }

  recordNetworkRequest(): void {
    this.networkRequestCount++;
    this.metrics.networkRequests = this.networkRequestCount;
  }

  recordLoadTime(time: number): void {
    this.loadTimes.push(time);
    if (this.loadTimes.length > 100) {
      this.loadTimes.shift();
    }
  }

  recordCacheHit(): void {
    this.cacheHits++;
  }

  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  updateFeaturesRendered(count: number): void {
    this.metrics.featuresRendered = count;
  }

  updateTilesInView(count: number): void {
    this.metrics.tilesInView = count;
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = this.initializeMetrics();
    this.frameCount = 0;
    this.networkRequestCount = 0;
    this.loadTimes = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}