# Rendering

Sistema de renderização para visualização do mundo voxelizado, incluindo meshing, shaders, câmera e pipeline de rendering.

## Purpose

O sistema de rendering é responsável por:
- Geração de mesh a partir de dados voxel (meshing)
- Pipeline de renderização WebGL2/WebGPU
- Sistema de câmera (primeira/terceira pessoa)
- Shaders para blocos, entidades e efeitos
- Otimizações de performance (culling, batching)

## Pipeline de Rendering

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRAME PIPELINE                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. UPDATE PHASE                                                  │
│     ├─→ Camera update                                             │
│     ├─→ Frustum calculation                                       │
│     └─→ Visibility determination                                  │
│                                                                   │
│  2. MESH PHASE (async em workers)                                 │
│     ├─→ Process dirty chunks                                      │
│     ├─→ Generate mesh data                                        │
│     └─→ Upload to GPU buffers                                     │
│                                                                   │
│  3. RENDER PHASE                                                  │
│     ├─→ Clear buffers                                             │
│     ├─→ Render skybox                                             │
│     ├─→ Render opaque chunks (front-to-back)                      │
│     ├─→ Render entities                                           │
│     ├─→ Render transparent chunks (back-to-front)                 │
│     ├─→ Render UI/HUD                                             │
│     └─→ Post-processing (optional)                                │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Requirement: Mesh Generation System

The system SHALL implementar geração de mesh eficiente a partir de dados voxel usando greedy meshing.

```typescript
interface IMeshGenerator {
  // Gera mesh para um chunk
  generateMesh(chunk: IChunk, neighbors: ChunkNeighbors): ChunkMeshData;
  
  // Configuração
  setTextureAtlas(atlas: ITextureAtlas): void;
  setBlockRegistry(registry: IBlockRegistry): void;
}

interface ChunkNeighbors {
  north?: IChunk;   // +Z
  south?: IChunk;   // -Z
  east?: IChunk;    // +X
  west?: IChunk;    // -X
  top?: IChunk;     // +Y (se chunks verticais)
  bottom?: IChunk;  // -Y
}

interface ChunkMeshData {
  // Malha de blocos opacos
  opaqueVertices: Float32Array;   // [x, y, z, u, v, normalIndex, ao]
  opaqueIndices: Uint32Array;
  
  // Malha de blocos transparentes (água, vidro)
  transparentVertices: Float32Array;
  transparentIndices: Uint32Array;
  
  // Metadados
  vertexCount: number;
  triangleCount: number;
  isEmpty: boolean;
}

// Formato de vértice otimizado (28 bytes por vértice, ou menos com packing)
interface PackedVertex {
  position: [number, number, number];  // 12 bytes
  uv: [number, number];                 // 8 bytes
  normalAO: number;                     // 4 bytes (packed: normal 3 bits, AO 2 bits)
  blockData: number;                    // 4 bytes (block type, face, etc.)
}
```

#### Scenario: Greedy meshing combines faces
- **WHEN** multiple adjacent blocks have same type and face orientation
- **THEN** faces SHALL be merged into larger quads
- **AND** vertex count SHALL be reduced significantly

#### Scenario: Face culling for hidden faces
- **WHEN** two solid opaque blocks are adjacent
- **THEN** shared face SHALL NOT be included in mesh
- **AND** only exterior faces SHALL be rendered

#### Scenario: Neighbor chunk boundary
- **WHEN** generating mesh near chunk edge
- **THEN** neighbor chunk data SHALL be consulted
- **AND** faces at boundary SHALL be correctly culled

#### Scenario: Transparent block handling
- **WHEN** transparent blocks are present
- **THEN** separate transparent mesh SHALL be generated
- **AND** faces between transparent blocks of same type MAY be culled
- **AND** faces between different transparency levels SHALL NOT be culled

---

### Requirement: Ambient Occlusion

The system SHALL calcular ambient occlusion por vértice para melhor qualidade visual.

```typescript
// AO é calculado baseado nos 8 blocos ao redor de cada vértice
// Valores: 0 (totalmente escuro) a 3 (sem oclusão)

function calculateVertexAO(
  side1: boolean,   // Bloco lateral 1 é sólido
  side2: boolean,   // Bloco lateral 2 é sólido
  corner: boolean   // Bloco na diagonal é sólido
): number {
  if (side1 && side2) return 0;  // Canto totalmente ocluído
  return 3 - (side1 ? 1 : 0) - (side2 ? 1 : 0) - (corner ? 1 : 0);
}

// AO influencia a cor do vértice
const AO_CURVE = [0.5, 0.7, 0.85, 1.0];  // Multiplicadores por nível
```

#### Scenario: Corner occlusion
- **WHEN** vertex is in corner with surrounding solid blocks
- **THEN** AO value SHALL be minimum (darkest)

#### Scenario: AO smoothing
- **WHEN** mesh is rendered
- **THEN** AO SHALL be interpolated smoothly across faces
- **AND** block edges SHALL have natural shadowing

---

### Requirement: Texture Atlas

The system SHALL usar atlas de texturas para minimizar trocas de textura durante renderização.

```typescript
interface ITextureAtlas {
  readonly texture: WebGLTexture | GPUTexture;
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;      // Pixels por tile (ex: 16)
  readonly tilesPerRow: number;
  
  // Obtém coordenadas UV para uma textura
  getUV(textureName: string): TextureUV;
  
  // Adiciona textura ao atlas
  addTexture(name: string, imageData: ImageData): void;
  
  // Rebuild atlas
  rebuild(): Promise<void>;
}

interface TextureUV {
  u0: number;  // Left
  v0: number;  // Top
  u1: number;  // Right
  v1: number;  // Bottom
}

// Configuração padrão
const ATLAS_SIZE = 256;      // 256x256 pixels
const TILE_SIZE = 16;        // 16x16 pixels por bloco
const TILES_PER_ROW = 16;    // 16 tiles por linha = 256 texturas
```

#### Scenario: UV calculation
- **WHEN** mesh is generated for a block type
- **THEN** correct UV coordinates SHALL be calculated from atlas
- **AND** UVs SHALL include small padding to avoid bleeding

#### Scenario: Atlas packing
- **WHEN** textures are added to atlas
- **THEN** textures SHALL be efficiently packed
- **AND** atlas texture SHALL be updated on GPU

---

### Requirement: Renderer Interface

The system SHALL fornecer uma interface abstrata de renderização que suporte WebGL2 e WebGPU.

```typescript
interface IRenderer {
  readonly backend: 'webgl2' | 'webgpu';
  readonly canvas: HTMLCanvasElement;
  readonly width: number;
  readonly height: number;
  
  // Inicialização
  init(): Promise<void>;
  resize(width: number, height: number): void;
  
  // Frame rendering
  beginFrame(): void;
  endFrame(): void;
  
  // Chunk rendering
  renderChunk(mesh: ChunkMeshBuffer, transform: Mat4): void;
  
  // Entity rendering
  renderEntity(mesh: EntityMesh, transform: Mat4): void;
  
  // Environment
  renderSkybox(camera: ICamera): void;
  
  // Debug
  renderDebugLines(lines: DebugLine[]): void;
  renderDebugText(text: string, x: number, y: number): void;
  
  // State
  setCamera(camera: ICamera): void;
  setAmbientLight(color: Vec3, intensity: number): void;
  setDirectionalLight(direction: Vec3, color: Vec3, intensity: number): void;
  setFogSettings(nearDistance: number, farDistance: number, color: Vec3): void;
}

interface ChunkMeshBuffer {
  readonly vao: WebGLVertexArrayObject | GPURenderPipeline;
  readonly vertexBuffer: WebGLBuffer | GPUBuffer;
  readonly indexBuffer: WebGLBuffer | GPUBuffer;
  readonly indexCount: number;
  readonly chunkCoord: ChunkCoord;
}
```

#### Scenario: WebGL2 initialization
- **WHEN** renderer is initialized with WebGL2 backend
- **THEN** WebGL2 context SHALL be created
- **AND** required extensions SHALL be enabled
- **AND** default shaders SHALL be compiled

#### Scenario: Frame rendering
- **WHEN** frame is rendered
- **THEN** all visible chunks SHALL be drawn
- **AND** draw calls SHALL be minimized via batching

#### Scenario: Resize handling
- **WHEN** canvas is resized
- **THEN** viewport SHALL be updated
- **AND** projection matrix SHALL be recalculated

---

### Requirement: Camera System

The system SHALL fornecer câmeras configuráveis para primeira e terceira pessoa.

```typescript
interface ICamera {
  readonly position: Vec3;
  readonly rotation: Quat;
  readonly forward: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  
  // Matrizes
  readonly viewMatrix: Mat4;
  readonly projectionMatrix: Mat4;
  readonly viewProjectionMatrix: Mat4;
  
  // Frustum para culling
  readonly frustum: Frustum;
  
  // Configuração
  setPosition(x: number, y: number, z: number): void;
  setRotation(yaw: number, pitch: number): void;
  lookAt(target: Vec3): void;
  
  // Projeção
  setPerspective(fov: number, aspect: number, near: number, far: number): void;
  
  // Update
  update(): void;
}

interface IFirstPersonCamera extends ICamera {
  readonly yaw: number;     // Rotação horizontal
  readonly pitch: number;   // Rotação vertical (limitada)
  
  rotate(deltaYaw: number, deltaPitch: number): void;
}

interface IThirdPersonCamera extends ICamera {
  readonly target: Vec3;
  readonly distance: number;
  readonly minDistance: number;
  readonly maxDistance: number;
  
  setTarget(target: Vec3): void;
  setDistance(distance: number): void;
  zoom(delta: number): void;
}

interface Frustum {
  readonly planes: FrustumPlane[];
  containsPoint(point: Vec3): boolean;
  containsAABB(aabb: AABB): FrustumResult;
  containsSphere(center: Vec3, radius: number): FrustumResult;
}

type FrustumResult = 'inside' | 'outside' | 'intersect';
```

#### Scenario: First person look
- **WHEN** mouse moves in first person mode
- **THEN** camera yaw and pitch SHALL update
- **AND** pitch SHALL be clamped to prevent flipping

#### Scenario: Third person orbit
- **WHEN** in third person mode
- **THEN** camera SHALL orbit around target
- **AND** distance SHALL be adjustable via scroll

#### Scenario: Frustum culling
- **WHEN** chunk is outside camera frustum
- **THEN** chunk SHALL NOT be rendered
- **AND** frustum test SHALL be efficient (early out)

---

### Requirement: Shader System

The system SHALL fornecer shaders otimizados para renderização de voxels.

```typescript
interface IShaderManager {
  load(name: string, vertexSource: string, fragmentSource: string): IShader;
  get(name: string): IShader | undefined;
  
  // Shaders padrão
  readonly chunk: IShader;
  readonly entity: IShader;
  readonly skybox: IShader;
  readonly debug: IShader;
}

interface IShader {
  readonly program: WebGLProgram;
  
  use(): void;
  
  // Uniforms
  setUniformMatrix4(name: string, matrix: Mat4): void;
  setUniformVec3(name: string, vec: Vec3): void;
  setUniformFloat(name: string, value: number): void;
  setUniformInt(name: string, value: number): void;
  setUniformTexture(name: string, texture: WebGLTexture, unit: number): void;
}

// Shaders padrão esperados
const CHUNK_SHADER_UNIFORMS = {
  uViewProjection: 'mat4',
  uModel: 'mat4',
  uTextureAtlas: 'sampler2D',
  uAmbientLight: 'vec3',
  uSunDirection: 'vec3',
  uSunColor: 'vec3',
  uFogNear: 'float',
  uFogFar: 'float',
  uFogColor: 'vec3',
  uTime: 'float',
};
```

#### Scenario: Chunk shader lighting
- **WHEN** chunk is rendered
- **THEN** ambient and directional lighting SHALL be applied
- **AND** vertex colors from AO SHALL be multiplied with lighting

#### Scenario: Fog application
- **WHEN** fragments are far from camera
- **THEN** fog SHALL blend fragment color toward fog color
- **AND** transition SHALL be smooth based on distance

---

### Requirement: Mesh Worker Pool

The system SHALL realizar meshing em Web Workers para evitar travamentos na thread principal.

```typescript
interface IMeshWorkerPool {
  readonly workerCount: number;
  readonly pendingJobs: number;
  
  // Submete chunk para processamento
  submitChunk(
    chunk: IChunk,
    neighbors: ChunkNeighbors,
    priority: number
  ): Promise<ChunkMeshData>;
  
  // Cancela jobs pendentes para um chunk
  cancelChunk(coord: ChunkCoord): void;
  
  // Limpa todos os jobs
  clear(): void;
}

// Mensagem para o worker
interface MeshWorkerMessage {
  type: 'generate' | 'cancel';
  chunkCoord: ChunkCoord;
  chunkData: ArrayBuffer;        // Transferable
  neighborData: ArrayBuffer[];   // Transferable
  blockRegistry: BlockRegistryData;
  atlasMapping: Map<BlockId, TextureUV>;
}

// Resposta do worker
interface MeshWorkerResult {
  type: 'result' | 'error';
  chunkCoord: ChunkCoord;
  meshData?: ChunkMeshData;      // Transferable buffers
  error?: string;
}
```

#### Scenario: Async mesh generation
- **WHEN** chunk is marked dirty
- **THEN** mesh job SHALL be submitted to worker
- **AND** main thread SHALL NOT block

#### Scenario: Priority queue
- **WHEN** multiple chunks need meshing
- **THEN** chunks closer to player SHALL be processed first

#### Scenario: Worker data transfer
- **WHEN** data is sent to worker
- **THEN** ArrayBuffers SHALL be transferred (not copied)
- **AND** ownership SHALL transfer to worker

---

### Requirement: Render Statistics

The system SHALL coletar e expor estatísticas de renderização para profiling.

```typescript
interface IRenderStats {
  readonly fps: number;
  readonly frameTime: number;           // ms
  readonly drawCalls: number;
  readonly trianglesRendered: number;
  readonly chunksRendered: number;
  readonly chunksTotal: number;
  readonly chunksCulled: number;
  readonly meshingTime: number;         // ms spent on meshing
  readonly uploadTime: number;          // ms spent on GPU uploads
  
  // Per-frame breakdown
  readonly timings: FrameTimings;
  
  reset(): void;
}

interface FrameTimings {
  update: number;
  meshing: number;
  culling: number;
  opaquePass: number;
  transparentPass: number;
  entityPass: number;
  postProcess: number;
  total: number;
}
```

#### Scenario: FPS tracking
- **WHEN** render stats are queried
- **THEN** accurate FPS SHALL be available
- **AND** should use rolling average for stability

#### Scenario: Draw call counting
- **WHEN** frame is rendered
- **THEN** total draw calls SHALL be tracked
- **AND** per-pass breakdown SHALL be available

---

## Design Decisions

### Greedy Meshing Algorithm

**Decisão**: Implementar greedy meshing com suporte a AO.

```
Standard Mesh (naive):          Greedy Mesh:
┌─┬─┬─┬─┐                       ┌───────┐
├─┼─┼─┼─┤   →   →   →   →       │       │
├─┼─┼─┼─┤                       │       │
├─┼─┼─┼─┤                       │       │
└─┴─┴─┴─┘                       └───────┘
16 quads = 64 vertices          1 quad = 4 vertices
```

**Justificativa**:
- Redução de 10-20x no número de vértices
- Menos draw calls, melhor performance
- Custo: maior complexidade de mesh generation

### Vertex Format Packing

**Decisão**: Pack vertex data para minimizar bandwidth.

```typescript
// Formato packed (16 bytes por vértice)
// Position: x, y, z como uint8 (posição relativa no chunk 0-15)
// UV: u, v como uint16 (coordenadas de atlas)
// NormalAO: 1 byte (3 bits normal, 5 bits AO/light)
// BlockData: 2 bytes (tipo de bloco, flags)

const PACKED_VERTEX_SIZE = 16;  // vs 28 bytes unpacked

// Estrutura no shader
// attribute vec3 aPosition;  // Reconstruído de bytes
// attribute vec2 aTexCoord;
// attribute float aNormalAO;
// attribute float aBlockData;
```

### Render Order

**Decisão**: Front-to-back para opacos, back-to-front para transparentes.

1. **Opacos front-to-back**: Early-Z rejection maximiza performance
2. **Transparentes back-to-front**: Blending correto requer ordem

```typescript
function sortChunksForRendering(chunks: ChunkMeshBuffer[], cameraPos: Vec3) {
  const opaqueChunks = chunks.filter(c => !c.isTransparent);
  const transparentChunks = chunks.filter(c => c.isTransparent);
  
  // Opacos: mais perto primeiro
  opaqueChunks.sort((a, b) => 
    distanceSquared(a.center, cameraPos) - distanceSquared(b.center, cameraPos)
  );
  
  // Transparentes: mais longe primeiro
  transparentChunks.sort((a, b) => 
    distanceSquared(b.center, cameraPos) - distanceSquared(a.center, cameraPos)
  );
  
  return { opaqueChunks, transparentChunks };
}
```

### Worker Count

**Decisão**: Usar `navigator.hardwareConcurrency - 1` workers.

```typescript
const WORKER_COUNT = Math.max(1, (navigator.hardwareConcurrency || 4) - 1);
```

**Justificativa**:
- Deixa 1 core para main thread
- Escala com hardware disponível
- Fallback para 4 cores se não detectável
