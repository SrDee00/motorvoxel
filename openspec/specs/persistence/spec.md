# Persistence

Sistema de persistência para salvamento de mundo voxel, dados de jogadores e estado do servidor.

## Purpose

O sistema de persistência é responsável por:
- Salvamento e carregamento de chunks alterados
- Persistência de dados de jogadores (inventário, posição, stats)
- Interface abstrata para diferentes backends de storage
- Otimização de I/O com batching e compressão
- Backup e recuperação de dados

## Arquitetura de Persistência

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PERSISTENCE LAYER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Storage Interface                             │    │
│  │   save() / load() / delete() / query()                           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                              │                                           │
│        ┌─────────────────────┼─────────────────────┐                    │
│        │                     │                     │                    │
│        ▼                     ▼                     ▼                    │
│  ┌───────────┐        ┌───────────┐        ┌───────────┐               │
│  │   File    │        │   SQLite  │        │ PostgreSQL│               │
│  │  Backend  │        │  Backend  │        │  Backend  │               │
│  └───────────┘        └───────────┘        └───────────┘               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Data Types                                    │    │
│  │   ChunkData / PlayerData / WorldMetadata / GameState             │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Requirement: Storage Interface

The system SHALL fornecer uma interface abstrata para diferentes backends de storage.

```typescript
interface IStorageBackend {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  readonly isConnected: boolean;
  
  // CRUD genérico
  save<T>(collection: string, key: string, data: T): Promise<void>;
  load<T>(collection: string, key: string): Promise<T | null>;
  delete(collection: string, key: string): Promise<boolean>;
  exists(collection: string, key: string): Promise<boolean>;
  
  // Queries
  list(collection: string, prefix?: string): Promise<string[]>;
  count(collection: string): Promise<number>;
  
  // Bulk operations
  saveBatch<T>(collection: string, items: Map<string, T>): Promise<void>;
  loadBatch<T>(collection: string, keys: string[]): Promise<Map<string, T>>;
  
  // Transactions (se suportado)
  beginTransaction?(): Promise<ITransaction>;
}

interface ITransaction {
  save<T>(collection: string, key: string, data: T): void;
  delete(collection: string, key: string): void;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// Factory
interface IStorageFactory {
  createFileBackend(basePath: string): IStorageBackend;
  createSqliteBackend(dbPath: string): IStorageBackend;
  createPostgresBackend(connectionString: string): IStorageBackend;
  createRedisBackend(redisUrl: string): IStorageBackend;
}
```

#### Scenario: Backend switching
- **WHEN** different storage backend is configured
- **THEN** same data interface SHALL work
- **AND** migration between backends SHALL be possible

#### Scenario: Connection handling
- **WHEN** connection is lost
- **THEN** reconnection SHALL be attempted
- **AND** pending operations SHALL be retried or reported

---

### Requirement: Chunk Storage

The system SHALL persistir chunks alterados de forma eficiente.

```typescript
interface IChunkStorage {
  // Chunk individual
  saveChunk(chunk: IChunk): Promise<void>;
  loadChunk(cx: number, cy: number, cz: number): Promise<IChunk | null>;
  deleteChunk(cx: number, cy: number, cz: number): Promise<void>;
  
  // Verificação
  chunkExists(cx: number, cy: number, cz: number): Promise<boolean>;
  getModifiedChunks(): Promise<ChunkCoord[]>;
  
  // Bulk operations
  saveChunks(chunks: IChunk[]): Promise<void>;
  loadChunksInRegion(
    minCx: number, minCz: number,
    maxCx: number, maxCz: number
  ): Promise<IChunk[]>;
  
  // Metadados
  getChunkMetadata(cx: number, cy: number, cz: number): Promise<ChunkMetadata | null>;
  
  // Cleanup
  deleteUnmodifiedChunks(): Promise<number>;
}

interface ChunkMetadata {
  coord: ChunkCoord;
  lastModified: number;       // Timestamp
  modificationCount: number;  // Quantas vezes foi modificado
  compressed: boolean;
  sizeBytes: number;
}

// Formato de armazenamento de chunk
interface StoredChunk {
  coord: ChunkCoord;
  version: number;            // Versão do formato
  timestamp: number;
  
  // Dados de blocos (comprimidos)
  blocks: ArrayBuffer;
  blocksCompressed: boolean;
  
  // Dados adicionais
  lightData?: ArrayBuffer;
  blockEntities?: BlockEntityData[];
}

// Compressão
interface IChunkCompressor {
  compress(chunk: IChunk): ArrayBuffer;
  decompress(data: ArrayBuffer): Uint16Array;
  
  // Run-length encoding para chunks com muitos blocos iguais
  readonly compressionRatio: number;
}
```

#### Scenario: Dirty chunk save
- **WHEN** chunk is modified
- **THEN** chunk SHALL be marked for save
- **AND** save SHALL occur within configured interval

#### Scenario: Chunk compression
- **WHEN** chunk is saved
- **THEN** data SHALL be compressed
- **AND** compression SHALL reduce size significantly for typical chunks

#### Scenario: Unmodified chunk skip
- **WHEN** chunk matches world generation
- **THEN** chunk MAY be skipped for saving
- **AND** regeneration from seed SHALL produce same result

---

### Requirement: Region Files

The system SHALL usar arquivos de região para agrupar chunks.

```typescript
interface IRegionFile {
  readonly regionX: number;
  readonly regionZ: number;
  readonly chunksPerRegion: number;  // Típico: 32x32 = 1024 chunks
  
  // Acesso a chunks
  readChunk(localX: number, localZ: number): Promise<StoredChunk | null>;
  writeChunk(localX: number, localZ: number, chunk: StoredChunk): Promise<void>;
  deleteChunk(localX: number, localZ: number): Promise<void>;
  
  // Metadados
  getChunkLocations(): Promise<Array<{ x: number; z: number; offset: number; size: number }>>;
  
  // Manutenção
  defragment(): Promise<void>;
  getFragmentation(): number;
  
  // Lifecycle
  open(): Promise<void>;
  close(): Promise<void>;
  flush(): Promise<void>;
}

// Formato de arquivo de região
/*
Region File Format (.mvr - MotorVoxel Region):

Header (8KB):
  Signature: 4 bytes "MVR\0"
  Version: 4 bytes
  ChunksPerSide: 4 bytes (32)
  Reserved: 4 bytes
  
  Chunk Table: 32*32*8 bytes = 8KB
    For each chunk: offset (4 bytes) + size (4 bytes)
    offset=0 means chunk not stored

Data Section:
  Chunks sequentially stored
  Each chunk: length (4 bytes) + compressed data
  
Padding: 4KB alignment for efficient disk I/O
*/

interface IRegionManager {
  getRegion(cx: number, cz: number): IRegionFile;
  closeAll(): Promise<void>;
  
  // Cache de região files
  readonly openRegions: number;
  readonly maxOpenRegions: number;
}

// Conversão de coordenadas
function chunkToRegion(cx: number, cz: number): { rx: number; rz: number; lx: number; lz: number } {
  const CHUNKS_PER_REGION = 32;
  return {
    rx: Math.floor(cx / CHUNKS_PER_REGION),
    rz: Math.floor(cz / CHUNKS_PER_REGION),
    lx: ((cx % CHUNKS_PER_REGION) + CHUNKS_PER_REGION) % CHUNKS_PER_REGION,
    lz: ((cz % CHUNKS_PER_REGION) + CHUNKS_PER_REGION) % CHUNKS_PER_REGION,
  };
}
```

#### Scenario: Region file creation
- **WHEN** chunk in new region is saved
- **THEN** region file SHALL be created
- **AND** header SHALL be properly initialized

#### Scenario: Region fragmentation
- **WHEN** chunks are deleted and added
- **THEN** fragmentation SHALL be tracked
- **AND** defragmentation SHALL be available

---

### Requirement: Player Data Storage

The system SHALL persistir dados de jogadores.

```typescript
interface IPlayerStorage {
  // CRUD
  savePlayer(data: PlayerData): Promise<void>;
  loadPlayer(playerId: PlayerId): Promise<PlayerData | null>;
  deletePlayer(playerId: PlayerId): Promise<void>;
  
  // Queries
  playerExists(playerId: PlayerId): Promise<boolean>;
  getPlayerByUsername(username: string): Promise<PlayerData | null>;
  getAllPlayers(): Promise<PlayerId[]>;
  getOnlinePlayers(): Promise<PlayerId[]>;
  
  // Stats
  getPlayerCount(): Promise<number>;
  getLastLoginTime(playerId: PlayerId): Promise<number | null>;
}

interface PlayerData {
  // Identificação
  playerId: PlayerId;
  username: string;
  createdAt: number;
  lastLoginAt: number;
  playTimeSeconds: number;
  
  // Posição no mundo
  position: Vec3;
  rotation: Vec2;          // Yaw, Pitch
  dimension: string;       // Ex: "overworld", "nether"
  
  // Inventário
  inventory: InventoryData;
  selectedSlot: number;
  
  // Stats
  health: number;
  maxHealth: number;
  hunger?: number;
  experience?: number;
  level?: number;
  
  // Configurações
  gameMode: 'survival' | 'creative' | 'adventure' | 'spectator';
  permissions: string[];
  
  // Dados customizados do jogo
  customData: Record<string, unknown>;
}

interface InventoryData {
  slots: Array<ItemStack | null>;
  armor: Array<ItemStack | null>;
  offhand: ItemStack | null;
  enderChest?: Array<ItemStack | null>;
}

interface ItemStack {
  itemId: string;
  count: number;
  damage?: number;
  nbt?: Record<string, unknown>;
}
```

#### Scenario: Player join
- **WHEN** player connects
- **THEN** player data SHALL be loaded
- **AND** if not exists, default data SHALL be created

#### Scenario: Player leave
- **WHEN** player disconnects
- **THEN** current state SHALL be saved
- **AND** online status SHALL be updated

#### Scenario: Periodic save
- **WHEN** server is running
- **THEN** player data SHALL be saved periodically
- **AND** data loss SHALL be minimized on crash

---

### Requirement: World Metadata

The system SHALL armazenar metadados do mundo.

```typescript
interface IWorldMetadataStorage {
  saveMetadata(metadata: WorldMetadata): Promise<void>;
  loadMetadata(): Promise<WorldMetadata | null>;
  
  // Configurações individuais
  getSetting<T>(key: string): Promise<T | null>;
  setSetting<T>(key: string, value: T): Promise<void>;
}

interface WorldMetadata {
  // Identificação
  worldId: string;
  worldName: string;
  seed: bigint;
  createdAt: number;
  
  // Versão
  engineVersion: string;
  formatVersion: number;
  
  // Configurações de mundo
  gameRules: GameRules;
  spawnPoint: Vec3;
  worldBorder?: WorldBorder;
  
  // Estado de tempo
  worldTime: number;          // Ticks desde criação
  dayTime: number;            // Ticks do dia (0-24000)
  weather: WeatherState;
  
  // Estatísticas
  totalPlayTime: number;
  totalBlocksPlaced: number;
  totalBlocksBroken: number;
}

interface GameRules {
  doDaylightCycle: boolean;
  doWeatherCycle: boolean;
  doMobSpawning: boolean;
  keepInventory: boolean;
  mobGriefing: boolean;
  pvp: boolean;
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
}

interface WorldBorder {
  centerX: number;
  centerZ: number;
  radius: number;
  damagePerSecond: number;
}

interface WeatherState {
  type: 'clear' | 'rain' | 'thunder';
  duration: number;           // Ticks restantes
}
```

#### Scenario: World creation
- **WHEN** new world is created
- **THEN** metadata SHALL be initialized with defaults
- **AND** seed SHALL be stored

#### Scenario: Settings modification
- **WHEN** game rule is changed
- **THEN** setting SHALL be persisted immediately

---

### Requirement: Auto-Save System

The system SHALL implementar salvamento automático periódico.

```typescript
interface IAutoSave {
  // Configuração
  readonly config: AutoSaveConfig;
  configure(config: Partial<AutoSaveConfig>): void;
  
  // Controle
  start(): void;
  stop(): void;
  readonly isRunning: boolean;
  
  // Manual triggers
  saveNow(): Promise<AutoSaveResult>;
  saveChunksNow(): Promise<number>;
  savePlayersNow(): Promise<number>;
  
  // Status
  readonly lastSaveTime: number;
  readonly nextSaveTime: number;
  readonly pendingChunks: number;
  readonly pendingPlayers: number;
}

interface AutoSaveConfig {
  // Intervalos
  chunkSaveIntervalMs: number;    // Default: 60000 (1 min)
  playerSaveIntervalMs: number;   // Default: 30000 (30 seg)
  metadataSaveIntervalMs: number; // Default: 300000 (5 min)
  
  // Batching
  maxChunksPerSave: number;       // Default: 50
  maxPlayersPerSave: number;      // Default: 20
  
  // Performance
  saveSpreadMs: number;           // Spread saves over time
  ioThreads: number;              // Parallel I/O threads
  
  // Logging
  logSaves: boolean;
  logDuration: boolean;
}

interface AutoSaveResult {
  chunksSaved: number;
  playersSaved: number;
  metadataSaved: boolean;
  durationMs: number;
  errors: string[];
}
```

#### Scenario: Periodic chunk save
- **WHEN** auto-save interval elapses
- **THEN** dirty chunks SHALL be saved
- **AND** save SHALL not block main thread

#### Scenario: Graceful shutdown
- **WHEN** server is shutting down
- **THEN** all pending data SHALL be saved
- **AND** shutdown SHALL wait for saves to complete

---

### Requirement: Backup System

The system SHALL suportar backups do mundo.

```typescript
interface IBackupSystem {
  // Backup manual
  createBackup(description?: string): Promise<BackupInfo>;
  
  // Backup automático
  scheduleBackup(intervalMs: number): void;
  cancelScheduledBackup(): void;
  
  // Listagem
  listBackups(): Promise<BackupInfo[]>;
  getBackup(backupId: string): Promise<BackupInfo | null>;
  
  // Restauração
  restoreBackup(backupId: string): Promise<void>;
  
  // Gerenciamento
  deleteBackup(backupId: string): Promise<void>;
  deleteOldBackups(keepCount: number): Promise<number>;
  
  // Configuração
  readonly config: BackupConfig;
}

interface BackupInfo {
  id: string;
  createdAt: number;
  description: string;
  sizeBytes: number;
  worldName: string;
  
  // Stats no momento do backup
  chunkCount: number;
  playerCount: number;
  worldTime: number;
}

interface BackupConfig {
  backupDir: string;
  maxBackups: number;           // Manter último N backups
  compressionLevel: number;     // 0-9
  includePlayerData: boolean;
  includeMetadata: boolean;
}
```

#### Scenario: Scheduled backup
- **WHEN** backup interval elapses
- **THEN** backup SHALL be created
- **AND** old backups beyond limit SHALL be deleted

#### Scenario: Backup restoration
- **WHEN** backup is restored
- **THEN** server SHALL stop
- **AND** current data SHALL be archived
- **AND** backup data SHALL replace current

---

## Design Decisions

### Storage Backend Comparison

| Backend | Pros | Cons | Use Case |
|---------|------|------|----------|
| File System | Simples, portável | Lento para queries | Dev, single shard |
| SQLite | Transactions, queries | Single writer | Medium scale |
| PostgreSQL | Escalável, concurrent | Complexidade ops | Production MMO |
| Redis | Rápido, cache | Volátil, memória | Cache layer |

**Decisão**: File system como default, interface para backends escaláveis.

### Chunk Save Strategy

```typescript
// Estratégia de save: dirty tracking + batching
class ChunkSaveQueue {
  private dirtyChunks = new Map<ChunkKey, number>(); // key -> modified timestamp
  private saveInterval = 60000; // 1 minuto
  
  markDirty(chunk: IChunk) {
    const key = chunkKey(chunk.coord);
    if (!this.dirtyChunks.has(key)) {
      this.dirtyChunks.set(key, Date.now());
    }
  }
  
  async processSaveQueue(maxChunks: number): Promise<number> {
    const now = Date.now();
    const toSave: IChunk[] = [];
    
    for (const [key, timestamp] of this.dirtyChunks) {
      if (now - timestamp >= this.saveInterval) {
        const chunk = this.getChunk(key);
        if (chunk) toSave.push(chunk);
        if (toSave.length >= maxChunks) break;
      }
    }
    
    // Batch save
    await this.storage.saveChunks(toSave);
    
    // Remove from dirty set
    for (const chunk of toSave) {
      this.dirtyChunks.delete(chunkKey(chunk.coord));
    }
    
    return toSave.length;
  }
}
```

### Compression Algorithms

**Decisão**: LZ4 para velocidade, zstd opcional para tamanho.

```typescript
interface ICompression {
  compress(data: ArrayBuffer): ArrayBuffer;
  decompress(compressed: ArrayBuffer): ArrayBuffer;
  readonly name: string;
  readonly level: number;
}

// LZ4: ~500MB/s compress, ~2GB/s decompress
class LZ4Compression implements ICompression {
  readonly name = 'lz4';
  constructor(readonly level: number = 1) {}
}

// Zstd: ~200MB/s compress, ~800MB/s decompress, better ratio
class ZstdCompression implements ICompression {
  readonly name = 'zstd';
  constructor(readonly level: number = 3) {}
}

// Chunk-specific: RLE for sparse chunks
function rleEncode(blocks: Uint16Array): ArrayBuffer {
  const runs: Array<{ block: number; count: number }> = [];
  let currentBlock = blocks[0];
  let count = 1;
  
  for (let i = 1; i < blocks.length; i++) {
    if (blocks[i] === currentBlock && count < 65535) {
      count++;
    } else {
      runs.push({ block: currentBlock, count });
      currentBlock = blocks[i];
      count = 1;
    }
  }
  runs.push({ block: currentBlock, count });
  
  // Encode runs
  const buffer = new ArrayBuffer(runs.length * 4);
  const view = new DataView(buffer);
  for (let i = 0; i < runs.length; i++) {
    view.setUint16(i * 4, runs[i].block);
    view.setUint16(i * 4 + 2, runs[i].count);
  }
  
  return buffer;
}
```

### File Layout

```
world/
├── level.dat              # World metadata (JSON)
├── level.dat.backup       # Backup de metadata
├── regions/
│   ├── r.0.0.mvr          # Region (0,0) - chunks 0-31, 0-31
│   ├── r.0.-1.mvr         # Region (0,-1)
│   └── r.-1.0.mvr         # etc.
├── players/
│   ├── player_uuid1.dat
│   └── player_uuid2.dat
├── entities/              # Entidades globais (opcional)
│   └── entity_chunks.dat
└── backups/
    ├── 2024-01-15_12-00-00/
    └── 2024-01-14_12-00-00/
```
