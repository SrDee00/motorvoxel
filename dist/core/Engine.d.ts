import { EventBus } from './EventBus';
import { IEngineConfig, IMotorVoxel } from './types';
type IVoxelWorld = any;
type IRenderer = any;
type IPhysicsWorld = any;
type INetworkClient = any;
type IEntityManager = any;
export declare class Engine implements IMotorVoxel {
    private _config;
    private _gameLoop;
    private _eventBus;
    private _resourceManager;
    private _configManager;
    readonly world: IVoxelWorld;
    readonly renderer: IRenderer;
    readonly physics: IPhysicsWorld;
    readonly network: INetworkClient;
    readonly entities: IEntityManager;
    readonly events: EventBus;
    constructor();
    init(config: IEngineConfig): Promise<void>;
    start(): void;
    stop(): void;
    destroy(): void;
}
export {};
