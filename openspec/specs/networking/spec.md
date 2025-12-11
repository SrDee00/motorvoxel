# Networking

Sistema de rede para comunicação cliente-servidor em arquitetura autoritativa, otimizado para jogos MMO voxel.

## Purpose

O sistema de networking é responsável por:
- Comunicação bidirecional cliente-servidor
- Modelo autoritativo (servidor é fonte de verdade)
- Client-side prediction e server reconciliation
- Sincronização de mundo voxel e entidades
- Interest management e escalabilidade MMO

## Arquitetura de Rede

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            CLIENTE                                       │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────┐                │
│  │   Input     │──▶│  Prediction  │──▶│ Local State    │                │
│  │   Handler   │   │   Layer      │   │ (otimista)     │                │
│  └─────────────┘   └──────────────┘   └────────────────┘                │
│         │                                     ▲                          │
│         ▼                                     │                          │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │                    Network Layer                              │        │
│  │   Inputs ────────────▶  WebSocket  ◀──────────── Snapshots   │        │
│  └─────────────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Internet
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            SERVIDOR                                      │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────┐                │
│  │   Input     │──▶│  Simulation  │──▶│ Authoritative  │                │
│  │   Queue     │   │   (tick)     │   │ State          │                │
│  └─────────────┘   └──────────────┘   └────────────────┘                │
│                                               │                          │
│                                               ▼                          │
│  ┌──────────────────────────────────────────────────────────────┐       │
│  │  Interest Manager ─▶ Per-Player Snapshots ─▶ Send to Clients │       │
│  └──────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Requirement: Network Client

The system SHALL fornecer um cliente de rede que conecte ao servidor e gerencie comunicação.

```typescript
interface INetworkClient {
  // Estado
  readonly isConnected: boolean;
  readonly latency: number;           // RTT em ms
  readonly serverTime: number;        // Tempo sincronizado do servidor
  
  // Conexão
  connect(url: string, token?: string): Promise<void>;
  disconnect(): void;
  
  // Envio de mensagens
  sendInput(input: PlayerInput): void;
  sendAction(action: PlayerAction): void;
  sendBlockChange(x: number, y: number, z: number, blockId: BlockId): void;
  
  // Recebimento
  onSnapshot(callback: (snapshot: WorldSnapshot) => void): () => void;
  onChunkData(callback: (chunk: ChunkData) => void): () => void;
  onEvent(callback: (event: GameEvent) => void): () => void;
  
  // Configuração
  readonly config: NetworkClientConfig;
}

interface NetworkClientConfig {
  inputSendRate: number;        // Inputs por segundo (default: 60)
  maxPendingInputs: number;     // Buffer de inputs (default: 64)
  interpolationDelay: number;   // Ms de delay para interpolação (default: 100)
  predictionEnabled: boolean;   // Client-side prediction (default: true)
}
```

#### Scenario: Successful connection
- **WHEN** client connects to valid server URL
- **THEN** WebSocket connection SHALL be established
- **AND** handshake SHALL complete with player authentication
- **AND** initial world state SHALL be received

#### Scenario: Connection failure
- **WHEN** connection cannot be established
- **THEN** promise SHALL reject with descriptive error
- **AND** retry logic MAY be triggered

#### Scenario: Reconnection
- **WHEN** connection is lost unexpectedly
- **THEN** client SHALL attempt automatic reconnection
- **AND** state SHALL be resynchronized upon reconnection

---

### Requirement: Network Server

The system SHALL fornecer um servidor autoritativo que gerencia múltiplos clientes.

```typescript
interface INetworkServer {
  // Estado
  readonly isRunning: boolean;
  readonly playerCount: number;
  readonly tickRate: number;
  
  // Lifecycle
  start(port: number): Promise<void>;
  stop(): Promise<void>;
  
  // Player management
  onPlayerConnect(callback: (player: INetworkPlayer) => void): void;
  onPlayerDisconnect(callback: (player: INetworkPlayer, reason: string) => void): void;
  
  // Broadcast
  broadcastSnapshot(snapshot: WorldSnapshot): void;
  broadcastEvent(event: GameEvent): void;
  
  // Per-player
  sendToPlayer(playerId: PlayerId, message: ServerMessage): void;
  kickPlayer(playerId: PlayerId, reason: string): void;
  
  // World state
  readonly world: IVoxelWorld;
  readonly entities: IEntityManager;
}

interface INetworkPlayer {
  readonly id: PlayerId;
  readonly entityId: EntityId;
  readonly latency: number;
  readonly position: Vec3;
  
  // Input queue
  readonly pendingInputs: PlayerInput[];
  processInput(input: PlayerInput): void;
  
  // Interest
  readonly subscribedChunks: Set<ChunkKey>;
  readonly visibleEntities: Set<EntityId>;
}

interface NetworkServerConfig {
  tickRate: number;             // Ticks por segundo (default: 20)
  maxPlayers: number;           // Jogadores por shard (default: 100)
  snapshotRate: number;         // Snapshots por segundo (default: 20)
  inputBufferSize: number;      // Inputs buffered (default: 5)
}
```

#### Scenario: Server tick loop
- **WHEN** server is running
- **THEN** tick loop SHALL run at configured tickRate
- **AND** inputs SHALL be processed in order
- **AND** simulation SHALL be stepped
- **AND** snapshots SHALL be sent to clients

#### Scenario: Player connection limit
- **WHEN** server reaches maxPlayers
- **THEN** new connections SHALL be rejected with "server full" message
- **OR** queued for connection when slot opens

---

### Requirement: Message Protocol

The system SHALL definir um protocolo de mensagens binário eficiente.

```typescript
// Tipos de mensagem Cliente -> Servidor
const enum ClientMessageType {
  HANDSHAKE = 0x01,
  INPUT = 0x02,
  ACTION = 0x03,
  BLOCK_CHANGE = 0x04,
  CHUNK_REQUEST = 0x05,
  CHAT = 0x06,
  PING = 0x07,
}

// Tipos de mensagem Servidor -> Cliente
const enum ServerMessageType {
  HANDSHAKE_RESPONSE = 0x81,
  SNAPSHOT = 0x82,
  CHUNK_DATA = 0x83,
  ENTITY_SPAWN = 0x84,
  ENTITY_DESTROY = 0x85,
  BLOCK_UPDATE = 0x86,
  EVENT = 0x87,
  CHAT = 0x88,
  PONG = 0x89,
  ERROR = 0x8F,
}

// Estrutura base de mensagem
interface NetworkMessage {
  type: number;
  timestamp: number;
  sequence: number;
  payload: ArrayBuffer;
}

// Serialização
interface IMessageSerializer {
  serialize(message: ClientMessage): ArrayBuffer;
  deserialize(buffer: ArrayBuffer): ServerMessage;
}
```

#### Scenario: Message serialization
- **WHEN** message is serialized
- **THEN** binary format SHALL be used efficiently
- **AND** bit packing SHALL reduce size where possible

#### Scenario: Message ordering
- **WHEN** messages are received
- **THEN** sequence numbers SHALL detect out-of-order delivery
- **AND** critical messages SHALL be processed in order

---

### Requirement: Input Synchronization

The system SHALL sincronizar inputs do cliente com validação no servidor.

```typescript
interface PlayerInput {
  sequence: number;           // Número sequencial do input
  timestamp: number;          // Tempo local do cliente
  
  // Movimento
  moveX: number;              // -1 a 1
  moveZ: number;              // -1 a 1
  yaw: number;                // Ângulo de rotação
  pitch: number;
  
  // Ações
  jump: boolean;
  sprint: boolean;
  sneak: boolean;
  primaryAction: boolean;     // Click esquerdo
  secondaryAction: boolean;   // Click direito
  
  // Metadados
  selectedSlot: number;       // Slot do inventário ativo
}

interface InputValidation {
  validateInput(input: PlayerInput, player: INetworkPlayer): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors?: string[];
  correctedInput?: PlayerInput;
}

// Limites de validação
const INPUT_VALIDATION = {
  maxMoveSpeed: 10,           // m/s (com sprint e boost)
  maxInputRate: 120,          // inputs por segundo
  maxSequenceGap: 60,         // máximo gap de sequência
  maxTimestampDrift: 1000,    // ms de drift permitido
};
```

#### Scenario: Valid input processing
- **WHEN** valid input is received
- **THEN** input SHALL be added to player's input queue
- **AND** processed on next server tick

#### Scenario: Invalid input rejection
- **WHEN** input fails validation
- **THEN** input SHALL be rejected
- **AND** player MAY receive correction message

#### Scenario: Input rate limiting
- **WHEN** inputs arrive faster than allowed rate
- **THEN** excess inputs SHALL be dropped
- **AND** player MAY be warned/kicked

---

### Requirement: Client-Side Prediction

The system SHALL implementar client-side prediction para responsividade.

```typescript
interface IClientPrediction {
  // Estado
  readonly predictedPosition: Vec3;
  readonly pendingInputs: PlayerInput[];
  
  // Processo
  applyInput(input: PlayerInput): void;
  reconcile(serverState: EntityState, lastProcessedInput: number): void;
  
  // Configuração
  maxPredictionFrames: number;    // Máximo de frames a prever
  reconciliationThreshold: number; // Distância para forçar snap
}

interface EntityState {
  entityId: EntityId;
  position: Vec3;
  velocity: Vec3;
  lastProcessedInput: number;     // Último input que o servidor processou
}

// Algoritmo de reconciliação
function reconcile(
  serverState: EntityState,
  pendingInputs: PlayerInput[],
  physics: IPhysicsWorld
): Vec3 {
  // 1. Descartar inputs já processados pelo servidor
  const unprocessedInputs = pendingInputs.filter(
    i => i.sequence > serverState.lastProcessedInput
  );
  
  // 2. Aplicar estado do servidor
  let position = serverState.position.slice() as Vec3;
  
  // 3. Re-simular inputs não processados
  for (const input of unprocessedInputs) {
    position = simulateInput(position, input, physics);
  }
  
  return position;
}
```

#### Scenario: Prediction matches server
- **WHEN** prediction aligns with server state
- **THEN** no correction SHALL be visible to player
- **AND** gameplay SHALL feel responsive

#### Scenario: Prediction mismatch
- **WHEN** server state differs from prediction
- **THEN** reconciliation SHALL be performed
- **AND** pending inputs SHALL be re-applied
- **AND** correction SHALL be smooth (not jarring)

#### Scenario: Large mismatch
- **WHEN** mismatch exceeds reconciliationThreshold
- **THEN** immediate snap to server state MAY occur
- **AND** this indicates potential cheat attempt

---

### Requirement: Entity Interpolation

The system SHALL interpolar entidades remotas para movimento suave.

```typescript
interface IEntityInterpolation {
  // Buffer de snapshots
  addSnapshot(snapshot: EntitySnapshot): void;
  
  // Obtém estado interpolado
  getInterpolatedState(renderTime: number): EntityState;
  
  // Configuração
  bufferTime: number;          // Ms de atraso (default: 100)
  extrapolateLimit: number;    // Ms máximo de extrapolação
}

interface EntitySnapshot {
  timestamp: number;
  entityId: EntityId;
  position: Vec3;
  rotation: Quat;
  velocity: Vec3;
  animation?: AnimationState;
}

// Implementação de interpolação
function interpolateEntities(
  buffer: EntitySnapshot[],
  renderTime: number
): EntityState {
  // Encontra dois snapshots ao redor do renderTime
  const [before, after] = findBracketingSnapshots(buffer, renderTime);
  
  if (!before || !after) {
    // Extrapolação se necessário
    return extrapolate(buffer[buffer.length - 1], renderTime);
  }
  
  // Fator de interpolação
  const t = (renderTime - before.timestamp) / (after.timestamp - before.timestamp);
  
  return {
    position: vec3.lerp([], before.position, after.position, t),
    rotation: quat.slerp([], before.rotation, after.rotation, t),
    velocity: vec3.lerp([], before.velocity, after.velocity, t),
  };
}
```

#### Scenario: Smooth entity movement
- **WHEN** entity positions are interpolated
- **THEN** movement SHALL appear smooth
- **AND** no jittering SHALL be visible

#### Scenario: Extrapolation on packet loss
- **WHEN** no recent snapshots are available
- **THEN** extrapolation SHALL predict position
- **AND** extrapolation SHALL be limited to avoid large errors

---

### Requirement: Interest Management

The system SHALL enviar apenas dados relevantes para cada jogador.

```typescript
interface IInterestManager {
  // Determina chunks de interesse para jogador
  getInterestChunks(player: INetworkPlayer): Set<ChunkKey>;
  
  // Determina entidades de interesse
  getInterestEntities(player: INetworkPlayer): Set<EntityId>;
  
  // Atualiza inscrições quando jogador move
  updatePlayerInterest(player: INetworkPlayer): InterestDelta;
  
  // Configuração
  readonly config: InterestConfig;
}

interface InterestConfig {
  chunkRadius: number;         // Chunks em cada direção (default: 8)
  entityRadius: number;        // Metros para entidades (default: 50)
  updateThreshold: number;     // Metros antes de recalcular (default: 8)
  priorityBoost: number;       // Boost para entidades "importantes"
}

interface InterestDelta {
  addedChunks: ChunkKey[];
  removedChunks: ChunkKey[];
  addedEntities: EntityId[];
  removedEntities: EntityId[];
}

// Priorização de entidades
const enum EntityPriority {
  CRITICAL = 0,    // Sempre enviado (próprio jogador)
  HIGH = 1,        // Entidades interagindo
  NORMAL = 2,      // Jogadores próximos
  LOW = 3,         // Entidades distantes
}
```

#### Scenario: Player receives nearby chunks
- **WHEN** player moves to new area
- **THEN** chunks within radius SHALL be sent
- **AND** chunks fora do raio SHALL ser removidos do cliente

#### Scenario: Entity enters interest
- **WHEN** entity moves into player's interest radius
- **THEN** entity spawn message SHALL be sent
- **AND** entity SHALL begin receiving updates

#### Scenario: Entity priority
- **WHEN** bandwidth is limited
- **THEN** high priority entities SHALL be updated more frequently
- **AND** low priority entities MAY skip updates

---

### Requirement: World State Synchronization

The system SHALL sincronizar alterações do mundo voxel entre servidor e clientes.

```typescript
interface IWorldSync {
  // Bloco individual
  sendBlockChange(
    x: number, y: number, z: number,
    blockId: BlockId,
    players?: INetworkPlayer[]
  ): void;
  
  // Múltiplas mudanças
  sendBlockChanges(
    changes: Array<{ x: number; y: number; z: number; blockId: BlockId }>,
    players?: INetworkPlayer[]
  ): void;
  
  // Chunk completo
  sendChunk(chunk: IChunk, player: INetworkPlayer): void;
  
  // Validação de mudança
  validateBlockChange(
    player: INetworkPlayer,
    x: number, y: number, z: number,
    blockId: BlockId
  ): ValidationResult;
}

interface BlockChangeMessage {
  type: ServerMessageType.BLOCK_UPDATE;
  changes: Array<{
    x: number;
    y: number;
    z: number;
    blockId: BlockId;
  }>;
}

// Validações de alteração de bloco
interface BlockChangeValidation {
  // Jogador está perto o suficiente?
  maxReachDistance: number;     // Default: 5 blocos
  
  // Jogador pode modificar este bloco?
  canModify: (player: INetworkPlayer, blockId: BlockId) => boolean;
  
  // Rate limiting
  maxChangesPerSecond: number;  // Default: 10
}
```

#### Scenario: Valid block placement
- **WHEN** player places block within reach
- **THEN** server SHALL validate placement
- **AND** world SHALL be updated
- **AND** change SHALL be broadcast to interested players

#### Scenario: Invalid block placement
- **WHEN** player attempts invalid block placement
- **THEN** server SHALL reject change
- **AND** correction SHALL be sent to client
- **AND** world state SHALL remain unchanged

---

### Requirement: Delta Compression

The system SHALL usar compressão delta para snapshots.

```typescript
interface IDeltaCompression {
  // Cria snapshot delta
  createDelta(
    baseline: WorldSnapshot,
    current: WorldSnapshot
  ): DeltaSnapshot;
  
  // Aplica delta
  applyDelta(
    baseline: WorldSnapshot,
    delta: DeltaSnapshot
  ): WorldSnapshot;
  
  // Baseline management
  acknowledgeSnapshot(player: INetworkPlayer, sequence: number): void;
}

interface WorldSnapshot {
  sequence: number;
  timestamp: number;
  entities: Map<EntityId, EntitySnapshot>;
  recentBlockChanges: BlockChange[];
}

interface DeltaSnapshot {
  baselineSequence: number;
  currentSequence: number;
  
  // Apenas entidades que mudaram
  changedEntities: EntitySnapshot[];
  removedEntities: EntityId[];
  
  // Apenas blocos que mudaram desde baseline
  blockChanges: BlockChange[];
}

// Compressão adicional
interface ICompressionOptions {
  quantizePositions: boolean;   // Reduzir precisão de posições
  quantizeBits: number;         // Bits por componente (default: 16)
  lz4Compress: boolean;         // Compressão adicional
}
```

#### Scenario: Delta reduces bandwidth
- **WHEN** world state has few changes
- **THEN** delta SHALL be much smaller than full snapshot
- **AND** bandwidth SHALL be conserved

#### Scenario: Full snapshot on baseline loss
- **WHEN** client's baseline is outdated
- **THEN** full snapshot SHALL be sent
- **AND** new baseline SHALL be established

---

## Design Decisions

### WebSocket vs WebTransport

| Aspecto | WebSocket | WebTransport |
|---------|-----------|--------------|
| Suporte | Universal | Chrome 97+, Firefox experimental |
| Protocolo | TCP | QUIC (UDP-based) |
| Latência | Maior (HOL blocking) | Menor |
| Confiabilidade | Garantida | Configurável |
| Streams | Único ordenado | Múltiplos paralelos |

**Decisão**: WebSocket como padrão, WebTransport como upgrade opcional.

```typescript
interface INetworkTransport {
  connect(url: string): Promise<void>;
  disconnect(): void;
  send(data: ArrayBuffer): void;
  onMessage(callback: (data: ArrayBuffer) => void): void;
}

// Factory que escolhe melhor transporte
function createTransport(preferWebTransport: boolean): INetworkTransport {
  if (preferWebTransport && 'WebTransport' in window) {
    return new WebTransportAdapter();
  }
  return new WebSocketAdapter();
}
```

### Tick Rate e Snapshot Rate

**Decisão**: Server tick 20Hz, snapshots 20Hz, input send 60Hz.

```
Cliente                    Servidor
  │                           │
  │──Input 1 (t=0)──────────▶│
  │──Input 2 (t=16ms)────────▶│
  │──Input 3 (t=33ms)────────▶│
  │                           │◀── Tick 1 (processa inputs 1-3)
  │◀──Snapshot 1──────────────│
  │──Input 4 (t=50ms)────────▶│
  │──Input 5 (t=66ms)────────▶│
  │                           │◀── Tick 2
  │◀──Snapshot 2──────────────│
```

**Justificativa**:
- 20 ticks/s é suficiente para física simples
- Inputs a 60Hz capturam responsividade
- Reduce bandwidth vs 60Hz snapshots

### Binary Message Format

**Decisão**: MessagePack com headers customizados.

```typescript
// Header: 8 bytes
// [type: u8][flags: u8][sequence: u16][timestamp: u32]

// Seguido de payload MessagePack

function encodeMessage(msg: NetworkMessage): ArrayBuffer {
  const header = new Uint8Array(8);
  header[0] = msg.type;
  header[1] = msg.flags;
  new Uint16Array(header.buffer, 2, 1)[0] = msg.sequence;
  new Uint32Array(header.buffer, 4, 1)[0] = msg.timestamp;
  
  const payload = msgpack.encode(msg.payload);
  
  const result = new Uint8Array(8 + payload.length);
  result.set(header);
  result.set(payload, 8);
  
  return result.buffer;
}
```

### Shard Architecture

```
                    Load Balancer
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
     ┌─────────┐    ┌─────────┐    ┌─────────┐
     │ Shard 1 │    │ Shard 2 │    │ Shard 3 │
     │ World A │    │ World A │    │ World B │
     │ 0-100   │    │ 100-200 │    │ 0-100   │
     └─────────┘    └─────────┘    └─────────┘
          │              │              │
          └──────────────┴──────────────┘
                         │
                    Redis Pub/Sub
                   (cross-shard events)
```

**Decisão**: Shards por região geográfica do mundo, com Redis para eventos cross-shard.

```typescript
interface IShardManager {
  getShardForPosition(worldX: number, worldZ: number): ShardId;
  transferPlayer(player: INetworkPlayer, targetShard: ShardId): Promise<void>;
  broadcastCrossShard(event: CrossSharSHALLnt): void;
}
```
