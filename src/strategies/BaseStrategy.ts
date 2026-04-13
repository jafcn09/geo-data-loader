import * as L from 'leaflet';
import { DatasetConfig, Feature, LoadProgress, LoaderOptions } from '../interfaces/types';
import { CacheManager } from '../cache/CacheManager';
import { WorkerPool } from '../workers/WorkerPool';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';

export abstract class BaseStrategy {
  protected map: L.Map;
  protected options: LoaderOptions;
  protected cache: CacheManager;
  protected workerPool: WorkerPool;
  protected performanceMonitor?: PerformanceMonitor;

  constructor(
    map: L.Map,
    options: LoaderOptions,
    cache: CacheManager,
    workerPool: WorkerPool
  ) {
    this.map = map;
    this.options = options;
    this.cache = cache;
    this.workerPool = workerPool;
  }

  abstract load(
    config: DatasetConfig,
    onProgress: (progress: LoadProgress) => void,
    signal: AbortSignal
  ): Promise<Feature[]>;

  abstract cancel(): void;

  abstract onViewportChange(bounds: L.LatLngBounds): void;

  abstract onZoomChange(zoom: number): void;

  abstract unload(datasetId: string): void;

  abstract destroy(): void;

  protected async fetchData(config: DatasetConfig, signal: AbortSignal): Promise<Response> {
    const url = this.buildUrl(config);
    const options: RequestInit = {
      method: 'GET',
      headers: config.headers || {},
      signal
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }

    return response;
  }

  protected buildUrl(config: DatasetConfig): string {
    const url = new URL(config.url);

    if (config.params) {
      Object.entries(config.params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  protected isInBounds(feature: Feature, bounds: L.LatLngBounds): boolean {
    const geometry = feature.geometry;

    if (geometry.type === 'Point') {
      const [lng, lat] = geometry.coordinates;
      return bounds.contains([lat, lng]);
    }

    if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
      return geometry.coordinates.some((coord: number[]) => {
        const [lng, lat] = coord;
        return bounds.contains([lat, lng]);
      });
    }

    if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
      return geometry.coordinates[0].some((coord: number[]) => {
        const [lng, lat] = coord;
        return bounds.contains([lat, lng]);
      });
    }

    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.some((polygon: number[][][]) =>
        polygon[0].some((coord: number[]) => {
          const [lng, lat] = coord;
          return bounds.contains([lat, lng]);
        })
      );
    }

    return false;
  }

  protected calculateBounds(features: Feature[]): L.LatLngBounds | null {
    if (features.length === 0) return null;

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    features.forEach(feature => {
      const coords = this.extractCoordinates(feature);
      coords.forEach(([lng, lat]) => {
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      });
    });

    return L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
  }

  private extractCoordinates(feature: Feature): number[][] {
    const geometry = feature.geometry;
    const coords: number[][] = [];

    switch (geometry.type) {
      case 'Point':
        coords.push(geometry.coordinates);
        break;

      case 'LineString':
      case 'MultiPoint':
        coords.push(...geometry.coordinates);
        break;

      case 'Polygon':
      case 'MultiLineString':
        geometry.coordinates.forEach((ring: number[][]) => {
          coords.push(...ring);
        });
        break;

      case 'MultiPolygon':
        geometry.coordinates.forEach((polygon: number[][][]) => {
          polygon.forEach((ring: number[][]) => {
            coords.push(...ring);
          });
        });
        break;
    }

    return coords;
  }

  protected setPerformanceMonitor(monitor: PerformanceMonitor): void {
    this.performanceMonitor = monitor;
  }
}