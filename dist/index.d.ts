import * as L from 'leaflet';

type EventListener = (...args: any[]) => void;
declare class EventEmitter {
    private events;
    constructor();
    on(event: string, listener: EventListener): void;
    off(event: string, listener: EventListener): void;
    once(event: string, listener: EventListener): void;
    emit(event: string, ...args: any[]): void;
    removeAllListeners(event?: string): void;
    listenerCount(event: string): number;
    eventNames(): string[];
}

type LoadStrategy = 'progressive' | 'tile' | 'stream' | 'viewport' | 'cluster';
type DataFormat = 'geojson' | 'wms' | 'wfs' | 'mvt' | 'csv' | 'kml' | 'shapefile';
type CacheLevel = 'memory' | 'indexeddb' | 'none';
interface BoundingBox {
    north: number;
    south: number;
    east: number;
    west: number;
}
interface Point {
    lat: number;
    lng: number;
}
interface LoaderOptions {
    strategy?: LoadStrategy;
    maxFeatures?: number;
    maxMemoryMB?: number;
    tileSize?: number;
    workers?: number;
    cache?: CacheConfig;
    viewport?: ViewportConfig;
    clustering?: ClusterConfig;
    simplification?: SimplificationConfig;
    progressive?: ProgressiveConfig;
    debug?: boolean;
}
interface CacheConfig {
    enabled: boolean;
    strategy: CacheLevel;
    maxSizeMB: number;
    ttl?: number;
    compression?: boolean;
}
interface ViewportConfig {
    enabled: boolean;
    buffer: number;
    debounce: number;
    preload: boolean;
}
interface ClusterConfig {
    enabled: boolean;
    minZoom: number;
    maxZoom: number;
    radius: number;
    maxClusterRadius?: number;
    minPoints?: number;
}
interface SimplificationConfig {
    enabled: boolean;
    tolerance: number;
    highQuality: boolean;
    dynamicTolerance?: boolean;
}
interface ProgressiveConfig {
    enabled: boolean;
    chunks: number;
    delay: number;
    priorityCenter: boolean;
    adaptiveLoading?: boolean;
}
interface DatasetConfig {
    id: string;
    name: string;
    url: string;
    format: DataFormat;
    bounds?: BoundingBox;
    minZoom?: number;
    maxZoom?: number;
    attribution?: string;
    headers?: Record<string, string>;
    params?: Record<string, any>;
}
interface LoadProgress {
    loaded: number;
    total: number;
    percentage: number;
    bytesLoaded?: number;
    bytesTotal?: number;
    timeElapsed: number;
    estimatedTimeRemaining?: number;
    currentChunk?: number;
    totalChunks?: number;
}
interface LoadResult {
    success: boolean;
    features: number;
    timeTaken: number;
    memoryUsed: number;
    tilesLoaded?: number;
    errors?: string[];
    metadata?: Record<string, any>;
}
interface Feature {
    type: 'Feature';
    id?: string | number;
    geometry: Geometry;
    properties: Record<string, any>;
}
interface Geometry {
    type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
    coordinates: any;
}
interface Tile {
    x: number;
    y: number;
    z: number;
    key: string;
    bounds: BoundingBox;
    features?: Feature[];
    loaded: boolean;
    loading: boolean;
    error?: string;
    timestamp?: number;
}
interface WorkerMessage {
    type: 'load' | 'process' | 'simplify' | 'cluster' | 'cancel';
    data: any;
    id: string;
    config?: any;
}
interface WorkerResponse {
    type: 'success' | 'error' | 'progress';
    data: any;
    id: string;
    error?: string;
}
interface PerformanceMetrics {
    fps: number;
    memoryUsedMB: number;
    featuresRendered: number;
    tilesInView: number;
    cacheHitRate: number;
    networkRequests: number;
    avgLoadTime: number;
}
type LoaderEventType = 'loadstart' | 'loadprogress' | 'loadend' | 'loaderror' | 'tileload' | 'tileunload' | 'cacheevict' | 'memorywarning' | 'performanceupdate';
interface LoaderEvent {
    type: LoaderEventType;
    target: any;
    data?: any;
    timestamp: number;
}
type LoaderEventHandler = (event: LoaderEvent) => void;
interface DataSource {
    load(config: DatasetConfig): Promise<Feature[]>;
    cancel(): void;
    supports(format: DataFormat): boolean;
}

declare class GeoDataLoader extends EventEmitter {
    private map;
    private options;
    private strategy;
    private cache;
    private workerPool;
    private performanceMonitor;
    private virtualRenderer;
    private datasets;
    private loadingQueue;
    private abortController;
    private static defaultOptions;
    constructor(map: L.Map, options?: LoaderOptions);
    private mergeOptions;
    private initializeStrategy;
    private setupEventListeners;
    load(config: DatasetConfig): Promise<LoadResult>;
    unload(datasetId: string): Promise<void>;
    cancel(): void;
    setStrategy(strategy: LoadStrategy): void;
    getMetrics(): PerformanceMetrics;
    clearCache(): void;
    destroy(): void;
    private handleViewportChange;
    private handleZoomChange;
    private handleOnline;
    private handleOffline;
    private getCacheKey;
    private isCacheExpired;
    private createLoadResult;
    private calculateDynamicTolerance;
    private generateId;
}

declare class CacheManager {
    get(key: string): any;
    set(key: string, value: any): void;
    clear(): void;
}

declare class WorkerPool {
    constructor(size: number);
    execute(task: any): Promise<any>;
    terminate(): void;
}

declare class PerformanceMonitor extends EventEmitter {
    private metrics;
    private frameCount;
    private lastFrameTime;
    private intervalId;
    private startTime;
    private networkRequestCount;
    private loadTimes;
    private cacheHits;
    private cacheMisses;
    constructor();
    private initializeMetrics;
    start(): void;
    stop(): void;
    private measureFPS;
    private updateMetrics;
    private updateMemoryUsage;
    private updateCacheHitRate;
    private updateAverageLoadTime;
    recordNetworkRequest(): void;
    recordLoadTime(time: number): void;
    recordCacheHit(): void;
    recordCacheMiss(): void;
    updateFeaturesRendered(count: number): void;
    updateTilesInView(count: number): void;
    getMetrics(): PerformanceMetrics;
    reset(): void;
}

declare abstract class BaseStrategy {
    protected map: L.Map;
    protected options: LoaderOptions;
    protected cache: CacheManager;
    protected workerPool: WorkerPool;
    protected performanceMonitor?: PerformanceMonitor;
    constructor(map: L.Map, options: LoaderOptions, cache: CacheManager, workerPool: WorkerPool);
    abstract load(config: DatasetConfig, onProgress: (progress: LoadProgress) => void, signal: AbortSignal): Promise<Feature[]>;
    abstract cancel(): void;
    abstract onViewportChange(bounds: L.LatLngBounds): void;
    abstract onZoomChange(zoom: number): void;
    abstract unload(datasetId: string): void;
    abstract destroy(): void;
    protected fetchData(config: DatasetConfig, signal: AbortSignal): Promise<Response>;
    protected buildUrl(config: DatasetConfig): string;
    protected isInBounds(feature: Feature, bounds: L.LatLngBounds): boolean;
    protected calculateBounds(features: Feature[]): L.LatLngBounds | null;
    private extractCoordinates;
    protected setPerformanceMonitor(monitor: PerformanceMonitor): void;
}

declare class ProgressiveStrategy extends BaseStrategy {
    private currentChunk;
    private totalChunks;
    private chunkSize;
    private loadedFeatures;
    private priorityQueue;
    constructor(map: L.Map, options: LoaderOptions, cache: any, workerPool: any);
    load(config: DatasetConfig, onProgress: (progress: LoadProgress) => void, signal: AbortSignal): Promise<Feature[]>;
    private loadChunk;
    private createPriorityQueue;
    private getFeatureCenter;
    private getPolygonCenter;
    private calculateDistance;
    private simplifyFeature;
    private adaptiveDelay;
    private delay;
    private extractFeatures;
    cancel(): void;
    onViewportChange(bounds: L.LatLngBounds): void;
    onZoomChange(zoom: number): void;
    unload(datasetId: string): void;
    destroy(): void;
}

export { BaseStrategy, EventEmitter, GeoDataLoader, PerformanceMonitor, ProgressiveStrategy };
export type { BoundingBox, CacheConfig, CacheLevel, ClusterConfig, DataFormat, DataSource, DatasetConfig, Feature, Geometry, LoadProgress, LoadResult, LoadStrategy, LoaderEvent, LoaderEventHandler, LoaderEventType, LoaderOptions, PerformanceMetrics, Point, ProgressiveConfig, SimplificationConfig, Tile, ViewportConfig, WorkerMessage, WorkerResponse };
