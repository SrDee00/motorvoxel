import { EventBus } from './EventBus';
export type ResourceType = 'texture' | 'shader' | 'audio' | 'json' | 'binary';
export interface ResourceManifest {
    textures?: string[];
    shaders?: Array<{
        vertex: string;
        fragment: string;
        name: string;
    }>;
    audio?: string[];
    json?: string[];
}
export declare class ResourceManager {
    private _cache;
    private _loadingProgress;
    private _totalResources;
    private _loadedResources;
    private _eventBus;
    constructor(eventBus: EventBus);
    load<T>(type: ResourceType, url: string): Promise<T>;
    get<T>(type: ResourceType, url: string): T | undefined;
    preload(manifest: ResourceManifest): Promise<void>;
    unload(url: string): void;
    clear(): void;
    get loadingProgress(): number;
}
