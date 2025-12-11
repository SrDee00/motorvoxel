export class ResourceManager {
    constructor(eventBus) {
        this._cache = new Map();
        this._loadingProgress = 0;
        this._totalResources = 0;
        this._loadedResources = 0;
        this._eventBus = eventBus;
    }
    async load(type, url) {
        // Check cache first
        const cacheKey = `${type}:${url}`;
        if (this._cache.has(cacheKey)) {
            return this._cache.get(cacheKey);
        }
        // Simulate loading
        console.log(`Loading ${type}: ${url}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        // Mock resource data
        let resource;
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
    get(type, url) {
        const cacheKey = `${type}:${url}`;
        return this._cache.get(cacheKey);
    }
    async preload(manifest) {
        const resources = [];
        // Collect all resources from manifest
        if (manifest.textures) {
            resources.push(...manifest.textures.map(url => ({ type: 'texture', url })));
        }
        if (manifest.shaders) {
            resources.push(...manifest.shaders.map(shader => ({ type: 'shader', url: shader.name })));
        }
        if (manifest.audio) {
            resources.push(...manifest.audio.map(url => ({ type: 'audio', url })));
        }
        if (manifest.json) {
            resources.push(...manifest.json.map(url => ({ type: 'json', url })));
        }
        this._totalResources = resources.length;
        this._loadedResources = 0;
        // Load all resources in parallel
        await Promise.all(resources.map(async (resource) => {
            await this.load(resource.type, resource.url);
            this._loadedResources++;
            this._loadingProgress = this._loadedResources / this._totalResources;
        }));
    }
    unload(url) {
        // Remove from cache
        for (const [key, value] of this._cache) {
            if (key.endsWith(url)) {
                this._cache.delete(key);
                break;
            }
        }
    }
    clear() {
        this._cache.clear();
        this._loadingProgress = 0;
        this._totalResources = 0;
        this._loadedResources = 0;
    }
    get loadingProgress() {
        return this._loadingProgress;
    }
}
//# sourceMappingURL=ResourceManager.js.map