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

  private _shaderProgram: WebGLProgram | null = null;
  private _chunkMeshes: Map<string, any> = new Map();
  private _entityMeshes: Map<number, any> = new Map();
  private _textures: Map<string, WebGLTexture> = new Map();
  private _projectionMatrix: Float32Array = new Float32Array(16);
  private _viewMatrix: Float32Array = new Float32Array(16);
  private _modelMatrix: Float32Array = new Float32Array(16);

  render(deltaTime: number): void {
    if (!this._gl || !this._isInitialized) return;

    this.clear();

    // Set up projection matrix
    const aspect = this._canvas ? this._canvas.width / this._canvas.height : 1;
    this._setupProjectionMatrix(aspect);

    // Set up view matrix (will be updated with camera position)
    this._setupViewMatrix();

    // Render chunks
    this._renderChunks();

    // Render entities
    this._renderEntities();
  }

  private _setupProjectionMatrix(aspect: number): void {
    // Perspective projection
    const fov = 75 * Math.PI / 180; // 75 degrees in radians
    const near = 0.1;
    const far = 1000.0;
    const f = 1.0 / Math.tan(fov / 2);

    this._projectionMatrix[0] = f / aspect;
    this._projectionMatrix[1] = 0;
    this._projectionMatrix[2] = 0;
    this._projectionMatrix[3] = 0;
    
    this._projectionMatrix[4] = 0;
    this._projectionMatrix[5] = f;
    this._projectionMatrix[6] = 0;
    this._projectionMatrix[7] = 0;
    
    this._projectionMatrix[8] = 0;
    this._projectionMatrix[9] = 0;
    this._projectionMatrix[10] = (far + near) / (near - far);
    this._projectionMatrix[11] = -1;
    
    this._projectionMatrix[12] = 0;
    this._projectionMatrix[13] = 0;
    this._projectionMatrix[14] = (2 * far * near) / (near - far);
    this._projectionMatrix[15] = 0;
  }

  private _setupViewMatrix(): void {
    // Simple view matrix - will be updated with camera
    // For now, just identity matrix
    for (let i = 0; i < 16; i++) {
      this._viewMatrix[i] = i % 5 === 0 ? 1 : 0;
    }
  }

  private _renderChunks(): void {
    if (!this._gl) return;

    const gl = this._gl;

    // Set up shader program
    if (!this._shaderProgram) {
      this._shaderProgram = this._createShaderProgram();
      if (!this._shaderProgram) return;
    }

    gl.useProgram(this._shaderProgram);

    // Set up matrices
    const uProjection = gl.getUniformLocation(this._shaderProgram, 'uProjection');
    const uView = gl.getUniformLocation(this._shaderProgram, 'uView');
    const uModel = gl.getUniformLocation(this._shaderProgram, 'uModel');

    if (uProjection) gl.uniformMatrix4fv(uProjection, false, this._projectionMatrix);
    if (uView) gl.uniformMatrix4fv(uView, false, this._viewMatrix);

    // Render each chunk
    for (const [coord, chunkMesh] of this._chunkMeshes) {
      if (chunkMesh && chunkMesh.isVisible) {
        // Set model matrix (chunk position)
        const position = this._parseChunkCoord(coord);
        this._setupModelMatrix(position[0], position[1], position[2]);
        if (uModel) gl.uniformMatrix4fv(uModel, false, this._modelMatrix);

        // Bind and draw mesh
        this._drawMesh(chunkMesh.mesh);
      }
    }
  }

  private _renderEntities(): void {
    if (!this._gl) return;

    const gl = this._gl;

    if (!this._shaderProgram) return;

    gl.useProgram(this._shaderProgram);

    // Set up matrices
    const uProjection = gl.getUniformLocation(this._shaderProgram, 'uProjection');
    const uView = gl.getUniformLocation(this._shaderProgram, 'uView');
    const uModel = gl.getUniformLocation(this._shaderProgram, 'uModel');

    if (uProjection) gl.uniformMatrix4fv(uProjection, false, this._projectionMatrix);
    if (uView) gl.uniformMatrix4fv(uView, false, this._viewMatrix);

    // Render each entity
    for (const [entityId, entityMesh] of this._entityMeshes) {
      if (entityMesh) {
        // Set model matrix (entity position)
        this._setupModelMatrix(
          entityMesh.position[0],
          entityMesh.position[1],
          entityMesh.position[2]
        );
        if (uModel) gl.uniformMatrix4fv(uModel, false, this._modelMatrix);

        // Bind and draw mesh
        this._drawMesh(entityMesh.mesh);
      }
    }
  }

  private _setupModelMatrix(x: number, y: number, z: number): void {
    // Simple model matrix - translation only for now
    this._modelMatrix[0] = 1; this._modelMatrix[1] = 0; this._modelMatrix[2] = 0; this._modelMatrix[3] = 0;
    this._modelMatrix[4] = 0; this._modelMatrix[5] = 1; this._modelMatrix[6] = 0; this._modelMatrix[7] = 0;
    this._modelMatrix[8] = 0; this._modelMatrix[9] = 0; this._modelMatrix[10] = 1; this._modelMatrix[11] = 0;
    this._modelMatrix[12] = x; this._modelMatrix[13] = y; this._modelMatrix[14] = z; this._modelMatrix[15] = 1;
  }

  private _drawMesh(mesh: any): void {
    if (!this._gl || !mesh) return;

    const gl = this._gl;

    // Bind vertex buffer
    if (mesh.vertexBuffer) {
      gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vertexBuffer);
      
      // Set up position attribute
      const positionAttr = gl.getAttribLocation(this._shaderProgram!, 'aPosition');
      if (positionAttr !== -1) {
        gl.enableVertexAttribArray(positionAttr);
        gl.vertexAttribPointer(positionAttr, 3, gl.FLOAT, false, 0, 0);
      }
    }

    // Draw
    if (mesh.indexBuffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indexBuffer);
      gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
    }
  }

  private _createShaderProgram(): WebGLProgram | null {
    if (!this._gl) return null;

    const gl = this._gl;

    // Vertex shader
    const vsSource = `
      attribute vec3 aPosition;
      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform mat4 uModel;
      
      void main() {
        gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
      }
    `;

    // Fragment shader
    const fsSource = `
      precision mediump float;
      
      void main() {
        gl_FragColor = vec4(0.8, 0.7, 0.6, 1.0); // Simple color for now
      }
    `;

    const vertexShader = this._compileShader(gl.VERTEX_SHADER, vsSource);
    const fragmentShader = this._compileShader(gl.FRAGMENT_SHADER, fsSource);

    if (!vertexShader || !fragmentShader) return null;

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) return null;

    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error('Shader program linking error:', gl.getProgramInfoLog(shaderProgram));
      return null;
    }

    return shaderProgram;
  }

  private _compileShader(type: number, source: string): WebGLShader | null {
    if (!this._gl) return null;

    const gl = this._gl;
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private _parseChunkCoord(coord: string): [number, number, number] {
    const parts = coord.split(',').map(Number);
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
  }

  // Add methods to manage meshes
  addChunkMesh(coord: string, mesh: any): void {
    this._chunkMeshes.set(coord, mesh);
  }

  removeChunkMesh(coord: string): void {
    this._chunkMeshes.delete(coord);
  }

  addEntityMesh(entityId: number, mesh: any): void {
    this._entityMeshes.set(entityId, mesh);
  }

  removeEntityMesh(entityId: number): void {
    this._entityMeshes.delete(entityId);
  }

  updateCameraPosition(position: Float32Array, target: Float32Array): void {
    // Update view matrix based on camera position and target
    // This is a simplified version - a real implementation would use lookAt
    const zAxis = this._vec3_normalize(this._vec3_subtract(this._vec3_create(), position, target));
    const xAxis = this._vec3_normalize(this._vec3_cross(this._vec3_create(), this._vec3_create(0, 1, 0), zAxis));
    const yAxis = this._vec3_normalize(this._vec3_cross(this._vec3_create(), zAxis, xAxis));

    // Create view matrix
    this._viewMatrix[0] = xAxis[0]; this._viewMatrix[1] = yAxis[0]; this._viewMatrix[2] = zAxis[0]; this._viewMatrix[3] = 0;
    this._viewMatrix[4] = xAxis[1]; this._viewMatrix[5] = yAxis[1]; this._viewMatrix[6] = zAxis[1]; this._viewMatrix[7] = 0;
    this._viewMatrix[8] = xAxis[2]; this._viewMatrix[9] = yAxis[2]; this._viewMatrix[10] = zAxis[2]; this._viewMatrix[11] = 0;
    this._viewMatrix[12] = -this._vec3_dot(xAxis, position);
    this._viewMatrix[13] = -this._vec3_dot(yAxis, position);
    this._viewMatrix[14] = -this._vec3_dot(zAxis, position);
    this._viewMatrix[15] = 1;
  }

  // Helper vector math functions
  private _vec3_normalize(v: Float32Array): Float32Array {
    const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    if (len > 0) {
      v[0] /= len; v[1] /= len; v[2] /= len;
    }
    return v;
  }

  private _vec3_subtract(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
    out[0] = a[0] - b[0]; out[1] = a[1] - b[1]; out[2] = a[2] - b[2];
    return out;
  }

  private _vec3_cross(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
    out[0] = a[1]*b[2] - a[2]*b[1];
    out[1] = a[2]*b[0] - a[0]*b[2];
    out[2] = a[0]*b[1] - a[1]*b[0];
    return out;
  }

  private _vec3_dot(a: Float32Array, b: Float32Array): number {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  }

  private _vec3_create(x: number = 0, y: number = 0, z: number = 0): Float32Array {
    return new Float32Array([x, y, z]);
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