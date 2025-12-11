import { EventBus } from './EventBus';

export type ResourceType = 'texture' | 'shader' | 'audio' | 'json' | 'binary';

export interface ResourceManifest {
  textures?: string[];
  shaders?: Array<{ vertex: string; fragment: string; name: string }>;
  audio?: string[];
  json?: string[];
}

export class ResourceManager {
  private _cache: Map<string, any> = new Map();
  private _loadingProgress: number = 0;
  private _totalResources: number = 0;
  private _loadedResources: number = 0;
  private _eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  async load<T>(type: ResourceType, url: string): Promise<T> {
    // Check cache first
    const cacheKey = `${type}:${url}`;
    if (this._cache.has(cacheKey)) {
      return this._cache.get(cacheKey);
    }

    // Simulate loading
    console.log(`Loading ${type}: ${url}`);
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock resource data
    let resource: any;
    switch (type) {
      case 'texture':
        resource = { width: 64, height: 64, url };
        break;
      case 'shader':
        resource = { vertex: 'mock vertex shader', fragment: 'mock fragment shader', name: url };
        break;
      case 'audio':
        resource = { duration: 10, url };
        break;
      case 'json':
        resource = { data: {}, url };
        break;
      case 'binary':
        resource = new ArrayBuffer(1024);
        break;
    }

    this._cache.set(cacheKey, resource);
    return resource;
  }

  get<T>(type: ResourceType, url: string): T | undefined {
    const cacheKey = `${type}:${url}`;
    return this._cache.get(cacheKey);
  }

  async preload(manifest: ResourceManifest): Promise<void> {
    const resources: Array<{ type: ResourceType, url: string }> = [];

    // Collect all resources from manifest
    if (manifest.textures) {
      resources.push(...manifest.textures.map(url => ({ type: 'texture' as ResourceType, url })));
    }
    if (manifest.shaders) {
      resources.push(...manifest.shaders.map(shader => ({ type: 'shader' as ResourceType, url: shader.name })));
    }
    if (manifest.audio) {
      resources.push(...manifest.audio.map(url => ({ type: 'audio' as ResourceType, url })));
    }
    if (manifest.json) {
      resources.push(...manifest.json.map(url => ({ type: 'json' as ResourceType, url })));
    }

    this._totalResources = resources.length;
    this._loadedResources = 0;

    // Load all resources in parallel
    await Promise.all(resources.map(async resource => {
      await this.load(resource.type, resource.url);
      this._loadedResources++;
      this._loadingProgress = this._loadedResources / this._totalResources;
    }));
  }

  unload(url: string): void {
    // Remove from cache
    for (const [key, value] of this._cache) {
      if (key.endsWith(url)) {
        this._cache.delete(key);
        break;
      }
    }
  }

  clear(): void {
    this._cache.clear();
    this._loadingProgress = 0;
    this._totalResources = 0;
    this._loadedResources = 0;
  }

  get loadingProgress(): number {
    return this._loadingProgress;
  }
}