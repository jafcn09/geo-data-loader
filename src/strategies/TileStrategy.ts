import * as L from 'leaflet';
import { BaseStrategy } from './BaseStrategy';
import { DatasetConfig, Feature, LoadProgress } from '../interfaces/types';

export class TileStrategy extends BaseStrategy {
  async load(
    config: DatasetConfig,
    onProgress: (progress: LoadProgress) => void,
    signal: AbortSignal
  ): Promise<Feature[]> {
    throw new Error('TileStrategy not implemented');
  }

  cancel(): void {}

  onViewportChange(bounds: L.LatLngBounds): void {}

  onZoomChange(zoom: number): void {}

  unload(datasetId: string): void {}

  destroy(): void {}
}
