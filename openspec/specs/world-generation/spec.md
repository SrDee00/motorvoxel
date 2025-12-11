# World Generation

Sistema de geração procedural de mundo voxelizado usando algoritmos de noise e regras de biomas.

## Purpose

O sistema de geração de mundo é responsável por:
- Geração procedural de terreno usando noise functions
- Definição e distribuição de biomas
- Colocação de estruturas e features
- Seeds reprodutíveis para mundos consistentes
- Geração on-demand no servidor

## Arquitetura de Geração

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         WORLD GENERATOR                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │    Seed     │───▶│   Noise     │───▶│   Height    │                  │
│  │   (u64)     │    │   Layers    │    │    Map      │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
│                                               │                          │
│                                               ▼                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                  │
│  │   Biome     │───▶│   Block     │───▶│   Carver    │                  │
│  │   Sampler   │    │   Placer    │    │   (caves)   │                  │
│  └─────────────┘    └─────────────┘    └─────────────┘                  │
│                                               │                          │
│                                               ▼                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    Structure Generator                           │    │
│  │        (árvores, minérios, vilas, dungeons, etc.)               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                               │                          │
│                                               ▼                          │
│                                    ┌─────────────────┐                   │
│                                    │  Chunk Blocks   │                   │
│                                    │     Output      │                   │
│                                    └─────────────────┘                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Requirement: World Generator Interface

The system SHALL fornecer uma interface extensível para geração de mundo.

```typescript
interface IWorldGenerator {
  // Configuração
  readonly seed: bigint;
  readonly config: WorldGenConfig;
  
  setSeed(seed: bigint): void;
  
  // Geração
  generateChunk(cx: number, cz: number): IChunk;
  
  // Geração parcial (para customização)
  generateHeightMap(cx: number, cz: number): HeightMap;
  generateBiomeMap(cx: number, cz: number): BiomeMap;
  
  // Queries
  getHeightAt(worldX: number, worldZ: number): number;
  getBiomeAt(worldX: number, worldZ: number): BiomeId;
  
  // Registro de customizações
  registerBiome(biome: BiomeDefinition): void;
  registerStructure(structure: StructureGenerator): void;
}

interface WorldGenConfig {
  // Parâmetros de terreno
  seaLevel: number;              // Default: 64
  minHeight: number;             // Default: 0
  maxHeight: number;             // Default: 256
  
  // Escalas de noise
  continentScale: number;        // Default: 512
  mountainScale: number;         // Default: 128
  detailScale: number;           // Default: 32
  
  // Features
  generateCaves: boolean;        // Default: true
  generateOres: boolean;         // Default: true
  generateStructures: boolean;   // Default: true
  
  // Performance
  maxStructuresPerChunk: number; // Default: 3
}

interface HeightMap {
  heights: Int16Array;           // CHUNK_SIZE_X * CHUNK_SIZE_Z
  getHeight(lx: number, lz: number): number;
}

interface BiomeMap {
  biomes: Uint8Array;            // CHUNK_SIZE_X * CHUNK_SIZE_Z
  getBiome(lx: number, lz: number): BiomeId;
}
```

#### Scenario: Chunk generation
- **WHEN** generateChunk is called with coordinates
- **THEN** complete chunk SHALL be generated
- **AND** result SHALL be deterministic for same seed

#### Scenario: Height query
- **WHEN** getHeightAt is called for any world position
- **THEN** surface height SHALL be returned
- **AND** result SHALL match generated terrain

#### Scenario: Seed reproducibility
- **WHEN** same seed is used
- **THEN** generated world SHALL be identical

---

### Requirement: Noise System

The system SHALL implementar funções de noise para geração procedural.

```typescript
interface INoise {
  // Noise 2D
  noise2D(x: number, y: number): number;  // Returns -1 to 1
  
  // Noise 3D
  noise3D(x: number, y: number, z: number): number;
  
  // Octave noise (fractal brownian motion)
  fbm2D(
    x: number, y: number,
    octaves: number,
    lacunarity: number,
    persistence: number
  ): number;
  
  fbm3D(
    x: number, y: number, z: number,
    octaves: number,
    lacunarity: number,
    persistence: number
  ): number;
}

interface INoiseFactory {
  createSimplex(seed: bigint): INoise;
  createPerlin(seed: bigint): INoise;
  createWorley(seed: bigint): INoise;
  createValue(seed: bigint): INoise;
}

// Configuração de noise layers
interface NoiseLayer {
  noise: INoise;
  frequency: number;           // Escala do noise
  amplitude: number;           // Força do efeito
  octaves: number;             // Níveis de detalhe
  lacunarity: number;          // Quanto frequência aumenta por octave
  persistence: number;         // Quanto amplitude diminui por octave
  offset: Vec2;                // Offset adicional
}

// Exemplo de terreno com múltiplas camadas
class TerrainNoise {
  private continentNoise: NoiseLayer;
  private mountainNoise: NoiseLayer;
  private hillNoise: NoiseLayer;
  private detailNoise: NoiseLayer;
  
  getHeight(x: number, z: number): number {
    const continent = this.sampleLayer(this.continentNoise, x, z);
    const mountain = this.sampleLayer(this.mountainNoise, x, z);
    const hill = this.sampleLayer(this.hillNoise, x, z);
    const detail = this.sampleLayer(this.detailNoise, x, z);
    
    // Combinação não-linear
    const base = continent * 0.5 + 0.5;  // 0 to 1
    const height = base * 64 + mountain * 48 * base + hill * 16 + detail * 4;
    
    return Math.floor(height) + SEA_LEVEL;
  }
}
```

#### Scenario: Simplex noise generation
- **WHEN** simplex noise is sampled
- **THEN** value between -1 and 1 SHALL be returned
- **AND** should be smooth and continuous

#### Scenario: FBM octaves
- **WHEN** fbm is sampled with multiple octaves
- **THEN** result SHALL combine multiple frequencies
- **AND** higher octaves SHALL add detail

---

### Requirement: Biome System

The system SHALL suportar definição e seleção de biomas baseada em parâmetros.

```typescript
type BiomeId = number;

interface BiomeDefinition {
  id: BiomeId;
  name: string;
  
  // Parâmetros de seleção
  temperature: [number, number];    // Min, max (-1 to 1)
  humidity: [number, number];       // Min, max (-1 to 1)
  elevation: [number, number];      // Min, max (0 to 1)
  
  // Blocos de superfície
  surfaceBlock: BlockId;            // Ex: grass
  subsurfaceBlock: BlockId;         // Ex: dirt
  underwaterBlock: BlockId;         // Ex: sand
  stoneBlock: BlockId;              // Ex: stone
  
  // Variações de altura
  heightScale: number;              // Multiplicador de altura
  heightBase: number;               // Altura base
  
  // Features
  features: BiomeFeature[];
  
  // Cores (para mapas)
  grassColor: number;               // RGB hex
  foliageColor: number;
  waterColor: number;
}

interface BiomeFeature {
  type: 'tree' | 'plant' | 'ore' | 'structure' | 'custom';
  generator: string;                // Nome do gerador registrado
  probability: number;              // 0 to 1
  minY?: number;
  maxY?: number;
}

interface IBiomeSampler {
  registerBiome(biome: BiomeDefinition): void;
  
  // Amostragem
  sampleBiome(
    temperature: number,
    humidity: number,
    elevation: number
  ): BiomeId;
  
  getBiome(id: BiomeId): BiomeDefinition;
  
  // Para transições suaves
  sampleBiomeWeights(
    temperature: number,
    humidity: number,
    elevation: number
  ): Map<BiomeId, number>;
}

// Biomas padrão
const BIOME_OCEAN: BiomeDefinition = {
  id: 0,
  name: 'Ocean',
  temperature: [-1, 1],
  humidity: [0.5, 1],
  elevation: [0, 0.3],
  surfaceBlock: BLOCK_SAND,
  subsurfaceBlock: BLOCK_SAND,
  underwaterBlock: BLOCK_SAND,
  stoneBlock: BLOCK_STONE,
  heightScale: 0.3,
  heightBase: -32,
  features: [],
  grassColor: 0x88BB55,
  foliageColor: 0x77AA44,
  waterColor: 0x3366FF,
};

const BIOME_PLAINS: BiomeDefinition = {
  id: 1,
  name: 'Plains',
  temperature: [0, 0.8],
  humidity: [0.3, 0.7],
  elevation: [0.3, 0.5],
  surfaceBlock: BLOCK_GRASS,
  subsurfaceBlock: BLOCK_DIRT,
  underwaterBlock: BLOCK_SAND,
  stoneBlock: BLOCK_STONE,
  heightScale: 1.0,
  heightBase: 0,
  features: [
    { type: 'tree', generator: 'oak_tree', probability: 0.01 },
    { type: 'plant', generator: 'tall_grass', probability: 0.3 },
  ],
  grassColor: 0x91BD59,
  foliageColor: 0x77AB2F,
  waterColor: 0x3F76E4,
};

const BIOME_FOREST: BiomeDefinition = {
  id: 2,
  name: 'Forest',
  temperature: [0, 0.6],
  humidity: [0.6, 1],
  elevation: [0.3, 0.6],
  surfaceBlock: BLOCK_GRASS,
  subsurfaceBlock: BLOCK_DIRT,
  underwaterBlock: BLOCK_SAND,
  stoneBlock: BLOCK_STONE,
  heightScale: 1.2,
  heightBase: 0,
  features: [
    { type: 'tree', generator: 'oak_tree', probability: 0.1 },
    { type: 'tree', generator: 'birch_tree', probability: 0.05 },
    { type: 'plant', generator: 'flowers', probability: 0.1 },
  ],
  grassColor: 0x79C05A,
  foliageColor: 0x59C93C,
  waterColor: 0x3F76E4,
};
```

#### Scenario: Biome selection
- **WHEN** climate parameters are sampled
- **THEN** appropriate biome SHALL be selected
- **AND** biome boundaries SHALL be consistent

#### Scenario: Biome blending
- **WHEN** position is near biome boundary
- **THEN** weights for multiple biomes SHALL be available
- **AND** can be used for surface blending

---

### Requirement: Cave Generation

The system SHALL gerar cavernas e espaços subterrâneos.

```typescript
interface ICaveCarver {
  // Determina se posição é caverna
  isCave(worldX: number, worldY: number, worldZ: number): boolean;
  
  // Carve no chunk
  carve(chunk: IChunk, cx: number, cz: number): void;
}

interface CaveCarverConfig {
  // 3D noise para "queijo suíço"
  noiseFrequency: number;        // Default: 0.05
  noiseThreshold: number;        // Default: 0.6
  
  // Limites
  minY: number;                  // Default: 8
  maxY: number;                  // Default: 128
  
  // Variações
  wormCaves: boolean;            // Cavernas tipo túnel
  largeCaverns: boolean;         // Cavernas grandes
  
  // Lava em profundidade
  lavaLevel: number;             // Default: 10
}

// Implementação com múltiplos tipos de caverna
class MultiCaveCarver implements ICaveCarver {
  private cheeseNoise: INoise;    // Cavidades amplas
  private spaghettiNoise: INoise; // Túneis serpentinos
  private noodleNoise: INoise;    // Túneis finos
  
  isCave(x: number, y: number, z: number): boolean {
    // Cheese caves (grandes cavidades)
    const cheese = this.cheeseNoise.noise3D(
      x * 0.02, y * 0.04, z * 0.02
    );
    if (cheese > 0.7) return true;
    
    // Spaghetti caves (túneis médios)
    const spaghetti = this.spaghettiNoise.noise3D(
      x * 0.05, y * 0.05, z * 0.05
    );
    if (Math.abs(spaghetti) < 0.05) return true;
    
    // Noodle caves (túneis finos)
    const noodle = this.noodleNoise.noise3D(
      x * 0.1, y * 0.1, z * 0.1
    );
    if (Math.abs(noodle) < 0.02) return true;
    
    return false;
  }
}
```

#### Scenario: Cave carving
- **WHEN** chunk is generated
- **THEN** caves SHALL be carved out
- **AND** caves SHALL connect across chunk boundaries

#### Scenario: Deep caves
- **WHEN** caves are below lava level
- **THEN** floor SHALL be replaced with lava

---

### Requirement: Structure Generation

The system SHALL colocar estruturas e features no mundo.

```typescript
interface IStructureGenerator {
  readonly name: string;
  readonly type: 'tree' | 'ore' | 'building' | 'dungeon' | 'custom';
  
  // Decide se estrutura spawna nesta posição
  canSpawn(
    x: number, y: number, z: number,
    biome: BiomeDefinition,
    random: ISeededRandom
  ): boolean;
  
  // Gera a estrutura
  generate(
    world: IVoxelWorld,
    x: number, y: number, z: number,
    random: ISeededRandom
  ): void;
  
  // Bounding box (para evitar sobreposição)
  getSize(): Vec3;
}

interface ISeededRandom {
  nextFloat(): number;           // 0 to 1
  nextInt(max: number): number;  // 0 to max-1
  nextIntRange(min: number, max: number): number;
  nextBool(probability: number): boolean;
  shuffle<T>(array: T[]): T[];
}

// Gerador de árvore
class OakTreeGenerator implements IStructureGenerator {
  readonly name = 'oak_tree';
  readonly type = 'tree';
  
  canSpawn(x: number, y: number, z: number, biome: BiomeDefinition, random: ISeededRandom): boolean {
    return random.nextBool(0.02);  // 2% chance por bloco de superfície
  }
  
  generate(world: IVoxelWorld, x: number, y: number, z: number, random: ISeededRandom): void {
    const height = random.nextIntRange(4, 7);
    
    // Tronco
    for (let dy = 0; dy < height; dy++) {
      world.setBlock(x, y + dy, z, BLOCK_OAK_LOG);
    }
    
    // Folhas (esfera irregular)
    const leafRadius = 2;
    for (let dx = -leafRadius; dx <= leafRadius; dx++) {
      for (let dy = -1; dy <= 2; dy++) {
        for (let dz = -leafRadius; dz <= leafRadius; dz++) {
          const dist = Math.abs(dx) + Math.abs(dy) + Math.abs(dz);
          if (dist <= leafRadius + 1 && random.nextBool(0.8)) {
            const lx = x + dx;
            const ly = y + height - 2 + dy;
            const lz = z + dz;
            if (world.getBlock(lx, ly, lz) === BLOCK_AIR) {
              world.setBlock(lx, ly, lz, BLOCK_OAK_LEAVES);
            }
          }
        }
      }
    }
  }
  
  getSize(): Vec3 {
    return [5, 8, 5];
  }
}

// Gerador de minério
class OreGenerator implements IStructureGenerator {
  readonly name: string;
  readonly type = 'ore';
  
  private blockType: BlockId;
  private veinSize: number;
  private minY: number;
  private maxY: number;
  private rarity: number;
  
  constructor(config: OreConfig) {
    this.name = config.name;
    this.blockType = config.blockType;
    this.veinSize = config.veinSize;
    this.minY = config.minY;
    this.maxY = config.maxY;
    this.rarity = config.rarity;
  }
  
  canSpawn(x: number, y: number, z: number, biome: BiomeDefinition, random: ISeededRandom): boolean {
    return y >= this.minY && y <= this.maxY && random.nextBool(this.rarity);
  }
  
  generate(world: IVoxelWorld, x: number, y: number, z: number, random: ISeededRandom): void {
    // Gera veia irregular
    let remaining = this.veinSize;
    const queue: Vec3[] = [[x, y, z]];
    const placed = new Set<string>();
    
    while (queue.length > 0 && remaining > 0) {
      const [cx, cy, cz] = queue.shift()!;
      const key = `${cx},${cy},${cz}`;
      
      if (placed.has(key)) continue;
      if (world.getBlock(cx, cy, cz) !== BLOCK_STONE) continue;
      
      world.setBlock(cx, cy, cz, this.blockType);
      placed.add(key);
      remaining--;
      
      // Expande para vizinhos
      for (const [dx, dy, dz] of NEIGHBORS_6) {
        if (random.nextBool(0.5)) {
          queue.push([cx + dx, cy + dy, cz + dz]);
        }
      }
    }
  }
  
  getSize(): Vec3 {
    return [3, 3, 3];
  }
}

// Configurações de minérios
const ORES: OreConfig[] = [
  { name: 'coal_ore', blockType: BLOCK_COAL_ORE, veinSize: 16, minY: 0, maxY: 128, rarity: 0.01 },
  { name: 'iron_ore', blockType: BLOCK_IRON_ORE, veinSize: 8, minY: 0, maxY: 64, rarity: 0.008 },
  { name: 'gold_ore', blockType: BLOCK_GOLD_ORE, veinSize: 6, minY: 0, maxY: 32, rarity: 0.002 },
  { name: 'diamond_ore', blockType: BLOCK_DIAMOND_ORE, veinSize: 4, minY: 0, maxY: 16, rarity: 0.0005 },
];
```

#### Scenario: Tree placement
- **WHEN** trees are generated
- **THEN** they SHALL only spawn on valid surface
- **AND** spacing SHALL prevent overlap

#### Scenario: Ore distribution
- **WHEN** ores are generated
- **THEN** rarer ores SHALL spawn deeper
- **AND** vein sizes SHALL vary

---

### Requirement: Seed System

The system SHALL usar seeds para reprodutibilidade.

```typescript
interface ISeedGenerator {
  // Deriva sub-seeds para diferentes usos
  deriveTerrainSeed(): bigint;
  deriveBiomeSeed(): bigint;
  deriveCaveSeed(): bigint;
  deriveStructureSeed(structureName: string): bigint;
  
  // Seed específico por chunk
  getChunkSeed(cx: number, cz: number): bigint;
  
  // Random seeded por chunk
  getChunkRandom(cx: number, cz: number): ISeededRandom;
}

// Implementação com hashing
class SeedGenerator implements ISeedGenerator {
  constructor(private worldSeed: bigint) {}
  
  deriveTerrainSeed(): bigint {
    return this.hash(this.worldSeed, 'terrain');
  }
  
  getChunkSeed(cx: number, cz: number): bigint {
    // Combina world seed com coordenadas
    return this.hash(this.worldSeed, `chunk_${cx}_${cz}`);
  }
  
  getChunkRandom(cx: number, cz: number): ISeededRandom {
    const seed = this.getChunkSeed(cx, cz);
    return new SeededRandom(seed);
  }
  
  private hash(seed: bigint, salt: string): bigint {
    // Usando xxHash ou similar
    let h = seed;
    for (const char of salt) {
      h = ((h << 5n) - h) + BigInt(char.charCodeAt(0));
      h = h & 0xFFFFFFFFFFFFFFFFn;
    }
    return h;
  }
}

// Pseudo-random seeded
class SeededRandom implements ISeededRandom {
  private state: bigint;
  
  constructor(seed: bigint) {
    this.state = seed;
  }
  
  nextFloat(): number {
    this.state = (this.state * 6364136223846793005n + 1442695040888963407n) & 0xFFFFFFFFFFFFFFFFn;
    return Number(this.state >> 33n) / 0x7FFFFFFF;
  }
  
  nextInt(max: number): number {
    return Math.floor(this.nextFloat() * max);
  }
  
  nextIntRange(min: number, max: number): number {
    return min + this.nextInt(max - min + 1);
  }
  
  nextBool(probability: number): boolean {
    return this.nextFloat() < probability;
  }
  
  shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
```

#### Scenario: Deterministic generation
- **WHEN** world is generated with same seed
- **THEN** every block SHALL be identical

#### Scenario: Chunk independence
- **WHEN** chunks are generated in different order
- **THEN** results SHALL be identical

---

## Design Decisions

### Generation Pipeline Order

```
1. Height Map Generation
   └─ Scale: 256x256 per chunk column
   └─ Uses: continent, mountain, hill, detail noise layers
   
2. Biome Map Generation
   └─ Scale: 4x4 sampling with interpolation
   └─ Uses: temperature and humidity noise
   
3. Surface Block Placement
   └─ Based on biome + height + noise variation
   └─ Includes grass, dirt, sand, stone layers
   
4. Cave Carving
   └─ 3D noise for swiss-cheese caves
   └─ Worm carvers for tunnels
   
5. Ore Placement
   └─ Per-chunk seeded placement
   └─ Depth-based rarity
   
6. Structure Placement
   └─ Surface scan for valid positions
   └─ Two-pass: mark → generate
```

### Noise Scale Reference

```
Feature         | Frequency | Description
----------------|-----------|---------------------------
Continents      | 0.001     | Grandes formas de terra
Mountains       | 0.01      | Cadeias de montanha
Hills           | 0.05      | Colinas suaves
Detail          | 0.1       | Variação local
Micro           | 0.5       | Textura de superfície
Biome Temp      | 0.005     | Zonas de temperatura
Biome Humidity  | 0.008     | Zonas de umidade
Caves (cheese)  | 0.02      | Grandes cavidades
Caves (tunnel)  | 0.05      | Túneis médios
```

### Biome Distribution

```
             Cold         Temperate        Hot
           (-1 to -0.3)  (-0.3 to 0.3)   (0.3 to 1)
         ┌────────────┬────────────────┬────────────┐
   Dry   │   Tundra   │    Savanna     │   Desert   │
(0-0.33) │            │                │            │
         ├────────────┼────────────────┼────────────┤
 Normal  │   Taiga    │    Plains      │  Badlands  │
(0.33-   │            │                │            │
  0.66)  ├────────────┼────────────────┼────────────┤
   Wet   │   Snowy    │    Forest      │   Jungle   │
(0.66-1) │            │                │            │
         └────────────┴────────────────┴────────────┘
```

### Performance Considerations

```typescript
// Geração SHALL ser eficiente para não bloquear servidor
const GENERATION_BUDGET = {
  heightMapMs: 2,      // 2ms para heightmap
  biomeMapMs: 1,       // 1ms para biomas
  blockPlacementMs: 5, // 5ms para blocos
  caveCarvingMs: 3,    // 3ms para cavernas
  structuresMs: 5,     // 5ms para estruturas
  totalTargetMs: 16,   // 16ms total target
};

// Se exceder budget, pode ser dividido em frames
async function generateChunkAsync(cx: number, cz: number): Promise<IChunk> {
  const chunk = new Chunk(cx, 0, cz);
  
  await yieldIfNeeded();
  generateHeightMap(chunk);
  
  await yieldIfNeeded();
  generateBiomes(chunk);
  
  await yieldIfNeeded();
  placeBlocks(chunk);
  
  await yieldIfNeeded();
  carveCaves(chunk);
  
  await yieldIfNeeded();
  placeStructures(chunk);
  
  return chunk;
}
```
