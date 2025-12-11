# Physics

Sistema de física simples e determinístico para movimento de personagens, colisão com o mundo voxel e projéteis.

## Purpose

O sistema de física é responsável por:
- Simulação de movimento com gravidade
- Detecção e resolução de colisão AABB com voxels
- Controlador de personagem (andar, pular, correr)
- Física de projéteis e objetos simples
- Simulação determinística para sincronização cliente-servidor

## Princípios de Design

```
┌──────────────────────────────────────────────────────────────────┐
│                    FÍSICA SIMPLIFICADA                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✓ Gravidade constante                                           │
│  ✓ Colisão AABB vs AABB                                          │
│  ✓ Colisão AABB vs Voxel Grid                                    │
│  ✓ Sliding (deslizar em paredes)                                 │
│  ✓ Stepping (subir blocos baixos)                                │
│  ✓ Raycast contra voxels                                         │
│                                                                   │
│  ✗ Ragdoll                                                        │
│  ✗ Joints/Constraints                                             │
│  ✗ Soft bodies                                                    │
│  ✗ Física de veículos complexa                                    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Requirement: Physics World

The system SHALL fornecer um mundo físico que simule entidades e interaja com o mundo voxel.

```typescript
interface IPhysicsWorld {
  // Configuração
  readonly gravity: Vec3;            // Padrão: [0, -20, 0]
  readonly fixedTimestep: number;    // Padrão: 1/60 segundos
  
  setGravity(x: number, y: number, z: number): void;
  
  // Simulação
  step(deltaTime: number): void;
  
  // Bodies
  createBody(config: PhysicsBodyConfig): IPhysicsBody;
  removeBody(body: IPhysicsBody): void;
  
  // Queries
  raycast(origin: Vec3, direction: Vec3, maxDistance: number): RaycastHit | null;
  overlapAABB(aabb: AABB): IPhysicsBody[];
  
  // Voxel world reference
  setVoxelWorld(world: IVoxelWorld): void;
}

interface PhysicsBodyConfig {
  position: Vec3;
  size: Vec3;              // Half-extents para AABB
  type: 'dynamic' | 'kinematic' | 'static';
  
  // Propriedades físicas
  mass?: number;           // Default: 1
  friction?: number;       // Default: 0.5
  restitution?: number;    // Default: 0 (sem bounce)
  
  // Flags
  affectedByGravity?: boolean;  // Default: true
  isTrigger?: boolean;          // Default: false (apenas eventos, sem colisão)
  
  // Layers para filtragem
  collisionLayer?: number;      // Default: 1
  collisionMask?: number;       // Default: 0xFFFFFFFF
}

interface AABB {
  minX: number; minY: number; minZ: number;
  maxX: number; maxY: number; maxZ: number;
}
```

#### Scenario: Fixed timestep simulation
- **WHEN** step is called with variable deltaTime
- **THEN** simulation SHALL use fixed timestep internally
- **AND** multiple sub-steps MAY occur if deltaTime > fixedTimestep
- **AND** remainder time SHALL be accumulated for next frame

#### Scenario: Gravity application
- **WHEN** dynamic body is simulated
- **THEN** gravity SHALL be applied to velocity each step
- **AND** terminal velocity SHALL be respected

#### Scenario: Body creation
- **WHEN** physics body is created
- **THEN** body SHALL be added to simulation
- **AND** unique ID SHALL be assigned

---

### Requirement: Physics Body

The system SHALL representar corpos físicos com AABB e propriedades de movimento.

```typescript
interface IPhysicsBody {
  readonly id: number;
  readonly type: 'dynamic' | 'kinematic' | 'static';
  
  // Transform
  position: Vec3;
  velocity: Vec3;
  
  // Shape
  readonly halfExtents: Vec3;
  readonly aabb: AABB;  // Computed from position + halfExtents
  
  // State
  isOnGround: boolean;
  isInWater: boolean;
  
  // Métodos
  applyForce(force: Vec3): void;
  applyImpulse(impulse: Vec3): void;
  setPosition(x: number, y: number, z: number): void;
  setVelocity(x: number, y: number, z: number): void;
  
  // Callbacks
  onCollision?: (other: IPhysicsBody | 'voxel', normal: Vec3) => void;
  onTriggerEnter?: (other: IPhysicsBody) => void;
  onTriggerExit?: (other: IPhysicsBody) => void;
}

// Constantes típicas
const PLAYER_HALF_EXTENTS: Vec3 = [0.3, 0.9, 0.3];  // 0.6x1.8x0.6 metros
const GRAVITY_ACCELERATION = -20;
const MAX_FALL_SPEED = -50;
const GROUND_CHECK_EPSILON = 0.01;
```

#### Scenario: Dynamic body movement
- **WHEN** dynamic body has velocity
- **THEN** position SHALL be updated by velocity * deltaTime
- **AND** velocity SHALL be affected by gravity

#### Scenario: Ground detection
- **WHEN** body is on solid ground
- **THEN** isOnGround SHALL be true
- **AND** Y velocity SHALL be zero if falling

#### Scenario: Kinematic body
- **WHEN** body is kinematic
- **THEN** position SHALL be directly controllable
- **AND** gravity SHALL NOT apply
- **BUT** it SHALL still collide with others

---

### Requirement: Voxel Collision Detection

The system SHALL detectar e resolver colisões entre physics bodies e o mundo voxel.

```typescript
interface IVoxelCollider {
  // Testa colisão de AABB contra voxels
  testAABB(aabb: AABB, world: IVoxelWorld): VoxelCollisionResult;
  
  // Move AABB e resolve colisões (sweep)
  sweepAABB(
    aabb: AABB,
    velocity: Vec3,
    world: IVoxelWorld,
    deltaTime: number
  ): SweepResult;
  
  // Raycast contra voxels
  raycast(
    origin: Vec3,
    direction: Vec3,
    maxDistance: number,
    world: IVoxelWorld
  ): VoxelRaycastHit | null;
}

interface VoxelCollisionResult {
  colliding: boolean;
  penetration: Vec3;           // Vetor de separação mínima
  collidedBlocks: BlockCoord[];
}

interface SweepResult {
  finalPosition: Vec3;
  remainingVelocity: Vec3;
  hitGround: boolean;
  hitCeiling: boolean;
  hitWall: boolean;
  hitNormal: Vec3;
  collisions: CollisionInfo[];
}

interface CollisionInfo {
  time: number;                // 0-1, quando ocorreu
  normal: Vec3;                // Normal da superfície
  blockCoord: BlockCoord;
  blockType: BlockId;
}
```

#### Scenario: AABB sweep collision
- **WHEN** body moves through solid blocks
- **THEN** collision SHALL be detected at correct time
- **AND** body SHALL stop at collision surface
- **AND** remaining velocity SHALL be available for sliding

#### Scenario: Sliding along walls
- **WHEN** body collides with wall while moving diagonally
- **THEN** movement component along wall SHALL continue
- **AND** movement component into wall SHALL be zeroed

#### Scenario: Corner collision
- **WHEN** body collides with corner of block
- **THEN** resolution SHALL prioritize most impactful axis
- **AND** no tunneling through corners SHALL occur

---

### Requirement: Player Controller

The system SHALL fornecer um controlador de personagem com movimento suave e responsivo.

```typescript
interface IPlayerController {
  readonly body: IPhysicsBody;
  
  // Estado atual
  readonly isOnGround: boolean;
  readonly isJumping: boolean;
  readonly isSprinting: boolean;
  readonly isSneaking: boolean;
  readonly isInWater: boolean;
  
  // Input
  setMoveInput(x: number, z: number): void;  // -1 a 1
  jump(): void;
  setSprinting(sprinting: boolean): void;
  setSneaking(sneaking: boolean): void;
  
  // Update
  update(deltaTime: number): void;
  
  // Configuração
  readonly config: PlayerControllerConfig;
}

interface PlayerControllerConfig {
  // Velocidades
  walkSpeed: number;           // Default: 4.0 m/s
  sprintSpeed: number;         // Default: 6.0 m/s
  sneakSpeed: number;          // Default: 1.5 m/s
  
  // Pulo
  jumpVelocity: number;        // Default: 8.0 m/s
  jumpCooldown: number;        // Default: 0.1 s
  coyoteTime: number;          // Default: 0.1 s (tempo após sair de plataforma que ainda pode pular)
  jumpBufferTime: number;      // Default: 0.1 s (buffer de input de pulo)
  
  // Física de movimento
  acceleration: number;        // Default: 50.0
  deceleration: number;        // Default: 40.0
  airAcceleration: number;     // Default: 10.0
  airControl: number;          // Default: 0.3 (multiplicador de controle no ar)
  
  // Step
  stepHeight: number;          // Default: 0.5 (altura máxima para subir automaticamente)
  
  // Dimensões
  height: number;              // Default: 1.8
  width: number;               // Default: 0.6
  eyeHeight: number;           // Default: 1.6
}
```

#### Scenario: Ground movement
- **WHEN** player is on ground with move input
- **THEN** player SHALL accelerate toward target velocity
- **AND** sprint multiplier SHALL apply if sprinting

#### Scenario: Air control
- **WHEN** player is in air with move input
- **THEN** air acceleration SHALL be reduced
- **AND** some directional control SHALL remain

#### Scenario: Jump with coyote time
- **WHEN** player walks off edge and jumps within coyoteTime
- **THEN** jump SHALL succeed as if still on ground

#### Scenario: Jump buffer
- **WHEN** player presses jump before landing
- **THEN** jump SHALL execute upon landing if within bufferTime

#### Scenario: Step up small obstacles
- **WHEN** player walks into block ≤ stepHeight
- **THEN** player SHALL automatically step up
- **AND** movement SHALL continue smoothly

---

### Requirement: Projectile Physics

The system SHALL suportar física simples de projéteis.

```typescript
interface IProjectile extends IPhysicsBody {
  readonly owner: EntityId;
  readonly damage: number;
  
  // Comportamento
  readonly lifetime: number;           // Segundos antes de despawn
  readonly piercing: boolean;          // Atravessa entidades?
  readonly affectedByGravity: boolean;
  
  // Callbacks
  onHitEntity?: (entity: EntityId) => void;
  onHitBlock?: (coord: BlockCoord, face: BlockFace) => void;
  onExpire?: () => void;
}

interface ProjectileConfig {
  startPosition: Vec3;
  direction: Vec3;
  speed: number;
  owner: EntityId;
  damage: number;
  
  // Opcional
  gravity?: number;            // Multiplicador de gravidade (0 = sem queda)
  lifetime?: number;           // Default: 5 segundos
  size?: Vec3;                 // Default: [0.1, 0.1, 0.1]
  piercing?: boolean;          // Default: false
}

interface IProjectileManager {
  spawn(config: ProjectileConfig): IProjectile;
  update(deltaTime: number): void;
  removeAll(): void;
  
  readonly activeProjectiles: IProjectile[];
}
```

#### Scenario: Projectile hits block
- **WHEN** projectile intersects solid block
- **THEN** onHitBlock callback SHALL be called
- **AND** projectile SHALL be destroyed (unless piercing)

#### Scenario: Projectile hits entity
- **WHEN** projectile intersects entity hitbox
- **THEN** onHitEntity callback SHALL be called
- **AND** damage should be processed by game logic

#### Scenario: Projectile lifetime
- **WHEN** projectile exceeds lifetime
- **THEN** onExpire callback SHALL be called
- **AND** projectile SHALL be removed

---

### Requirement: Deterministic Simulation

The system SHALL produzir resultados determinísticos para sincronização cliente-servidor.

```typescript
interface IDeterministicPhysics {
  // Seed para random se necessário
  setSeed(seed: number): void;
  
  // Snapshot do estado
  saveState(): PhysicsState;
  loadState(state: PhysicsState): void;
  
  // Step determinístico
  stepFixed(inputs: PhysicsInputs): void;
}

interface PhysicsState {
  bodies: Array<{
    id: number;
    position: [number, number, number];
    velocity: [number, number, number];
    flags: number;  // isOnGround, isInWater, etc.
  }>;
  timestamp: number;
}

interface PhysicsInputs {
  timestamp: number;
  playerInputs: Map<EntityId, PlayerInput>;
}

interface PlayerInput {
  moveX: number;     // -1 to 1
  moveZ: number;     // -1 to 1
  jump: boolean;
  sprint: boolean;
  sneak: boolean;
  yaw: number;       // Direção que o jogador está olhando
}
```

#### Scenario: Same inputs same result
- **WHEN** physics is stepped with identical inputs and state
- **THEN** result SHALL be bit-identical
- **AND** floating point operations SHALL be deterministic

#### Scenario: State save/restore
- **WHEN** state is saved and restored
- **THEN** simulation SHALL continue identically
- **AND** this enables rollback for network reconciliation

---

### Requirement: Collision Layers

The system SHALL suportar filtragem de colisões por layers.

```typescript
// Layers predefinidas
const enum CollisionLayer {
  DEFAULT = 1 << 0,
  PLAYER = 1 << 1,
  ENEMY = 1 << 2,
  PROJECTILE = 1 << 3,
  TRIGGER = 1 << 4,
  ITEM = 1 << 5,
  VOXEL = 1 << 6,
}

// Exemplo de configuração
const PLAYER_COLLISION_CONFIG = {
  layer: CollisionLayer.PLAYER,
  // Colide com: voxels, inimigos, itens, triggers
  mask: CollisionLayer.VOXEL | CollisionLayer.ENEMY | CollisionLayer.ITEM | CollisionLayer.TRIGGER,
};

const PROJECTILE_COLLISION_CONFIG = {
  layer: CollisionLayer.PROJECTILE,
  // Colide com: voxels, inimigos, players
  mask: CollisionLayer.VOXEL | CollisionLayer.ENEMY | CollisionLayer.PLAYER,
};
```

#### Scenario: Layer filtering
- **WHEN** collision is tested between two bodies
- **THEN** collision SHALL only be processed if (A.layer & B.mask) && (B.layer & A.mask)

#### Scenario: Trigger overlap
- **WHEN** body enters trigger zone
- **THEN** trigger events SHALL fire
- **BUT** physical response SHALL NOT occur

---

## Design Decisions

### Fixed Point vs Floating Point

**Decisão**: Usar floating point com cuidado em operações determinísticas.

```typescript
// Para determinismo, usar operações consistentes:
// - Mesmo timestep fixo em cliente e servidor
// - Evitar funções transcendentais onde possível
// - Ordem de operações idêntica

const FIXED_TIMESTEP = 1 / 60;  // Exatamente, não 0.01666...

function stepPhysics(body: IPhysicsBody, dt: number) {
  // Ordem de atualização consistente
  body.velocity[1] += GRAVITY * dt;
  body.velocity[1] = Math.max(body.velocity[1], MAX_FALL_SPEED);
  
  body.position[0] += body.velocity[0] * dt;
  body.position[1] += body.velocity[1] * dt;
  body.position[2] += body.velocity[2] * dt;
}
```

### Sweep vs Discrete Collision

**Decisão**: Usar swept AABB para movimento contínuo.

**Justificativa**:
- Evita tunneling (passar através de paredes finas)
- Mais preciso para velocidades altas
- Custo computacional aceitável para quantidades típicas de entidades

```typescript
// Sweep detecta colisão entre frames
function sweepAABB(
  aabb: AABB,
  velocity: Vec3,
  dt: number
): SweepResult {
  // Expande AABB na direção do movimento
  const swept = expandAABB(aabb, velocity, dt);
  
  // Testa contra todos blocos no caminho
  const blocks = getBlocksInAABB(swept);
  
  // Encontra primeiro hit
  let earliestT = 1.0;
  // ... collision logic
}
```

### Step Height Implementation

**Decisão**: Implementar step como teste de movimento vertical seguido de horizontal.

```typescript
function tryStep(body: IPhysicsBody, horizontal: Vec3): boolean {
  const stepHeight = body.config.stepHeight;
  
  // 1. Pode subir? (espaço acima)
  const upTest = testMove(body, [0, stepHeight, 0]);
  if (upTest.blocked) return false;
  
  // 2. Pode mover horizontalmente lá em cima?
  const forwardTest = testMove(body, horizontal, stepHeight);
  if (forwardTest.blocked) return false;
  
  // 3. Desce até encontrar chão
  const downTest = testMove(body, [0, -stepHeight, 0], forwardTest.position);
  
  // Aplica se encontrou chão válido
  if (downTest.hitGround) {
    body.position = downTest.position;
    return true;
  }
  
  return false;
}
```

### Separating Axes for AABB

**Decisão**: Usar Separating Axis Theorem simplificado para AABB.

```typescript
function aabbVsAABB(a: AABB, b: AABB): boolean {
  // Se separados em qualquer eixo, não colidem
  if (a.maxX < b.minX || a.minX > b.maxX) return false;
  if (a.maxY < b.minY || a.minY > b.maxY) return false;
  if (a.maxZ < b.minZ || a.minZ > b.maxZ) return false;
  return true;
}

function aabbPenetration(a: AABB, b: AABB): Vec3 | null {
  // Calcula overlap em cada eixo
  const overlapX = Math.min(a.maxX - b.minX, b.maxX - a.minX);
  const overlapY = Math.min(a.maxY - b.minY, b.maxY - a.minY);
  const overlapZ = Math.min(a.maxZ - b.minZ, b.maxZ - a.minZ);
  
  if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) {
    return null;  // Não colidem
  }
  
  // Retorna eixo de menor penetração
  if (overlapX <= overlapY && overlapX <= overlapZ) {
    return [overlapX * Math.sign(a.centerX - b.centerX), 0, 0];
  } else if (overlapY <= overlapZ) {
    return [0, overlapY * Math.sign(a.centerY - b.centerY), 0];
  } else {
    return [0, 0, overlapZ * Math.sign(a.centerZ - b.centerZ)];
  }
}
```
