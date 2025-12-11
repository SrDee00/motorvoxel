import { EventBus } from './EventBus';

export interface EngineConfig {
  // Rendering
  renderDistance: number;
  fov: number;
  targetFps: number;
  enableVSync: boolean;

  // World
  chunkSizeX: number;
  chunkSizeY: number;
  chunkSizeZ: number;

  // Physics
  gravity: number;
  maxFallSpeed: number;

  // Network
  serverTickRate: number;
  interpolationDelay: number;

  // Debug
  showDebugInfo: boolean;
  showChunkBorders: boolean;
  wireframeMode: boolean;
}

export const DEFAULT_CONFIG: EngineConfig = {
  renderDistance: 8,
  fov: 70,
  targetFps: 60,
  enableVSync: true,
  chunkSizeX: 16,
  chunkSizeY: 256,
  chunkSizeZ: 16,
  gravity: -20,
  maxFallSpeed: -50,
  serverTickRate: 20,
  interpolationDelay: 100,
  showDebugInfo: false,
  showChunkBorders: false,
  wireframeMode: false,
};

export class ConfigManager {
  private _config: EngineConfig;
  private _eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
    this._config = { ...DEFAULT_CONFIG };
  }

  get<T extends keyof EngineConfig>(key: T): EngineConfig[T] {
    return this._config[key];
  }

  set<T extends keyof EngineConfig>(key: T, value: EngineConfig[T]): void {
    this._config[key] = value;
    this._eventBus.emit('config:changed', { key, value });
  }

  reset(): void {
    this._config = { ...DEFAULT_CONFIG };
    this._eventBus.emit('config:reset', undefined as any);
  }

  get all(): Readonly<EngineConfig> {
    return this._config;
  }
}