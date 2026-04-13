# GeoDataLoader

High-performance geospatial data loader with progressive loading, virtualization, and caching strategies for handling massive datasets without compromising performance.

[English](#english) | [Español](#español)

---

## English

### Features

- **Progressive Loading** - Load millions of points without freezing the UI
- **Multiple Strategies** - Progressive, Tile-based, Viewport, Stream, and Cluster loading
- **Web Workers** - Parallel processing for heavy computations
- **Smart Caching** - Multi-level cache (Memory + IndexedDB)
- **Virtualization** - Render only visible features for optimal performance
- **Dynamic Simplification** - Automatic geometry simplification based on zoom level
- **Real-time Metrics** - Monitor FPS, memory usage, and load times

### Installation

```bash
npm install @geo-data-loader/core
```

### Quick Start

```javascript
import { GeoDataLoader } from '@geo-data-loader/core';

// Initialize with Leaflet map
const loader = new GeoDataLoader(map, {
  strategy: 'progressive',
  workers: 4,
  cache: {
    enabled: true,
    strategy: 'memory',
    maxSizeMB: 50
  }
});

// Load large dataset
const result = await loader.load({
  url: 'https://your-server.com/large-dataset.geojson',
  format: 'geojson',
  maxFeatures: 1000000
});

// Monitor progress
loader.on('loadprogress', (event) => {
  console.log(`Loaded: ${event.progress.percentage}%`);
});

// Get performance metrics
const metrics = loader.getMetrics();
console.log(`FPS: ${metrics.fps}, Memory: ${metrics.memoryUsedMB}MB`);
```

### Loading Strategies

#### Progressive Loading
Best for large datasets where users need immediate feedback.

```javascript
const loader = new GeoDataLoader(map, {
  strategy: 'progressive',
  progressive: {
    chunks: 10,
    delay: 100,
    priorityCenter: true
  }
});
```

#### Tile-based Loading
Ideal for datasets that can be spatially partitioned.

```javascript
const loader = new GeoDataLoader(map, {
  strategy: 'tile',
  tileSize: 512,
  viewport: {
    enabled: true,
    buffer: 0.5
  }
});
```

#### Viewport Loading
Loads only data visible in current map view.

```javascript
const loader = new GeoDataLoader(map, {
  strategy: 'viewport',
  viewport: {
    buffer: 0.2,
    debounce: 300,
    preload: true
  }
});
```

#### Stream Loading
For real-time data feeds.

```javascript
const loader = new GeoDataLoader(map, {
  strategy: 'stream',
  maxFeatures: 50000
});
```

#### Cluster Loading
Automatically clusters dense point data.

```javascript
const loader = new GeoDataLoader(map, {
  strategy: 'cluster',
  clustering: {
    enabled: true,
    radius: 80,
    minZoom: 0,
    maxZoom: 16
  }
});
```

### API Reference

#### Constructor

```typescript
new GeoDataLoader(map: L.Map, options?: LoaderOptions)
```

#### Methods

| Method | Description | Returns |
|--------|-------------|---------|
| `load(config)` | Load dataset with specified configuration | `Promise<LoadResult>` |
| `unload(datasetId)` | Remove dataset from map and cache | `Promise<void>` |
| `cancel()` | Cancel current loading operation | `void` |
| `setStrategy(strategy)` | Change loading strategy | `void` |
| `getMetrics()` | Get performance metrics | `PerformanceMetrics` |
| `clearCache()` | Clear all cached data | `void` |
| `destroy()` | Clean up and release resources | `void` |

#### Events

| Event | Description | Data |
|-------|-------------|------|
| `loadstart` | Loading started | `{ dataset: DatasetConfig }` |
| `loadprogress` | Loading progress update | `{ dataset, progress: LoadProgress }` |
| `loadend` | Loading completed | `{ dataset, result: LoadResult }` |
| `loaderror` | Loading failed | `{ dataset, error: string }` |
| `memorywarning` | Memory usage high | `{ metrics: PerformanceMetrics }` |

### Performance Tips

1. **Use appropriate strategy** - Choose based on your data characteristics
2. **Enable workers** - Set `workers: 4` or higher for large datasets
3. **Configure cache** - Adjust `maxSizeMB` based on available memory
4. **Simplify geometries** - Enable `simplification` for complex polygons
5. **Limit features** - Set reasonable `maxFeatures` limit
6. **Monitor metrics** - Watch FPS and memory usage

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires support for Web Workers, Fetch API, and ES2015.

---

## Español

### Características

- **Carga Progresiva** - Carga millones de puntos sin congelar la interfaz
- **Múltiples Estrategias** - Carga progresiva, por tiles, viewport, streaming y clustering
- **Web Workers** - Procesamiento paralelo para cálculos pesados
- **Cache Inteligente** - Cache multinivel (Memoria + IndexedDB)
- **Virtualización** - Renderiza solo features visibles para rendimiento óptimo
- **Simplificación Dinámica** - Simplificación automática de geometrías según el zoom
- **Métricas en Tiempo Real** - Monitorea FPS, uso de memoria y tiempos de carga

### Instalación

```bash
npm install @geo-data-loader/core
```

### Inicio Rápido

```javascript
import { GeoDataLoader } from '@geo-data-loader/core';

// Inicializar con mapa Leaflet
const loader = new GeoDataLoader(map, {
  strategy: 'progressive',
  workers: 4,
  cache: {
    enabled: true,
    strategy: 'memory',
    maxSizeMB: 50
  }
});

// Cargar dataset grande
const result = await loader.load({
  url: 'https://tu-servidor.com/dataset-grande.geojson',
  format: 'geojson',
  maxFeatures: 1000000
});

// Monitorear progreso
loader.on('loadprogress', (event) => {
  console.log(`Cargado: ${event.progress.percentage}%`);
});

// Obtener métricas de rendimiento
const metrics = loader.getMetrics();
console.log(`FPS: ${metrics.fps}, Memoria: ${metrics.memoryUsedMB}MB`);
```

### Estrategias de Carga

#### Carga Progresiva
Mejor para datasets grandes donde los usuarios necesitan retroalimentación inmediata.

```javascript
const loader = new GeoDataLoader(map, {
  strategy: 'progressive',
  progressive: {
    chunks: 10,
    delay: 100,
    priorityCenter: true
  }
});
```

#### Carga por Tiles
Ideal para datasets que pueden ser particionados espacialmente.

```javascript
const loader = new GeoDataLoader(map, {
  strategy: 'tile',
  tileSize: 512,
  viewport: {
    enabled: true,
    buffer: 0.5
  }
});
```

#### Carga por Viewport
Carga solo datos visibles en la vista actual del mapa.

```javascript
const loader = new GeoDataLoader(map, {
  strategy: 'viewport',
  viewport: {
    buffer: 0.2,
    debounce: 300,
    preload: true
  }
});
```

#### Carga por Stream
Para feeds de datos en tiempo real.

```javascript
const loader = new GeoDataLoader(map, {
  strategy: 'stream',
  maxFeatures: 50000
});
```

#### Carga con Clustering
Agrupa automáticamente datos de puntos densos.

```javascript
const loader = new GeoDataLoader(map, {
  strategy: 'cluster',
  clustering: {
    enabled: true,
    radius: 80,
    minZoom: 0,
    maxZoom: 16
  }
});
```

### Referencia API

#### Constructor

```typescript
new GeoDataLoader(map: L.Map, options?: LoaderOptions)
```

#### Métodos

| Método | Descripción | Retorna |
|--------|-------------|---------|
| `load(config)` | Cargar dataset con configuración especificada | `Promise<LoadResult>` |
| `unload(datasetId)` | Remover dataset del mapa y cache | `Promise<void>` |
| `cancel()` | Cancelar operación de carga actual | `void` |
| `setStrategy(strategy)` | Cambiar estrategia de carga | `void` |
| `getMetrics()` | Obtener métricas de rendimiento | `PerformanceMetrics` |
| `clearCache()` | Limpiar todos los datos en cache | `void` |
| `destroy()` | Limpiar y liberar recursos | `void` |

#### Eventos

| Evento | Descripción | Datos |
|--------|-------------|-------|
| `loadstart` | Carga iniciada | `{ dataset: DatasetConfig }` |
| `loadprogress` | Actualización de progreso | `{ dataset, progress: LoadProgress }` |
| `loadend` | Carga completada | `{ dataset, result: LoadResult }` |
| `loaderror` | Carga fallida | `{ dataset, error: string }` |
| `memorywarning` | Uso de memoria alto | `{ metrics: PerformanceMetrics }` |

### Consejos de Rendimiento

1. **Usar estrategia apropiada** - Elegir según características de los datos
2. **Habilitar workers** - Configurar `workers: 4` o más para datasets grandes
3. **Configurar cache** - Ajustar `maxSizeMB` según memoria disponible
4. **Simplificar geometrías** - Habilitar `simplification` para polígonos complejos
5. **Limitar features** - Establecer límite razonable de `maxFeatures`
6. **Monitorear métricas** - Observar FPS y uso de memoria

### Soporte de Navegadores

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requiere soporte para Web Workers, Fetch API y ES2015.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

