# Voxel World

Sistema de gerenciamento de mundo voxelizado baseado em chunks para representação e manipulação eficiente de terreno 3D.

## Purpose

O Voxel World é responsável por:
- Representação do mundo como matriz 3D de blocos
- Divisão do mundo em chunks para gerenciamento eficiente
- Streaming de chunks baseado na posição do jogador
- API para leitura e escrita de blocos
- Gerenciamento de tipos de blocos e suas propriedades

## Arquitetura de Chunks

```
Mundo Voxel (infinito*)
┌───────────────────────────────────────────────────────────┐
│                                                           │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│   │Chunk│ │Chunk│ │Chunk│ │Chunk│ │Chunk│               │
│   │-2,0 │ │-1,0 │ │ 0,0 │ │ 1,0 │ │ 2,0 │               │
│   └─────┘ └─────┘ └─────┘ └─────┘ └─────┘               │
│   ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐               │
│   │Chunk│ │Chunk│ │Chunk│ │Chunk│ │Chunk│               │
│   │-2,1 │ │-1,1 │ │ 0,1 │ │ 1,1 │ │ 2,1 │               │
│   └─────┘ └─────┘ └──▲──┘ └─────┘ └─────┘               │
│                      │                                    │
│                   Player                                  │
│                                                           │
└───────────────────────────────────────────────────────────┘

*Limitado por precisão de ponto flutuante e memória
```

---

## Requirements

### Requirement: Chunk Data Structure

The system SHALL representar cada chunk como uma estrutura compacta de dados volumétricos.

```typescript
// Dimensões padrão de chunk
const CHUNK_SIZE_X = 16;
const CHUNK_SIZE_Y = 256;
const CHUNK_SIZE_Z = 16;
const CHUNK_VOLUME = CHUNK_SIZE_X * CHUNK_SIZE_Y * CHUNK_SIZE_Z; // 65,536

// Identificador de tipo de bloco (0 = ar)
type BlockId = number;  // uint16, permite 65,536 tipos

interface IChunk {
  readonly coord: ChunkCoord;
  readonly blocks: Uint16Array;  // Flat array de CHUNK_VOLUME elementos
  
  // Estado
  readonly isDirty: boolean;      // Precisa regerar mesh
  readonly isLoaded: boolean;     // Dados carregados
  readonly isEmpty: boolean;      // Chunk só tem ar
  
  // Acesso a blocos
  getBlock(lx: number, ly: number, lz: number): BlockId;
  setBlock(lx: number, ly: number, lz: number, blockId: BlockId): void;
  
  // Bulk operations
  fill(blockId: BlockId): void;
  fillRegion(
    minX: number, minY: number, minZ: number,
    maxX: number, maxY: number, maxZ: number,
    blockId: BlockId
  ): void;
  
  // Serialização
  serialize(): ArrayBuffer;
  deserialize(data: ArrayBuffer): void;
}
```

#### Scenario: Block access within bounds
- **WHEN** getBlock is called with valid local coordinates
- **THEN** correct BlockId SHALL be returned from the flat array

#### Scenario: Block access out of bounds
- **WHEN** getBlock is called with coordinates outside chunk bounds
- **THEN** system SHALL return 0 (air) or throw error based on strict mode

#### Scenario: Block modification
- **WHEN** setBlock is called
- **THEN** block SHALL be updated in the array
- **AND** isDirty flag SHALL be set to true
- **AND** 'block:changed' event SHALL be emitted

#### Scenario: Empty chunk optimization
- **WHEN** chunk contains only air blocks
- **THEN** isEmpty SHALL return true
- **AND** mesh generation MAY be skipped

---

### Requirement: Chunk Manager

The system SHALL gerenciar o ciclo de vida dos chunks, incluindo carregamento, descarga e streaming baseado na posição do jogador.

```typescript
interface IChunkManager {
  // Acesso a chunks
  getChunk(cx: number, cy: number, cz: number): IChunk | undefined;
  getChunkAt(worldX: number, worldY: number, worldZ: number): IChunk | undefined;
  
  // Gerenciamento de chunks
  loadChunk(cx: number, cy: number, cz: number): Promise<IChunk>;
  unloadChunk(cx: number, cy: number, cz: number): void;
  
  // Streaming
  updateViewPosition(worldX: number, worldZ: number): void;
  
  // Iteração
  forEachLoadedChunk(callback: (chunk: IChunk) => void): void;
  getLoadedChunks(): IterableIterator<IChunk>;
  
  // Stats
  readonly loadedChunkCount: number;
  readonly pendingChunkCount: number;
  readonly viewDistance: number;
}

interface ChunkStreamingConfig {
  viewDistance: number;        // Raio em chunks (padrão: 8)
  loadPriority: 'distance' | 'direction';  // Prioridade de carregamento
  maxLoadsPerFrame: number;    // Limite de carregamentos por frame (padrão: 2)
  unloadDelay: number;         // Ms antes de descarregar (padrão: 5000)
}
```

#### Scenario: Initial chunk loading
- **WHEN** player spawns at position
- **THEN** chunks within viewDistance SHALL be queued for loading
- **AND** loading SHALL prioritize chunks closest to player

#### Scenario: Player movement triggers streaming
- **WHEN** player moves to new chunk
- **THEN** new chunks entering view distance SHALL be loaded
- **AND** chunks leaving view distance + buffer SHALL be scheduled for unload

#### Scenario: Chunk loading order
- **WHEN** multiple chunks need loading
- **THEN** chunks SHALL be loaded in order of distance to player
- **AND** no more than maxLoadsPerFrame SHALL be loaded per frame

#### Scenario: Unload delay
- **WHEN** chunk leaves view distance
- **THEN** chunk SHALL NOT be immediately unloaded
- **AND** if player returns within unloadDelay, chunk stays loaded

---

### Requirement: Voxel World API

The system SHALL fornecer uma API de alto nível para interação com o mundo voxelizado.

```typescript
interface IVoxelWorld {
  readonly chunkManager: IChunkManager;
  readonly blockRegistry: IBlockRegistry;
  
  // Acesso a blocos por coordenadas de mundo
  getBlock(x: number, y: number, z: number): BlockId;
  setBlock(x: number, y: number, z: number, blockId: BlockId): boolean;
  
  // Operações em lote
  setBlocks(changes: Array<{ x: number; y: number; z: number; blockId: BlockId }>): void;
  
  // Raycast para seleção de blocos
  raycast(
    origin: Vec3,
    direction: Vec3,
    maxDistance: number
  ): VoxelRaycastResult | null;
  
  // Eventos
  onBlockChanged(callback: (x: number, y: number, z: number, oldId: BlockId, newId: BlockId) => void): () => void;
  onChunkLoaded(callback: (chunk: IChunk) => void): () => void;
  onChunkUnloaded(callback: (coord: ChunkCoord) => void): () => void;
}

interface VoxelRaycastResult {
  hit: boolean;
  blockX: number;
  blockY: number;
  blockZ: number;
  blockId: BlockId;
  face: BlockFace;         // Qual face foi atingida
  distance: number;
  
  // Posição adjacente (para colocar bloco)
  adjacentX: number;
  adjacentY: number;
  adjacentZ: number;
}

type BlockFace = 'top' | 'bottom' | 'north' | 'south' | 'east' | 'west';
```

#### Scenario: Get block across chunk boundary
- **WHEN** getBlock is called with world coordinates
- **THEN** correct chunk SHALL be located
- **AND** local coordinates SHALL be calculated
- **AND** block SHALL be retrieved from correct chunk

#### Scenario: Set block in unloaded chunk
- **WHEN** setBlock is called for unloaded chunk
- **THEN** operation SHALL return false
- **AND** change MAY be queued for when chunk loads

#### Scenario: Raycast hits solid block
- **WHEN** raycast is performed toward solid blocks
- **THEN** first solid block intersection SHALL be returned
- **AND** hit face SHALL be correctly identified
- **AND** adjacent position SHALL be calculated for block placement

#### Scenario: Raycast misses all blocks
- **WHEN** raycast doesn't hit any solid blocks within maxDistance
- **THEN** null SHALL be returned

---

### Requirement: Block Registry

The system SHALL manter um registro de tipos de blocos e suas propriedades.

```typescript
interface IBlockRegistry {
  register(definition: BlockDefinition): BlockId;
  get(id: BlockId): BlockDefinition | undefined;
  getByName(name: string): BlockDefinition | undefined;
  
  readonly count: number;
  readonly definitions: ReadonlyMap<BlockId, BlockDefinition>;
}

interface BlockDefinition {
  id: BlockId;
  name: string;                    // Identificador único (ex: "stone", "dirt")
  displayName: string;             // Nome para UI (ex: "Pedra", "Terra")
  
  // Propriedades físicas
  solid: boolean;                  // Tem colisão
  transparent: boolean;            // Permite ver através
  liquid: boolean;                 // É líquido
  
  // Propriedades visuais
  textures: BlockTextures;         // Texturas por face
  emission: number;                // Emissão de luz (0-15)
  
  // Comportamento
  hardness: number;                // Tempo para quebrar
  toolType?: ToolType;             // Ferramenta necessária
  drops?: DropDefinition[];        // O que dropa ao quebrar
  
  // Metadados opcionais
  metadata?: Record<string, unknown>;
}

interface BlockTextures {
  all?: string;                    // Mesma textura em todas faces
  top?: string;
  bottom?: string;
  sides?: string;
  north?: string;
  south?: string;
  east?: string;
  west?: string;
}

// Blocos padrão
const BLOCK_AIR: BlockId = 0;
const BLOCK_STONE: BlockId = 1;
const BLOCK_DIRT: BlockId = 2;
const BLOCK_GRASS: BlockId = 3;
const BLOCK_WATER: BlockId = 4;
```

#### Scenario: Register new block type
- **WHEN** new block definition is registered
- **THEN** unique BlockId SHALL be assigned
- **AND** definition SHALL be retrievable by id and name

#### Scenario: Block with different face textures
- **WHEN** block is defined with per-face textures
- **THEN** meshing system SHALL use correct texture for each face

#### Scenario: Transparent block handling
- **WHEN** block is marked as transparent
- **THEN** faces adjacent to this block SHALL NOT be culled
- **AND** block SHALL be rendered with alpha blending if needed

---

### Requirement: Chunk Sections (Optimization)

The system SHALL suportar divisão de chunks em seções verticais para otimização.

```typescript
// Chunk dividido em seções de 16x16x16
const SECTION_HEIGHT = 16;
const SECTIONS_PER_CHUNK = CHUNK_SIZE_Y / SECTION_HEIGHT; // 16 seções

interface IChunkSection {
  readonly y: number;              // Índice da seção (0-15)
  readonly isEmpty: boolean;       // Seção vazia
  readonly blocks: Uint16Array;    // 16x16x16 = 4096 blocos
  
  getBlock(lx: number, ly: number, lz: number): BlockId;
  setBlock(lx: number, ly: number, lz: number, blockId: BlockId): void;
}

interface IChunkWithSections extends IChunk {
  getSection(sectionY: number): IChunkSection | undefined;
  readonly nonEmptySections: number[];
}
```

#### Scenario: Empty section skip
- **WHEN** chunk section contains only air
- **THEN** section SHALL be marked as empty
- **AND** meshing SHALL skip this section entirely

#### Scenario: Section-based dirty tracking
- **WHEN** block is modified in a section
- **THEN** only that section SHALL be marked dirty
- **AND** only that section's mesh SHALL be regenerated

---

### Requirement: Level of Detail (LOD) Support

The system SHALL suportar múltiplos níveis de detalhe para chunks distantes.

```typescript
interface ILodChunk {
  readonly coord: ChunkCoord;
  readonly lodLevel: number;       // 0 = full detail, 1 = 2x2, 2 = 4x4, etc.
  readonly resolution: number;     // Blocos por unidade neste LOD
  
  // Dados compactados
  readonly blocks: Uint16Array;
  
  // Mesh simplificado
  getSimplifiedMesh(): ArrayBuffer;
}

interface ILodManager {
  readonly levels: number;         // Número de níveis de LOD
  
  getLodLevel(distance: number): number;
  getLodChunk(cx: number, cz: number, lodLevel: number): ILodChunk | undefined;
  
  // Configuração de distâncias por nível
  setLodDistances(distances: number[]): void;
}

// Distâncias padrão (em chunks)
const DEFAULT_LOD_DISTANCES = [
  8,   // LOD 0: 0-8 chunks (full detail)
  16,  // LOD 1: 8-16 chunks (2x2 sampling)
  32,  // LOD 2: 16-32 chunks (4x4 sampling)
];
```

#### Scenario: LOD transition
- **WHEN** chunk moves from LOD 0 to LOD 1 distance
- **THEN** LOD 1 mesh SHALL be generated
- **AND** transition SHALL be smooth (blend or pop)

#### Scenario: LOD memory savings
- **WHEN** using LOD for distant chunks
- **THEN** memory usage SHALL be significantly reduced
- **AND** draw calls SHALL be reduced via simplified meshes

---

## Design Decisions

### Flat Array vs 3D Array

**Decisão**: Usar flat `Uint16Array` com cálculo de índice.

```typescript
// Índice = x + z * CHUNK_SIZE_X + y * (CHUNK_SIZE_X * CHUNK_SIZE_Z)
// Isso otimiza para iteração vertical (meshing por colunas)

function coordToIndex(lx: number, ly: number, lz: number): number {
  return lx + lz * CHUNK_SIZE_X + ly * (CHUNK_SIZE_X * CHUNK_SIZE_Z);
}
```

**Justificativa**: 
- Melhor uso de cache para padrões de acesso em meshing
- Compatível com transferência direta para workers
- 2 bytes por bloco = 128KB por chunk (gerenciável)

### Chunk Height de 256

**Decisão**: Altura fixa de 256 blocos por chunk.

**Justificativa**:
- Permite representar terrenos altos e cavernas profundas
- 256 = 2^8, facilita cálculos bit-a-bit
- Consistente com engines voxel populares

### Coordenadas Signed

**Decisão**: Chunks usam coordenadas signed (negativas permitidas).

```typescript
// Coordenada de chunk pode ser negativa
const chunk = getChunk(-5, 0, 3);

// Conversão world -> chunk
function worldToChunkX(worldX: number): number {
  return Math.floor(worldX / CHUNK_SIZE_X);
}
```

**Justificativa**:
- Mundo expansível em todas direções
- Spawn point pode ser em (0, 0, 0) do mundo

### Chunk Key Format

```typescript
// Chave única para identificar chunk
type ChunkKey = `${number},${number},${number}`;

function chunkKey(cx: number, cy: number, cz: number): ChunkKey {
  return `${cx},${cy},${cz}`;
}

// Usar Map<ChunkKey, IChunk> para acesso O(1)
```
