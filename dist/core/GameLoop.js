export class GameLoop {
    constructor(eventBus) {
        this._isRunning = false;
        this._currentTime = 0;
        this._deltaTime = 0;
        this._fixedDeltaTime = 1000 / 60; // 16.67ms for 60 ticks/s
        this._fps = 0;
        this._lastFrameTime = 0;
        this._frameCount = 0;
        this._lastFpsUpdate = 0;
        this._requestId = null;
        this._eventBus = eventBus;
    }
    get isRunning() {
        return this._isRunning;
    }
    get currentTime() {
        return this._currentTime;
    }
    get deltaTime() {
        return this._deltaTime;
    }
    get fixedDeltaTime() {
        return this._fixedDeltaTime;
    }
    get fps() {
        return this._fps;
    }
    start() {
        if (this._isRunning)
            return;
        this._isRunning = true;
        this._lastFrameTime = performance.now();
        this._lastFpsUpdate = this._lastFrameTime;
        this._frameCount = 0;
        const gameLoop = (timestamp) => {
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
    stop() {
        if (!this._isRunning)
            return;
        this._isRunning = false;
        if (this._requestId !== null) {
            cancelAnimationFrame(this._requestId);
            this._requestId = null;
        }
    }
}
//# sourceMappingURL=GameLoop.js.map