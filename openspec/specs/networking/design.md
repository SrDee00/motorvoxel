# Networking Design

Decisões técnicas de arquitetura para a camada de rede com servidor autoritativo.

## Context

O sistema de rede é crítico para a experiência MMO. Deve balancear:
- Responsividade (latência percebida baixa)
- Segurança (servidor autoritativo)
- Escalabilidade (muitos jogadores)
- Bandwidth (minimizar dados transferidos)

## Goals / Non-Goals

**Goals:**
- Servidor como fonte de verdade para todo estado crítico
- Latência percebida abaixo de 100ms em redes típicas
- Suporte inicial a 50-100 jogadores por shard
- Anti-cheat robusto via validação server-side

**Non-Goals:**
- P2P networking
- LAN multiplayer sem servidor
- Criptografia end-to-end (usa TLS padrão WebSocket)

## Decisions

### Decision: Protocol Stack

WebSocket sobre TCP com fallback behavior definido.

```
┌─────────────────────────────────────┐
│         Application Layer            │
│  (Game Messages, Snapshots, Inputs) │
├─────────────────────────────────────┤
│         Serialization Layer          │
│    (MessagePack, Binary Protocol)   │
├─────────────────────────────────────┤
│         Transport Layer              │
│       (WebSocket / WebTransport)    │
├─────────────────────────────────────┤
│         Security Layer               │
│          (TLS / DTLS)               │
└─────────────────────────────────────┘
```

**Alternatives considered:**
1. **WebRTC Data Channels**: Complexidade de setup, NAT traversal issues
2. **Raw TCP via WebSocket only**: Sem opção de UDP-like behavior
3. **Custom WebSocket protocol**: Overengineering

**Rationale:**
WebSocket oferece compatibilidade universal. WebTransport (quando disponível) adiciona unreliable delivery para mensagens não-críticas.

### Decision: Message Serialization

MessagePack para payload com header binário customizado.

```
Message Format (variable length):
┌────────────────────────────────────────────┐
│ Header (8 bytes)                           │
│ ├─ Type (1 byte)                           │
│ ├─ Flags (1 byte)                          │
│ ├─ Sequence (2 bytes, uint16)              │
│ └─ Timestamp (4 bytes, uint32, ms)         │
├────────────────────────────────────────────┤
│ Payload (MessagePack encoded, variable)    │
└────────────────────────────────────────────┘

Flags:
  bit 0: compressed
  bit 1: reliable (requires ack)
  bit 2: ordered (respect sequence)
  bit 3-7: reserved
```

**Alternatives considered:**
1. **JSON**: Verbose, parsing overhead
2. **Protocol Buffers**: Schema required, overkill
3. **FlatBuffers**: Zero-copy nice, but learning curve

**Rationale:**
MessagePack é schemaless, compacto (~30% menor que JSON), e tem excelentes libs JavaScript.

### Decision: Client-Side Prediction Model

Client prediz locally, servidor corrige, reconciliação suave.

```
Timeline:
Client                           Server

T=0:  Input A (predicted)        
      State = predict(A)  ─────▶ Input A received
                                 
T=50: Input B (predicted)        Process A
      State = predict(B)         State_A = authoritative
                          ◀───── Snapshot(state_A, lastInput=A)
                                 
T=100: Receive Snapshot          Process B
       Compare prediction        State_B = authoritative
       If mismatch:
         Reset to server state
         Re-apply B (unconfirmed)
       
T=150:                    ◀───── Snapshot(state_B, lastInput=B)
       B confirmed, no replay
```

```typescript
class ClientPrediction {
  private pendingInputs: PlayerInput[] = [];
  private serverState: EntityState;
  
  applyInput(input: PlayerInput) {
    // Apply locally immediately
    this.localState = this.simulate(this.localState, input);
    this.pendingInputs.push(input);
  }
  
  receiveServerState(serverState: EntityState) {
    // Remove confirmed inputs
    this.pendingInputs = this.pendingInputs.filter(
      i => i.sequence > serverState.lastProcessedInput
    );
    
    // Check if prediction was correct
    const predictedPos = this.localState.position;
    const serverPos = serverState.position;
    const diff = vec3.distance(predictedPos, serverPos);
    
    if (diff > RECONCILIATION_THRESHOLD) {
      // Reset to server and replay
      this.localState = serverState;
      for (const input of this.pendingInputs) {
        this.localState = this.simulate(this.localState, input);
      }
    }
  }
}
```

**Alternatives considered:**
1. **No prediction (display delay)**: Ruins responsiveness
2. **Client authoritative**: Opens to cheating
3. **Lockstep**: Too laggy for action games

**Rationale:**
Prediction + reconciliation oferece melhor UX para latência típica de internet.

### Decision: Entity Interpolation

Buffer de 100ms com lerp para entidades remotas.

```typescript
class EntityInterpolator {
  private buffer: EntitySnapshot[] = [];
  private bufferTime = 100; // ms
  
  addSnapshot(snapshot: EntitySnapshot) {
    this.buffer.push(snapshot);
    // Keep buffer size manageable
    while (this.buffer.length > 20) {
      this.buffer.shift();
    }
  }
  
  getInterpolatedState(renderTime: number): EntityState {
    const targetTime = renderTime - this.bufferTime;
    
    // Find bracketing snapshots
    let before: EntitySnapshot | null = null;
    let after: EntitySnapshot | null = null;
    
    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].timestamp <= targetTime &&
          this.buffer[i + 1].timestamp >= targetTime) {
        before = this.buffer[i];
        after = this.buffer[i + 1];
        break;
      }
    }
    
    if (!before || !after) {
      // Extrapolate from last known
      return this.extrapolate(this.buffer[this.buffer.length - 1], targetTime);
    }
    
    // Interpolate
    const t = (targetTime - before.timestamp) / (after.timestamp - before.timestamp);
    return this.lerp(before, after, t);
  }
}
```

**Rationale:**
100ms buffer covers typical internet jitter while keeping delay acceptable.

### Decision: Interest Management

Grid-based spatial partitioning for efficient interest calculation.

```typescript
class InterestManager {
  private gridSize = 32; // World units (2 chunks)
  private playerInterest = new Map<PlayerId, InterestState>();
  
  updatePlayerInterest(player: INetworkPlayer): InterestDelta {
    const gridX = Math.floor(player.position[0] / this.gridSize);
    const gridZ = Math.floor(player.position[2] / this.gridSize);
    
    const oldInterest = this.playerInterest.get(player.id);
    const newCells = this.getCellsInRadius(gridX, gridZ, this.viewRadius);
    
    // Calculate delta
    const added: Set<GridCell> = new Set();
    const removed: Set<GridCell> = new Set();
    
    for (const cell of newCells) {
      if (!oldInterest?.cells.has(cell)) {
        added.add(cell);
      }
    }
    
    if (oldInterest) {
      for (const cell of oldInterest.cells) {
        if (!newCells.has(cell)) {
          removed.add(cell);
        }
      }
    }
    
    return { 
      addedEntities: this.getEntitiesInCells(added),
      removedEntities: this.getEntitiesInCells(removed),
    };
  }
}
```

**Alternatives considered:**
1. **Distance check to all entities**: O(n²), doesn't scale
2. **Octree**: Over-complex for mostly 2D distribution
3. **Per-chunk interest**: Chunk-locked, less flexible

**Rationale:**
Grid is simple, efficient O(1) cell lookup, and works well for XZ-focused interest (height is usually irrelevant for MMO interest).

### Decision: Server Tick Rate

20 ticks/second for simulation, 20 snapshots/second to clients.

```
Tick Budget (50ms per tick):

Network receive:     5ms   (10%)
Input processing:   10ms   (20%)
Physics step:       15ms   (30%)
Entity updates:     10ms   (20%)
Snapshot creation:   5ms   (10%)
Network send:        5ms   (10%)
─────────────────────────────────
Total:              50ms   (100%)
```

**Alternatives considered:**
1. **60 tick**: Better responsiveness, but limits player count
2. **10 tick**: Saves bandwidth, but noticeable lag
3. **Variable tick**: Complexity, determinism issues

**Rationale:**
20 tick is industry standard for MMOs, provides good balance of responsiveness and scalability.

## Risks / Trade-offs

### Risk: WebSocket connection issues
- **Risk**: Unreliable connections, especially on mobile
- **Mitigation**: Automatic reconnection logic
- **Mitigation**: Session state preserved for reconnection window

### Risk: Cheating via client modification
- **Risk**: Modified clients sending invalid data
- **Mitigation**: Server validates ALL client inputs
- **Mitigation**: Rate limiting, physics bounds checking
- **Mitigation**: Server never trusts position/state from client

### Trade-off: Interpolation delay
- **Pro**: Smooth movement for remote entities
- **Con**: 100ms additional latency for interactions
- **Decision**: Acceptable for MMO, can reduce for competitive modes

### Trade-off: Prediction complexity
- **Pro**: Responsive local player control
- **Con**: Occasional visible corrections
- **Decision**: Worth it, corrections are rare in normal play

## Migration Plan

### Phase 1: Basic Connection
1. WebSocket server (Node.js + ws)
2. Basic message protocol
3. Connection/disconnection handling

### Phase 2: Authoritative State
1. Server-side player simulation
2. Input processing pipeline
3. Snapshot generation

### Phase 3: Client Prediction
1. Client-side prediction
2. Server reconciliation
3. Entity interpolation

### Phase 4: Optimization
1. Delta compression
2. Interest management
3. Bandwidth optimization

### Future: Sharding
1. Redis for cross-shard communication
2. Player transfer protocol
3. Load balancing

## Open Questions

1. **WebTransport adoption timeline?**
   - When to prioritize WebTransport over WebSocket?
   - Need to monitor browser support

2. **Snapshot compression level?**
   - Trade-off between CPU and bandwidth
   - Profile with real player counts

3. **Interest management for flying?**
   - Current assumes ground-level play
   - May need height-aware interest for flying mounts
