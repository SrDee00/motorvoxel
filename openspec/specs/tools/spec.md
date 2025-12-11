# Tools

Ferramentas de desenvolvimento, debug e administração para a engine voxel.

## Purpose

O sistema de ferramentas é responsável por:
- Debug de chunks e performance
- Logging e profiling
- Ferramentas de administração do servidor
- Inspeção de estado em tempo real
- SHALLloper console e comandos

## Arquitetura de Ferramentas

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TOOLS LAYER                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  CLIENT TOOLS                       SERVER TOOLS                        │
│  ┌────────────────┐                 ┌────────────────┐                  │
│  │ Debug Overlay  │                 │ Admin Console  │                  │
│  │ Chunk Viewer   │                 │ Player Manager │                  │
│  │ Performance    │                 │ World Inspector│                  │
│  │ Entity Debug   │                 │ Metrics Export │                  │
│  └────────────────┘                 └────────────────┘                  │
│                                                                          │
│  SHARED TOOLS                                                            │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  Logger │ Profiler │ Config Editor │ Command System               │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Requirement: Debug Overlay

The system SHALL fornecer overlay de debug para visualização de informações em tempo real.

```typescript
interface IDebugOverlay {
  // Controle
  show(): void;
  hide(): void;
  toggle(): void;
  readonly isVisible: boolean;
  
  // Panels
  enablePanel(panel: DebugPanel): void;
  disablePanel(panel: DebugPanel): void;
  isPanelEnabled(panel: DebugPanel): boolean;
  
  // Custom data
  setValue(key: string, value: string | number): void;
  removeValue(key: string): void;
  
  // Sections
  beginSection(name: string): void;
  endSection(): void;
}

const enum DebugPanel {
  FPS = 'fps',
  POSITION = 'position',
  CHUNK = 'chunk',
  ENTITIES = 'entities',
  NETWORK = 'network',
  MEMORY = 'memory',
  RENDERER = 'renderer',
  PHYSICS = 'physics',
  CUSTOM = 'custom',
}

// Layout esperado do overlay
/*
┌─────────────────────────────────────┐
│ FPS: 60 (16.67ms)                   │
│ Position: 123.45, 64.00, -789.12    │
│ Chunk: 7, 0, -50                    │
│ Biome: Forest                       │
│ ─────────────────────────────────── │
│ Entities: 156 (visible: 42)         │
│ Loaded Chunks: 289                  │
│ Pending Meshes: 3                   │
│ ─────────────────────────────────── │
│ Network:                            │
│   Latency: 45ms                     │
│   Bytes/s: ↓ 12.5KB  ↑ 2.3KB       │
│ ─────────────────────────────────── │
│ Renderer:                           │
│   Draw Calls: 312                   │
│   Triangles: 1.2M                   │
│   GPU Memory: 256MB                 │
└─────────────────────────────────────┘
*/
```

#### Scenario: Toggle overlay
- **WHEN** F3 or configured key is pressed
- **THEN** debug overlay SHALL toggle visibility

#### Scenario: Panel selection
- **WHEN** specific panels are enabled
- **THEN** only those panels SHALL be displayed
- **AND** layout SHALL adjust accordingly

---

### Requirement: Performance Profiler

The system SHALL coletar e exibir métricas de performance.

```typescript
interface IProfiler {
  // Scopes
  beginScope(name: string): void;
  endScope(): void;
  
  // Marcar pontos
  mark(name: string): void;
  
  // Medição de tempo
  time(name: string): () => void;  // Retorna função para parar
  
  // Métricas customizadas
  counter(name: string, value: number): void;
  gauge(name: string, value: number): void;
  histogram(name: string, value: number): void;
  
  // Resultados
  getFrameProfile(): FrameProfile;
  getAverages(frames: number): ProfileAverages;
  
  // Exportação
  exportTrace(): string;  // Chrome Trace format
  exportCSV(): string;
  
  // Controle
  start(): void;
  stop(): void;
  reset(): void;
  readonly isRecording: boolean;
}

interface FrameProfile {
  frameNumber: number;
  totalTimeMs: number;
  scopes: ScopeProfile[];
  markers: MarkerProfile[];
  counters: Map<string, number>;
}

interface ScopeProfile {
  name: string;
  startMs: number;
  durationMs: number;
  children: ScopeProfile[];
  selfTimeMs: number;       // Tempo sem filhos
}

// Uso típico
function gameLoop() {
  profiler.beginScope('Frame');
  
  profiler.beginScope('Update');
  updateGame();
  profiler.endScope();
  
  profiler.beginScope('Physics');
  updatePhysics();
  profiler.endScope();
  
  profiler.beginScope('Render');
  renderFrame();
  profiler.endScope();
  
  profiler.counter('entities', entityCount);
  profiler.counter('chunks', loadedChunkCount);
  
  profiler.endScope();
}

// Resultado visual
/*
Frame (16.2ms)
├─ Update (2.1ms)
│  ├─ Input (0.3ms)
│  ├─ AI (0.8ms)
│  └─ Network (1.0ms)
├─ Physics (3.5ms)
│  ├─ Collision (2.8ms)
│  └─ Resolution (0.7ms)
└─ Render (10.6ms)
   ├─ Culling (0.5ms)
   ├─ Meshing (2.1ms)
   ├─ Draw (7.5ms)
   └─ Swap (0.5ms)
*/
```

#### Scenario: Frame profiling
- **WHEN** profiler is active
- **THEN** all scopes SHALL be timed accurately
- **AND** hierarchy SHALL be maintained

#### Scenario: Export trace
- **WHEN** trace is exported
- **THEN** format SHALL be compatible with Chrome's about:tracing
- **AND** can be analyzed offline

---

### Requirement: Chunk Debug Visualization

The system SHALL visualizar informações de chunks para debug.

```typescript
interface IChunkDebugger {
  // Ativar/desativar
  enable(): void;
  disable(): void;
  readonly isEnabled: boolean;
  
  // Opções de visualização
  showChunkBorders: boolean;
  showChunkCoords: boolean;
  showLoadState: boolean;
  showMeshState: boolean;
  showSections: boolean;
  showLOD: boolean;
  
  // Informações específicas
  highlightChunk(cx: number, cy: number, cz: number): void;
  clearHighlight(): void;
  
  // Estatísticas por chunk
  getChunkStats(cx: number, cy: number, cz: number): ChunkDebugStats | null;
}

interface ChunkDebugStats {
  coord: ChunkCoord;
  
  // Estado
  loadState: 'loading' | 'loaded' | 'unloading' | 'unloaded';
  meshState: 'pending' | 'generating' | 'ready' | 'outdated';
  isDirty: boolean;
  
  // Dados
  blockCount: number;           // Não-ar
  uniqueBlockTypes: number;
  nonEmptySections: number;
  
  // Mesh
  vertexCount: number;
  triangleCount: number;
  meshSizeBytes: number;
  lastMeshTimeMs: number;
  
  // Rede
  lastNetworkUpdate: number;
  pendingBlockChanges: number;
}

// Cores de visualização
const CHUNK_COLORS = {
  loading: 'rgba(255, 255, 0, 0.3)',    // Amarelo
  loaded: 'rgba(0, 255, 0, 0.1)',       // Verde claro
  dirty: 'rgba(255, 128, 0, 0.3)',      // Laranja
  generating: 'rgba(0, 128, 255, 0.3)', // Azul
  unloading: 'rgba(255, 0, 0, 0.2)',    // Vermelho
};
```

#### Scenario: Chunk border visualization
- **WHEN** chunk borders are enabled
- **THEN** wireframe boundaries SHALL be rendered
- **AND** chunk coordinates SHALL be displayed

#### Scenario: Load state colors
- **WHEN** load state visualization is enabled
- **THEN** chunks SHALL be tinted based on state
- **AND** problematic chunks SHALL be easily identifiable

---

### Requirement: Logger System

The system SHALL fornecer logging estruturado.

```typescript
interface ILogger {
  // Níveis de log
  trace(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  fatal(message: string, ...args: unknown[]): void;
  
  // Logger filho com contexto
  child(context: LogContext): ILogger;
  
  // Configuração
  setLevel(level: LogLevel): void;
  addTransport(transport: ILogTransport): void;
  removeTransport(transport: ILogTransport): void;
}

interface LogContext {
  module?: string;
  playerId?: PlayerId;
  chunkCoord?: ChunkCoord;
  entityId?: EntityId;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  context: LogContext;
  args: unknown[];
  stack?: string;
}

const enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

interface ILogTransport {
  readonly name: string;
  log(entry: LogEntry): void;
  flush?(): Promise<void>;
}

// Transports padrão
class ConsoleTransport implements ILogTransport {
  readonly name = 'console';
  // Colored output no console
}

class FileTransport implements ILogTransport {
  readonly name = 'file';
  // Rotação de arquivos
  readonly maxFileSize: number;
  readonly maxFiles: number;
}

class NetworkTransport implements ILogTransport {
  readonly name = 'network';
  // Envia para serviço de logging remoto
}

// Uso
const logger = createLogger({ module: 'ChunkManager' });
logger.info('Loading chunk', { cx: 5, cz: 10 });
logger.error('Failed to generate mesh', { error: err.message });
```

#### Scenario: Structured logging
- **WHEN** log is created with context
- **THEN** context SHALL be included in output
- **AND** can be used for filtering/searching

#### Scenario: Log rotation
- **WHEN** file transport reaches max size
- **THEN** new file SHALL be created
- **AND** old files SHALL be rotated/deleted

---

### Requirement: Command System

The system SHALL fornecer sistema de comandos para debug e administração.

```typescript
interface ICommandSystem {
  // Registro
  register(command: ICommand): void;
  unregister(commandName: string): void;
  
  // Execução
  execute(input: string, executor?: CommandExecutor): CommandResult;
  
  // Completar
  getSuggestions(partial: string): string[];
  
  // Listagem
  getCommands(): ICommand[];
  getCommand(name: string): ICommand | undefined;
  
  // Histórico
  readonly history: string[];
  addToHistory(input: string): void;
}

interface ICommand {
  readonly name: string;
  readonly description: string;
  readonly usage: string;
  readonly aliases: string[];
  readonly permission?: string;
  
  execute(args: string[], executor: CommandExecutor): CommandResult;
  getSuggestions?(args: string[], argIndex: number): string[];
}

interface CommandExecutor {
  type: 'console' | 'player' | 'script';
  playerId?: PlayerId;
  
  sendMessage(message: string): void;
  hasPermission(permission: string): boolean;
}

interface CommandResult {
  success: boolean;
  message?: string;
  data?: unknown;
}

// Comandos padrão

// /tp <x> <y> <z>
const TeleportCommand: ICommand = {
  name: 'tp',
  description: 'Teleport player to coordinates',
  usage: '/tp <x> <y> <z>',
  aliases: ['teleport'],
  permission: 'admin.teleport',
  
  execute(args, executor) {
    if (args.length < 3) {
      return { success: false, message: 'Usage: ' + this.usage };
    }
    
    const [x, y, z] = args.map(Number);
    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      return { success: false, message: 'Coordinates must be numbers' };
    }
    
    // Teleport logic
    teleportPlayer(executor.playerId, x, y, z);
    return { success: true, message: `Teleported to ${x}, ${y}, ${z}` };
  },
  
  getSuggestions(args, argIndex) {
    if (argIndex === 0) return ['~'];  // Relativo
    return [];
  },
};

// /setblock <x> <y> <z> <block>
// /give <player> <item> [count]
// /time <set|add> <value>
// /weather <clear|rain|thunder>
// /kick <player> [reason]
// /stats
// /reload
// /save-all
```

#### Scenario: Command execution
- **WHEN** valid command is entered
- **THEN** command SHALL be executed
- **AND** result SHALL be returned

#### Scenario: Tab completion
- **WHEN** partial command is entered
- **THEN** possible completions SHALL be suggested

#### Scenario: Permission check
- **WHEN** command requires permission
- **THEN** executor's permissions SHALL be checked
- **AND** denied if insufficient

---

### Requirement: Server Admin Panel

The system SHALL fornecer painel de administração para o servidor.

```typescript
interface IAdminPanel {
  // HTTP endpoint
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  
  // Autenticação
  authenticate(token: string): AdminSession | null;
  
  // Endpoints típicos
  getServerStatus(): ServerStatus;
  getPlayers(): PlayerInfo[];
  getWorldInfo(): WorldInfo;
  getPerformanceMetrics(): PerformanceMetrics;
  
  // Ações
  kickPlayer(playerId: PlayerId, reason: string): void;
  banPlayer(playerId: PlayerId, reason: string, duration?: number): void;
  broadcastMessage(message: string): void;
  saveWorld(): Promise<void>;
  stopServer(graceful: boolean): Promise<void>;
}

interface ServerStatus {
  uptime: number;
  playerCount: number;
  maxPlayers: number;
  tps: number;                    // Ticks per second
  memoryUsage: MemoryInfo;
  cpuUsage: number;
  version: string;
}

interface PlayerInfo {
  playerId: PlayerId;
  username: string;
  position: Vec3;
  latency: number;
  joinTime: number;
  gameMode: string;
}

interface PerformanceMetrics {
  fps: TimeSeries;
  tps: TimeSeries;
  memoryMB: TimeSeries;
  playerCount: TimeSeries;
  chunkCount: TimeSeries;
  entityCount: TimeSeries;
  networkInKBps: TimeSeries;
  networkOutKBps: TimeSeries;
}

interface TimeSeries {
  timestamps: number[];
  values: number[];
  min: number;
  max: number;
  avg: number;
}
```

#### Scenario: Remote monitoring
- **WHEN** admin connects to panel
- **THEN** real-time metrics SHALL be displayed
- **AND** actions SHALL be available

#### Scenario: Player management
- **WHEN** admin selects player
- **THEN** player info SHALL be displayed
- **AND** kick/ban actions SHALL be available

---

### Requirement: Memory Profiler

The system SHALL fornecer ferramentas de análise de memória.

```typescript
interface IMemoryProfiler {
  // Snapshot atual
  getSnapshot(): MemorySnapshot;
  
  // Comparação
  compareSnapshots(before: MemorySnapshot, after: MemorySnapshot): MemoryDiff;
  
  // Tracking
  trackAllocations(enable: boolean): void;
  getRecentAllocations(): AllocationInfo[];
  
  // Helpers
  getObjectSize(obj: unknown): number;
  getRetainedSize(obj: unknown): number;
  
  // GC
  requestGC(): void;
  getGCStats(): GCStats;
}

interface MemorySnapshot {
  timestamp: number;
  heapUsedMB: number;
  heapTotalMB: number;
  externalMB: number;
  arrayBuffersMB: number;
  
  // Por categoria
  categories: Map<string, CategoryMemory>;
}

interface CategoryMemory {
  name: string;
  usedMB: number;
  objectCount: number;
}

interface MemoryDiff {
  heapDiffMB: number;
  categoryDiffs: Map<string, number>;
  likelyLeaks: AllocationInfo[];
}

// Categorias de memória típicas para engine voxel
const MEMORY_CATEGORIES = [
  'chunks',           // Dados de chunks
  'meshes',           // Buffers de mesh
  'textures',         // Texturas GPU
  'entities',         // Dados de entidades
  'network',          // Buffers de rede
  'physics',          // Dados de física
  'audio',            // Buffers de áudio
  'cache',            // Caches diversos
];
```

#### Scenario: Memory leak detection
- **WHEN** snapshots are compared over time
- **THEN** growing allocations SHALL be identified
- **AND** potential leaks SHALL be reported

#### Scenario: Category breakdown
- **WHEN** memory snapshot is taken
- **THEN** usage per category SHALL be available
- **AND** largest consumers SHALL be identifiable

---

## Design Decisions

### Debug Overlay Implementation

**Decisão**: HTML overlay para máxima compatibilidade.

```typescript
class HTMLDebugOverlay implements IDebugOverlay {
  private container: HTMLDivElement;
  private panels: Map<DebugPanel, HTMLDivElement> = new Map();
  
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'debug-overlay';
    this.container.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #fff;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      pointer-events: none;
      z-index: 9999;
    `;
    document.body.appendChild(this.container);
  }
}
```

### Profiler Overhead

**Decisão**: Profiler desativado por padrão, overhead mínimo quando inativo.

```typescript
class Profiler implements IProfiler {
  private enabled = false;
  private scopeStack: string[] = [];
  
  beginScope(name: string) {
    if (!this.enabled) return;
    // Lógica de profiling...
  }
  
  // Versão inline compilada quando desativado
  // O JIT pode eliminar chamadas vazias
}
```

### Log Levels por Ambiente

```typescript
const DEFAULT_LOG_LEVELS = {
  SHALLlopment: LogLevel.DEBUG,
  staging: LogLevel.INFO,
  production: LogLevel.WARN,
};

// Em produção, logs de debug nem são processados
if (currentLevel > LogLevel.DEBUG) {
  logger.debug = () => {}; // No-op
  logger.trace = () => {};
}
```

### Keybindings de Debug

```
F1  - Help/Commands list
F2  - Screenshot
F3  - Debug overlay toggle
F4  - Chunk debug toggle
F5  - Reload shaders
F6  - Profiler toggle
F7  - Free camera toggle
F8  - Performance graph
F9  - Network debug
F10 - Memory snapshot
F11 - Fullscreen
F12 - DevTools (browser)

Shift+F3 - Detailed debug info
Ctrl+F3  - Copy debug info to clipboard
```
