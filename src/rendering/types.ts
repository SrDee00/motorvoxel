export interface IRenderer {
  init(canvas: HTMLCanvasElement): Promise<void>;
  destroy(): void;

  readonly isInitialized: boolean;
  readonly webglContext: WebGLRenderingContext | null;
  readonly canvas: HTMLCanvasElement | null;

  clear(): void;
  render(deltaTime: number): void;
  resize(width: number, height: number): void;
}

export interface IShader {
  readonly program: WebGLProgram;
  readonly vertexShader: WebGLShader;
  readonly fragmentShader: WebGLShader;

  use(): void;
  setUniform(name: string, value: any): void;
}

export interface IShaderManager {
  loadShader(name: string, vertexSource: string, fragmentSource: string): Promise<IShader>;
  getShader(name: string): IShader | undefined;
  createShaderProgram(vertexSource: string, fragmentSource: string): WebGLProgram;
}

export interface ITexture {
  readonly texture: WebGLTexture;
  readonly width: number;
  readonly height: number;

  bind(unit: number): void;
  unbind(): void;
}

export interface ITextureAtlas {
  addTexture(name: string, image: HTMLImageElement): void;
  getUVCoordinates(name: string): [number, number, number, number] | undefined;
  bind(unit: number): void;
}

export interface ICamera {
  position: [number, number, number];
  rotation: [number, number, number];
  fov: number;
  near: number;
  far: number;

  getViewMatrix(): Float32Array;
  getProjectionMatrix(width: number, height: number): Float32Array;
  update(): void;
}

export interface IMesh {
  readonly vertexBuffer: WebGLBuffer;
  readonly indexBuffer: WebGLBuffer | null;
  readonly vertexCount: number;
  readonly indexCount: number | null;

  render(): void;
  updateVertices(vertices: Float32Array): void;
  updateIndices(indices: Uint16Array): void;
}

export interface IChunkMesh {
  readonly mesh: IMesh;
  readonly chunkCoord: [number, number, number];
  readonly isVisible: boolean;

  updateFromChunk(chunk: any): void;
  render(): void;
}

export interface IRenderPipeline {
  addChunkMesh(mesh: IChunkMesh): void;
  removeChunkMesh(coord: [number, number, number]): void;
  render(deltaTime: number): void;
  updateVisibility(camera: ICamera): void;
}

export interface IRendererConfig {
  clearColor: [number, number, number, number];
  wireframeMode: boolean;
  fogEnabled: boolean;
  fogColor: [number, number, number];
  fogDensity: number;
  ambientLight: [number, number, number];
}