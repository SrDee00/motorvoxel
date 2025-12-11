import { EventBus } from './EventBus';
export interface EngineConfig {
    renderDistance: number;
    fov: number;
    targetFps: number;
    enableVSync: boolean;
    chunkSizeX: number;
    chunkSizeY: number;
    chunkSizeZ: number;
    gravity: number;
    maxFallSpeed: number;
    serverTickRate: number;
    interpolationDelay: number;
    showDebugInfo: boolean;
    showChunkBorders: boolean;
    wireframeMode: boolean;
}
export declare const DEFAULT_CONFIG: EngineConfig;
export declare class ConfigManager {
    private _config;
    private _eventBus;
    constructor(eventBus: EventBus);
    get<T extends keyof EngineConfig>(key: T): EngineConfig[T];
    set<T extends keyof EngineConfig>(key: T, value: EngineConfig[T]): void;
    reset(): void;
    get all(): Readonly<EngineConfig>;
}
