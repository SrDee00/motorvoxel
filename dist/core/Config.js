export const DEFAULT_CONFIG = {
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
    constructor(eventBus) {
        this._eventBus = eventBus;
        this._config = { ...DEFAULT_CONFIG };
    }
    get(key) {
        return this._config[key];
    }
    set(key, value) {
        this._config[key] = value;
        this._eventBus.emit('config:changed', { key, value });
    }
    reset() {
        this._config = { ...DEFAULT_CONFIG };
        this._eventBus.emit('config:reset', undefined);
    }
    get all() {
        return this._config;
    }
}
//# sourceMappingURL=Config.js.map