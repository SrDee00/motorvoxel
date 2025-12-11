export type BlockId = number;
export interface IEngineConfig {
    canvas: HTMLCanvasElement;
    renderer: 'webgl2' | 'webgpu';
    network?: {
        serverUrl: string;
        protocol: 'websocket' | 'webtransport';
    };
    world?: {
        chunkSize: [number, number, number];
        viewDistance: number;
    };
    debug?: boolean;
}
export interface IMotorVoxel {
    init(config: IEngineConfig): Promise<void>;
    start(): void;
    stop(): void;
    destroy(): void;
    readonly world: any;
    readonly renderer: any;
    readonly physics: any;
    readonly network: any;
    readonly entities: any;
    readonly events: any;
}
export interface IGameLoop {
    readonly isRunning: boolean;
    readonly currentTime: number;
    readonly deltaTime: number;
    readonly fixedDeltaTime: number;
    readonly fps: number;
    start(): void;
    stop(): void;
}
export interface EngineEvents {
    'engine:init': void;
    'engine:start': void;
    'engine:stop': void;
    'engine:destroy': void;
    'loop:update': {
        deltaTime: number;
        time: number;
    };
    'loop:fixedUpdate': {
        fixedDeltaTime: number;
        time: number;
    };
    'loop:render': {
        deltaTime: number;
        interpolation: number;
    };
    'config:changed': {
        key: string;
        value: any;
    };
    'config:reset': void;
    'chunk:loaded': {
        x: number;
        y: number;
        z: number;
    };
    'chunk:unloaded': {
        x: number;
        y: number;
        z: number;
    };
    'block:changed': {
        x: number;
        y: number;
        z: number;
        oldType: BlockId;
        newType: BlockId;
    };
}
export type Vec3 = Float32Array;
export type Vec2 = Float32Array;
export type Mat4 = Float32Array;
export type Quat = Float32Array;
export interface ChunkCoord {
    readonly cx: number;
    readonly cy: number;
    readonly cz: number;
}
export interface LocalCoord {
    readonly lx: number;
    readonly ly: number;
    readonly lz: number;
}
