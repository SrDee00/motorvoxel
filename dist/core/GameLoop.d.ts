import { EventBus } from './EventBus';
import { IGameLoop } from './types';
export declare class GameLoop implements IGameLoop {
    private _isRunning;
    private _currentTime;
    private _deltaTime;
    private _fixedDeltaTime;
    private _fps;
    private _lastFrameTime;
    private _frameCount;
    private _lastFpsUpdate;
    private _requestId;
    private _eventBus;
    constructor(eventBus: EventBus);
    get isRunning(): boolean;
    get currentTime(): number;
    get deltaTime(): number;
    get fixedDeltaTime(): number;
    get fps(): number;
    start(): void;
    stop(): void;
}
