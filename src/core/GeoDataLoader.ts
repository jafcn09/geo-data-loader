import * as L from 'leaflet';
import { EventEmitter } from '../utils/EventEmitter';
import { LoaderOptions, DatasetConfig, LoadProgress, LoadResult, LoaderEventType, PerformanceMetrics, LoadStrategy } from '../interfaces/types';
import { ProgressiveStrategy } from '../strategies/ProgressiveStrategy';
import { TileStrategy } from '../strategies/TileStrategy';
import { ViewportStrategy } from '../strategies/ViewportStrategy';
import { StreamStrategy } from '../strategies/StreamStrategy';
import { ClusterStrategy } from '../strategies/ClusterStrategy';
import { CacheManager } from '../cache/CacheManager';
import { WorkerPool } from '../workers/WorkerPool';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { VirtualRenderer } from '../virtualizer/VirtualRenderer';

export class GeoDataLoader extends EventEmitter {
  private map: L.Map;
  private options: Required<LoaderOptions>;
  private strategy: any;
  private cache: CacheManager;
  private workerPool: WorkerPool;
  private performanceMonitor: PerformanceMonitor;
  private virtualRenderer: VirtualRenderer;
  private datasets: Map<string, DatasetConfig>;
  private loadingQueue: Set<string>;
  private abortController: AbortController | null;

  private static defaultOptions: Required<LoaderOptions> = {
    strategy: 'progressive',
    maxFeatures: 100000,
    maxMemoryMB: 100,
    tileSize: 512,
    workers: 4,
    cache: {
      enabled: true,
      strategy: 'memory',
      maxSizeMB: 50,
      ttl: 3600000,
      compression: false
    },
    viewport: {
      enabled: true,
      buffer: 0.5,
      debounce: 300,
      preload: true
    },
    clustering: {
      enabled: false,
      minZoom: 0,
      maxZoom: 18,
      radius: 80,
      maxClusterRadius: 120,
      minPoints: 2
    },
    simplification: {
      enabled: true,
      tolerance: 0.001,
      highQuality: false,
      dynamicTolerance: true
    },
    progressive: {
      enabled: true,
      chunks: 10,
      delay: 100,
      priorityCenter: true,
      adaptiveLoading: true
    },
    debug: false
  };

  constructor(map: L.Map, options?: LoaderOptions) {
    super();
    this.map = map;
    this.options = this.mergeOptions(options);
    this.datasets = new Map();
    this.loadingQueue = new Set();
    this.abortController = null;

    this.cache = new CacheManager(this.options.cache);
    this.workerPool = new WorkerPool(this.options.workers);
    this.performanceMonitor = new PerformanceMonitor();
    this.virtualRenderer = new VirtualRenderer(map, this.options);

    this.initializeStrategy();
    this.setupEventListeners();
    this.performanceMonitor.start();
  }

  private mergeOptions(options?: LoaderOptions): Required<LoaderOptions> {
    return {
      ...GeoDataLoader.defaultOptions,
      ...options,
      cache: { ...GeoDataLoader.defaultOptions.cache, ...options?.cache },
      viewport: { ...GeoDataLoader.defaultOptions.viewport, ...options?.viewport },
      clustering: { ...GeoDataLoader.defaultOptions.clustering, ...options?.clustering },
      simplification: { ...GeoDataLoader.defaultOptions.simplification, ...options?.simplification },
      progressive: { ...GeoDataLoader.defaultOptions.progressive, ...options?.progressive }
    };
  }

  private initializeStrategy(): void {
    const strategies: Record<LoadStrategy, any> = {
      progressive: ProgressiveStrategy,
      tile: TileStrategy,
      viewport: ViewportStrategy,
      stream: StreamStrategy,
      cluster: ClusterStrategy
    };

    const StrategyClass = strategies[this.options.strategy];
    if (!StrategyClass) {
      throw new Error(`Unknown strategy: ${this.options.strategy}`);
    }

    this.strategy = new StrategyClass(this.map, this.options, this.cache, this.workerPool);
  }

  private setupEventListeners(): void {
    this.map.on('moveend', this.handleViewportChange.bind(this));
    this.map.on('zoomend', this.handleZoomChange.bind(this));

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }

    this.performanceMonitor.on('warning', (metrics: PerformanceMetrics) => {
      if (metrics.memoryUsedMB > this.options.maxMemoryMB * 0.9) {
        this.emit('memorywarning', { metrics });
        this.cache.evict(this.options.maxMemoryMB * 0.2);
      }
    });
  }

  async load(config: DatasetConfig): Promise<LoadResult> {
    const startTime = performance.now();
    const datasetId = config.id || this.generateId();

    if (this.loadingQueue.has(datasetId)) {
      throw new Error(`Dataset ${datasetId} is already loading`);
    }

    this.loadingQueue.add(datasetId);
    this.datasets.set(datasetId, config);
    this.abortController = new AbortController();

    this.emit('loadstart', { dataset: config });

    try {
      const cacheKey = this.getCacheKey(config);
      const cached = await this.cache.get(cacheKey);

      if (cached && !this.isCacheExpired(cached)) {
        const result = this.createLoadResult(cached.features.length, startTime);
        this.emit('loadend', { dataset: config, result });
        return result;
      }

      const progressCallback = (progress: LoadProgress) => {
        this.emit('loadprogress', { dataset: config, progress });
      };

      const features = await this.strategy.load(
        config,
        progressCallback,
        this.abortController.signal
      );

      if (features.length > this.options.maxFeatures) {
        const processed = await this.virtualRenderer.process(features);
        await this.cache.set(cacheKey, { features: processed, timestamp: Date.now() });
      } else {
        await this.cache.set(cacheKey, { features, timestamp: Date.now() });
      }

      const result = this.createLoadResult(features.length, startTime);
      this.emit('loadend', { dataset: config, result });

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.emit('loaderror', { dataset: config, error: errorMessage });
      throw error;
    } finally {
      this.loadingQueue.delete(datasetId);
      this.abortController = null;
    }
  }

  async unload(datasetId: string): Promise<void> {
    if (!this.datasets.has(datasetId)) {
      throw new Error(`Dataset ${datasetId} not found`);
    }

    const config = this.datasets.get(datasetId)!;
    const cacheKey = this.getCacheKey(config);

    await this.cache.delete(cacheKey);
    this.strategy.unload(datasetId);
    this.virtualRenderer.clear(datasetId);
    this.datasets.delete(datasetId);
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.strategy.cancel();
  }

  setStrategy(strategy: LoadStrategy): void {
    if (this.options.strategy === strategy) return;

    this.options.strategy = strategy;
    this.strategy.destroy();
    this.initializeStrategy();
  }

  getMetrics(): PerformanceMetrics {
    return this.performanceMonitor.getMetrics();
  }

  clearCache(): void {
    this.cache.clear();
    this.emit('cacheevict', { cleared: true });
  }

  destroy(): void {
    this.cancel();
    this.performanceMonitor.stop();
    this.workerPool.terminate();
    this.strategy.destroy();
    this.virtualRenderer.destroy();
    this.cache.clear();
    this.removeAllListeners();

    this.map.off('moveend', this.handleViewportChange.bind(this));
    this.map.off('zoomend', this.handleZoomChange.bind(this));

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
  }

  private handleViewportChange(): void {
    if (this.options.viewport.enabled) {
      this.strategy.onViewportChange(this.map.getBounds());
    }
  }

  private handleZoomChange(): void {
    const zoom = this.map.getZoom();
    this.strategy.onZoomChange(zoom);

    if (this.options.simplification.dynamicTolerance) {
      this.options.simplification.tolerance = this.calculateDynamicTolerance(zoom);
    }
  }

  private handleOnline(): void {
    this.emit('networkstatus', { online: true });
  }

  private handleOffline(): void {
    this.emit('networkstatus', { online: false });
  }

  private getCacheKey(config: DatasetConfig): string {
    return `${config.url}_${config.format}_${JSON.stringify(config.params || {})}`;
  }

  private isCacheExpired(cached: any): boolean {
    if (!this.options.cache.ttl) return false;
    return Date.now() - cached.timestamp > this.options.cache.ttl;
  }

  private createLoadResult(features: number, startTime: number): LoadResult {
    return {
      success: true,
      features,
      timeTaken: performance.now() - startTime,
      memoryUsed: this.performanceMonitor.getMetrics().memoryUsedMB,
      metadata: {
        strategy: this.options.strategy,
        cached: false
      }
    };
  }

  private calculateDynamicTolerance(zoom: number): number {
    const maxTolerance = 0.01;
    const minTolerance = 0.0001;
    const zoomRange = 18;

    const factor = (zoomRange - zoom) / zoomRange;
    return minTolerance + (maxTolerance - minTolerance) * factor;
  }

  private generateId(): string {
    return `dataset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}