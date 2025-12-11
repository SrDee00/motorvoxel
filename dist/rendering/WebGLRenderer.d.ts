import { IRenderer, IRendererConfig } from './types';
export declare class WebGLRenderer implements IRenderer {
    private _canvas;
    private _gl;
    private _isInitialized;
    private _config;
    init(canvas: HTMLCanvasElement): Promise<void>;
    destroy(): void;
    clear(): void;
    render(deltaTime: number): void;
    resize(width: number, height: number): void;
    get isInitialized(): boolean;
    get webglContext(): WebGLRenderingContext | null;
    get canvas(): HTMLCanvasElement | null;
    get config(): IRendererConfig;
    setConfig(config: Partial<IRendererConfig>): void;
}
