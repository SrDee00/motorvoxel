import { GameLoop } from './GameLoop';
import { EventBus } from './EventBus';
import { ResourceManager } from './ResourceManager';
import { ConfigManager } from './Config';
export class Engine {
    constructor() {
        this._eventBus = new EventBus();
        this.events = this._eventBus;
        this._resourceManager = new ResourceManager(this._eventBus);
        this._configManager = new ConfigManager(this._eventBus);
    }
    async init(config) {
        this._config = config;
        // Initialize subsystems in dependency order
        this._gameLoop = new GameLoop(this._eventBus);
        // TODO: Initialize other subsystems
        // this.world = new VoxelWorld(...);
        // this.renderer = new Renderer(...);
        // this.physics = new PhysicsWorld(...);
        // this.network = new NetworkClient(...);
        // this.entities = new EntityManager(...);
        this._eventBus.emit('engine:init', undefined);
    }
    start() {
        this._gameLoop.start();
        this._eventBus.emit('engine:start', undefined);
    }
    stop() {
        this._gameLoop.stop();
        this._eventBus.emit('engine:stop', undefined);
    }
    destroy() {
        this.stop();
        // Cleanup subsystems
        this._eventBus.emit('engine:destroy', undefined);
    }
}
//# sourceMappingURL=Engine.js.map