import { EventBus } from './EventBus';
import { IGameLoop } from './types';

export class GameLoop implements IGameLoop {
  private _isRunning: boolean = false;
  private _currentTime: number = 0;
  private _deltaTime: number = 0;
  private _fixedDeltaTime: number = 1000 / 60; // 16.67ms for 60 ticks/s
  private _fps: number = 0;
  private _lastFrameTime: number = 0;
  private _frameCount: number = 0;
  private _lastFpsUpdate: number = 0;

  private _requestId: number | null = null;
  private _eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get currentTime(): number {
    return this._currentTime;
  }

  get deltaTime(): number {
    return this._deltaTime;
  }

  get fixedDeltaTime(): number {
    return this._fixedDeltaTime;
  }

  get fps(): number {
    return this._fps;
  }

  start(): void {
    if (this._isRunning) return;

    this._isRunning = true;
    this._lastFrameTime = performance.now();
    this._lastFpsUpdate = this._lastFrameTime;
    this._frameCount = 0;

    const gameLoop = (timestamp: number) => {
      this._currentTime = timestamp;
      this._deltaTime = timestamp - this._lastFrameTime;
      this._lastFrameTime = timestamp;

      // Update FPS counter
      this._frameCount++;
      if (timestamp - this._lastFpsUpdate >= 1000) {
        this._fps = this._frameCount;
        this._frameCount = 0;
        this._lastFpsUpdate = timestamp;
      }

      // Emit update events
      this._eventBus.emit('loop:update', {
        deltaTime: this._deltaTime,
        time: this._currentTime
      });

      // Emit render event
      this._eventBus.emit('loop:render', {
        deltaTime: this._deltaTime,
        interpolation: 0 // TODO: Calculate proper interpolation factor
      });

      if (this._isRunning) {
        this._requestId = requestAnimationFrame(gameLoop);
      }
    };

    this._requestId = requestAnimationFrame(gameLoop);
  }

  stop(): void {
    if (!this._isRunning) return;

    this._isRunning = false;
    if (this._requestId !== null) {
      cancelAnimationFrame(this._requestId);
      this._requestId = null;
    }
  }
}