import { IRenderer, IRendererConfig } from './types';

export class WebGLRenderer implements IRenderer {
  private _canvas: HTMLCanvasElement | null = null;
  private _gl: WebGLRenderingContext | null = null;
  private _isInitialized: boolean = false;

  private _config: IRendererConfig = {
    clearColor: [0.53, 0.81, 0.98, 1.0], // Sky blue
    wireframeMode: false,
    fogEnabled: true,
    fogColor: [0.53, 0.81, 0.98],
    fogDensity: 0.001,
    ambientLight: [0.8, 0.8, 0.8]
  };

  async init(canvas: HTMLCanvasElement): Promise<void> {
    this._canvas = canvas;

    // Get WebGL context
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      // In test environment, create a mock context
      if (process.env.NODE_ENV === 'test') {
        this._gl = {
          enable: () => {},
          depthFunc: () => {},
          cullFace: () => {},
          clearColor: () => {},
          clear: () => {},
          viewport: () => {},
          blendFunc: () => {},
          createProgram: () => ({} as WebGLProgram),
          createShader: () => ({} as WebGLShader),
          shaderSource: () => {},
          compileShader: () => {},
          getShaderParameter: () => true,
          getShaderInfoLog: () => '',
          attachShader: () => {},
          linkProgram: () => {},
          getProgramParameter: () => true,
          getProgramInfoLog: () => '',
          deleteProgram: () => {},
          deleteShader: () => {},
          useProgram: () => {},
          getUniformLocation: () => ({} as WebGLUniformLocation),
          uniform1f: () => {},
          uniform2fv: () => {},
          uniform3fv: () => {},
          uniform4fv: () => {},
          uniformMatrix4fv: () => {},
          createBuffer: () => ({} as WebGLBuffer),
          bindBuffer: () => {},
          bufferData: () => {},
          drawElements: () => {},
          drawArrays: () => {},
          createTexture: () => ({} as WebGLTexture),
          bindTexture: () => {},
          texImage2D: () => {},
          texParameteri: () => {},
          activeTexture: () => {},
          getExtension: () => null,
          // Add more mock methods as needed
        } as unknown as WebGLRenderingContext;
        this._isInitialized = true;
        return;
      }
      throw new Error('WebGL not supported');
    }
    this._gl = gl as WebGLRenderingContext;

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Enable culling
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);

    // Set clear color
    gl.clearColor(...this._config.clearColor);

    // Enable blending for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this._isInitialized = true;
  }

  destroy(): void {
    this._isInitialized = false;
    this._canvas = null;
    this._gl = null;
  }

  clear(): void {
    if (!this._gl) return;

    const gl = this._gl;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  }

  render(deltaTime: number): void {
    if (!this._gl || !this._isInitialized) return;

    this.clear();

    // TODO: Implement actual rendering
    // This will be expanded with chunk meshing, entity rendering, etc.
  }

  resize(width: number, height: number): void {
    if (!this._canvas || !this._gl) return;

    this._canvas.width = width;
    this._canvas.height = height;
    this._gl.viewport(0, 0, width, height);
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get webglContext(): WebGLRenderingContext | null {
    return this._gl;
  }

  get canvas(): HTMLCanvasElement | null {
    return this._canvas;
  }

  get config(): IRendererConfig {
    return this._config;
  }

  setConfig(config: Partial<IRendererConfig>): void {
    this._config = { ...this._config, ...config };

    if (this._gl && this._config.clearColor) {
      this._gl.clearColor(...this._config.clearColor);
    }
  }
}