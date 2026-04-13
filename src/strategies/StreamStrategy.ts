import * as L from 'leaflet';
import { BaseStrategy } from './BaseStrategy';
import { DatasetConfig, Feature, LoadProgress } from '../interfaces/types';

export class StreamStrategy extends BaseStrategy {
  async load(
    config: DatasetConfig,
    onProgress: (progress: LoadProgress) => void,
    signal: AbortSignal
  ): Promise<Feature[]> {
    throw new Error('StreamStrategy not implemented');
  }

  cancel(): void {}

  onViewportChange(bounds: L.LatLngBounds): void {}

  onZoomChange(zoom: number): void {}

  unload(datasetId: string): void {}

  destroy(): void {}
}
