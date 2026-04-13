export type LoadStrategy = 'progressive' | 'tile' | 'stream' | 'viewport' | 'cluster';

export type DataFormat = 'geojson' | 'wms' | 'wfs' | 'mvt' | 'csv' | 'kml' | 'shapefile';

export type CacheLevel = 'memory' | 'indexeddb' | 'none';

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Point {
  lat: number;
  lng: number;
}

export interface LoaderOptions {
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

export interface CacheConfig {
  enabled: boolean;
  strategy: CacheLevel;
  maxSizeMB: number;
  ttl?: number;
  compression?: boolean;
}

export interface ViewportConfig {
  enabled: boolean;
  buffer: number;
  debounce: number;
  preload: boolean;
}

export interface ClusterConfig {
  enabled: boolean;
  minZoom: number;
  maxZoom: number;
  radius: number;
  maxClusterRadius?: number;
  minPoints?: number;
}

export interface SimplificationConfig {
  enabled: boolean;
  tolerance: number;
  highQuality: boolean;
  dynamicTolerance?: boolean;
}

export interface ProgressiveConfig {
  enabled: boolean;
  chunks: number;
  delay: number;
  priorityCenter: boolean;
  adaptiveLoading?: boolean;
}

export interface DatasetConfig {
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

export interface LoadProgress {
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

export interface LoadResult {
  success: boolean;
  features: number;
  timeTaken: number;
  memoryUsed: number;
  tilesLoaded?: number;
  errors?: string[];
  metadata?: Record<string, any>;
}

export interface Feature {
  type: 'Feature';
  id?: string | number;
  geometry: Geometry;
  properties: Record<string, any>;
}

export interface Geometry {
  type: 'Point' | 'LineString' | 'Polygon' | 'MultiPoint' | 'MultiLineString' | 'MultiPolygon';
  coordinates: any;
}

export interface Tile {
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

export interface WorkerMessage {
  type: 'load' | 'process' | 'simplify' | 'cluster' | 'cancel';
  data: any;
  id: string;
  config?: any;
}

export interface WorkerResponse {
  type: 'success' | 'error' | 'progress';
  data: any;
  id: string;
  error?: string;
}

export interface PerformanceMetrics {
  fps: number;
  memoryUsedMB: number;
  featuresRendered: number;
  tilesInView: number;
  cacheHitRate: number;
  networkRequests: number;
  avgLoadTime: number;
}

export type LoaderEventType =
  | 'loadstart'
  | 'loadprogress'
  | 'loadend'
  | 'loaderror'
  | 'tileload'
  | 'tileunload'
  | 'cacheevict'
  | 'memorywarning'
  | 'performanceupdate';

export interface LoaderEvent {
  type: LoaderEventType;
  target: any;
  data?: any;
  timestamp: number;
}

export type LoaderEventHandler = (event: LoaderEvent) => void;

export interface DataSource {
  load(config: DatasetConfig): Promise<Feature[]>;
  cancel(): void;
  supports(format: DataFormat): boolean;
}