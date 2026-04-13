import * as L from 'leaflet';
import { DatasetConfig, Feature, LoadProgress, LoaderOptions } from '../interfaces/types';
import { BaseStrategy } from './BaseStrategy';

export class ProgressiveStrategy extends BaseStrategy {
  private currentChunk: number;
  private totalChunks: number;
  private chunkSize: number;
  private loadedFeatures: Feature[];
  private priorityQueue: number[];

  constructor(
    map: L.Map,
    options: LoaderOptions,
    cache: any,
    workerPool: any
  ) {
    super(map, options, cache, workerPool);
    this.currentChunk = 0;
    this.totalChunks = 0;
    this.chunkSize = 0;
    this.loadedFeatures = [];
    this.priorityQueue = [];
  }

  async load(
    config: DatasetConfig,
    onProgress: (progress: LoadProgress) => void,
    signal: AbortSignal
  ): Promise<Feature[]> {
    this.loadedFeatures = [];

    const response = await this.fetchData(config, signal);
    const data = await response.json();
    const features = this.extractFeatures(data);

    if (features.length === 0) {
      return [];
    }

    this.totalChunks = this.options.progressive?.chunks || 10;
    this.chunkSize = Math.ceil(features.length / this.totalChunks);

    if (this.options.progressive?.priorityCenter) {
      this.priorityQueue = this.createPriorityQueue(features);
    } else {
      this.priorityQueue = features.map((_, index) => index);
    }

    const startTime = performance.now();

    for (let i = 0; i < this.totalChunks; i++) {
      if (signal.aborted) {
        throw new Error('Loading cancelled');
      }

      this.currentChunk = i;
      const chunk = await this.loadChunk(features, i);
      this.loadedFeatures.push(...chunk);

      const progress: LoadProgress = {
        loaded: this.loadedFeatures.length,
        total: features.length,
        percentage: Math.round((this.loadedFeatures.length / features.length) * 100),
        timeElapsed: performance.now() - startTime,
        currentChunk: i + 1,
        totalChunks: this.totalChunks
      };

      onProgress(progress);

      if (this.options.progressive?.delay) {
        await this.delay(this.options.progressive.delay);
      }

      if (this.options.progressive?.adaptiveLoading) {
        await this.adaptiveDelay();
      }
    }

    return this.loadedFeatures;
  }

  private async loadChunk(features: Feature[], chunkIndex: number): Promise<Feature[]> {
    const start = chunkIndex * this.chunkSize;
    const end = Math.min(start + this.chunkSize, features.length);
    const chunk: Feature[] = [];

    for (let i = start; i < end; i++) {
      const featureIndex = this.priorityQueue[i];
      if (featureIndex < features.length) {
        const feature = features[featureIndex];

        if (this.options.simplification?.enabled) {
          const simplified = await this.simplifyFeature(feature);
          chunk.push(simplified);
        } else {
          chunk.push(feature);
        }
      }
    }

    return chunk;
  }

  private createPriorityQueue(features: Feature[]): number[] {
    const center = this.map.getCenter();
    const centerPoint = [center.lng, center.lat];

    const distances = features.map((feature, index) => {
      const coords = this.getFeatureCenter(feature);
      const distance = this.calculateDistance(centerPoint, coords);
      return { index, distance };
    });

    distances.sort((a, b) => a.distance - b.distance);

    return distances.map(d => d.index);
  }

  private getFeatureCenter(feature: Feature): number[] {
    const geometry = feature.geometry;

    switch (geometry.type) {
      case 'Point':
        return geometry.coordinates;

      case 'LineString':
        const midIndex = Math.floor(geometry.coordinates.length / 2);
        return geometry.coordinates[midIndex];

      case 'Polygon':
        return this.getPolygonCenter(geometry.coordinates[0]);

      case 'MultiPoint':
        return geometry.coordinates[0];

      case 'MultiLineString':
        return this.getFeatureCenter({
          ...feature,
          geometry: { type: 'LineString', coordinates: geometry.coordinates[0] }
        });

      case 'MultiPolygon':
        return this.getFeatureCenter({
          ...feature,
          geometry: { type: 'Polygon', coordinates: geometry.coordinates[0] }
        });

      default:
        return [0, 0];
    }
  }

  private getPolygonCenter(coordinates: number[][]): number[] {
    let sumX = 0;
    let sumY = 0;
    const count = coordinates.length;

    for (const coord of coordinates) {
      sumX += coord[0];
      sumY += coord[1];
    }

    return [sumX / count, sumY / count];
  }

  private calculateDistance(point1: number[], point2: number[]): number {
    const dx = point1[0] - point2[0];
    const dy = point1[1] - point2[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  private async simplifyFeature(feature: Feature): Promise<Feature> {
    if (feature.geometry.type === 'Point' || feature.geometry.type === 'MultiPoint') {
      return feature;
    }

    const tolerance = this.options.simplification?.tolerance || 0.001;
    const highQuality = this.options.simplification?.highQuality || false;

    const simplified = await this.workerPool.execute({
      type: 'simplify',
      data: feature,
      config: { tolerance, highQuality }
    });

    return simplified || feature;
  }

  private async adaptiveDelay(): Promise<void> {
    const metrics = this.performanceMonitor?.getMetrics();
    if (!metrics) return;

    if (metrics.fps < 30) {
      await this.delay(200);
    } else if (metrics.fps < 45) {
      await this.delay(100);
    } else if (metrics.fps < 55) {
      await this.delay(50);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private extractFeatures(data: any): Feature[] {
    if (data.type === 'FeatureCollection') {
      return data.features;
    } else if (data.type === 'Feature') {
      return [data];
    } else if (Array.isArray(data)) {
      return data;
    }
    return [];
  }

  cancel(): void {
    this.currentChunk = 0;
    this.loadedFeatures = [];
  }

  onViewportChange(bounds: L.LatLngBounds): void {
    if (this.options.progressive?.priorityCenter) {
      const center = bounds.getCenter();
      console.log('Viewport changed, new center:', center);
    }
  }

  onZoomChange(zoom: number): void {
    console.log('Zoom changed:', zoom);
  }

  unload(datasetId: string): void {
    this.loadedFeatures = [];
    this.currentChunk = 0;
  }

  destroy(): void {
    this.loadedFeatures = [];
    this.priorityQueue = [];
  }
}