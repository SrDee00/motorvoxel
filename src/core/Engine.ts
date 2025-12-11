import { GameLoop } from './GameLoop';
import { EventBus } from './EventBus';
import { ResourceManager } from './ResourceManager';
import { ConfigManager } from './Config';
import { IEngineConfig, IMotorVoxel } from './types';
// TODO: Remove these imports once other modules are implemented
type IVoxelWorld = any;
type IRenderer = any;
type IPhysicsWorld = any;
type INetworkClient = any;
type IEntityManager = any;

export class Engine implements IMotorVoxel {
  private _config!: IEngineConfig;
  private _gameLoop!: GameLoop;
  private _eventBus: EventBus;
  private _resourceManager: ResourceManager;
  private _configManager: ConfigManager;

  // Subsystems
  public readonly world: IVoxelWorld;
  public readonly renderer: IRenderer;
  public readonly physics: IPhysicsWorld;
  public readonly network: INetworkClient;
  public readonly entities: IEntityManager;
  public readonly events: EventBus;

  constructor() {
    this._eventBus = new EventBus();
    this.events = this._eventBus;
    this._resourceManager = new ResourceManager(this._eventBus);
    this._configManager = new ConfigManager(this._eventBus);
  }

  async init(config: IEngineConfig): Promise<void> {
    this._config = config;

    // Initialize subsystems in dependency order
    this._gameLoop = new GameLoop(this._eventBus);

    // TODO: Initialize other subsystems
    // this.world = new VoxelWorld(...);
    // this.renderer = new Renderer(...);
    // this.physics = new PhysicsWorld(...);
    // this.network = new NetworkClient(...);
    // this.entities = new EntityManager(...);

    this._eventBus.emit('engine:init', undefined as any);
  }

  start(): void {
    this._gameLoop.start();
    this._eventBus.emit('engine:start', undefined as any);
  }

  stop(): void {
    this._gameLoop.stop();
    this._eventBus.emit('engine:stop', undefined as any);
  }

  destroy(): void {
    this.stop();
    // Cleanup subsystems
    this._eventBus.emit('engine:destroy', undefined as any);
  }
}