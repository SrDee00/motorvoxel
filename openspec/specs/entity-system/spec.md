# Entity System

Sistema de entidades baseado em Entity-Component-System (ECS) para gerenciamento eficiente de objetos de jogo.

## Purpose

O sistema de entidades é responsável por:
- Gerenciamento de ciclo de vida de entidades
- Organização de dados em componentes
- Execução de sistemas para lógica de jogo
- Queries eficientes de entidades por componentes
- Sincronização de estado com rede

## Arquitetura ECS

```
┌─────────────────────────────────────────────────────────────────────────┐
│                             ENTITY SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ENTITIES                 COMPONENTS                 SYSTEMS            │
│  ┌─────┐                  ┌──────────┐               ┌─────────────┐    │
│  │ E1  │ ────────────────▶│Transform │◀──────────────│MovementSys  │    │
│  │ E2  │                  │Velocity  │               │PhysicsSys   │    │
│  │ E3  │ ────────────────▶│Renderable│◀──────────────│RenderSys    │    │
│  │ ... │                  │Networked │               │NetworkSys   │    │
│  │ En  │                  │Health    │               │CombatSys    │    │
│  └─────┘                  │...       │               │...          │    │
│                           └──────────┘               └─────────────┘    │
│                                                                          │
│  Entity: apenas um ID     Component: apenas dados   System: apenas lógica│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Requirement: Entity Manager

The system SHALL fornecer um gerenciador central para criação e destruição de entidades.

```typescript
// ID único de entidade
type EntityId = number;

interface IEntityManager {
  // Criação e destruição
  createEntity(): EntityId;
  destroyEntity(entityId: EntityId): void;
  isAlive(entityId: EntityId): boolean;
  
  // Componentes
  addComponent<T extends Component>(
    entityId: EntityId,
    component: T
  ): void;
  
  removeComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType<T>
  ): void;
  
  getComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType<T>
  ): T | undefined;
  
  hasComponent<T extends Component>(
    entityId: EntityId,
    componentType: ComponentType<T>
  ): boolean;
  
  // Queries
  query<T extends Component[]>(
    ...componentTypes: ComponentTypes<T>
  ): QueryResult<T>;
  
  // Bulk operations
  destroyAll(): void;
  
  // Stats
  readonly entityCount: number;
  readonly componentCounts: Map<string, number>;
}

// Tipos auxiliares
type ComponentType<T> = { new(...args: any[]): T; componentId: number };
type ComponentTypes<T extends Component[]> = { [K in keyof T]: ComponentType<T[K]> };

interface QueryResult<T extends Component[]> {
  forEach(callback: (entity: EntityId, ...components: T) => void): void;
  toArray(): Array<[EntityId, ...T]>;
  readonly count: number;
}
```

#### Scenario: Entity creation
- **WHEN** createEntity is called
- **THEN** unique EntityId SHALL be returned
- **AND** entity SHALL be marked as alive

#### Scenario: Entity destruction
- **WHEN** destroyEntity is called
- **THEN** all components SHALL be removed
- **AND** entity SHALL be marked as not alive
- **AND** ID MAY be recycled after grace period

#### Scenario: Component query
- **WHEN** query is executed with component types
- **THEN** all entities with ALL specified components SHALL be returned
- **AND** query SHALL be efficient (O(n) where n = matching entities)

---

### Requirement: Component Definition

The system SHALL definir componentes como containers de dados puros.

```typescript
// Classe base para componentes
abstract class Component {
  static readonly componentId: number;
  static readonly componentName: string;
}

// Decorador para registrar componentes
function component(name: string) {
  return function<T extends { new(...args: any[]): Component }>(constructor: T) {
    const id = ComponentRegistry.register(name, constructor);
    constructor.prototype.componentId = id;
    constructor.prototype.componentName = name;
    return constructor;
  };
}

// Componentes fundamentais
@component('Transform')
class TransformComponent extends Component {
  position: Vec3 = [0, 0, 0];
  rotation: Quat = [0, 0, 0, 1];
  scale: Vec3 = [1, 1, 1];
}

@component('Velocity')
class VelocityComponent extends Component {
  linear: Vec3 = [0, 0, 0];
  angular: Vec3 = [0, 0, 0];
}

@component('Renderable')
class RenderableComponent extends Component {
  meshId: string = '';
  materialId: string = '';
  visible: boolean = true;
  castShadow: boolean = true;
}

@component('PhysicsBody')
class PhysicsBodyComponent extends Component {
  bodyType: 'dynamic' | 'kinematic' | 'static' = 'dynamic';
  mass: number = 1;
  friction: number = 0.5;
  restitution: number = 0;
  collisionLayer: number = 1;
  collisionMask: number = 0xFFFFFFFF;
}

@component('Networked')
class NetworkedComponent extends Component {
  ownerId: PlayerId = 0;
  lastUpdate: number = 0;
  interpolate: boolean = true;
  priority: EntityPriority = EntityPriority.NORMAL;
}

@component('Health')
class HealthComponent extends Component {
  current: number = 100;
  maximum: number = 100;
  regeneration: number = 0;
  invulnerable: boolean = false;
}

@component('Player')
class PlayerComponent extends Component {
  playerId: PlayerId = 0;
  username: string = '';
  lastInput: PlayerInput | null = null;
}

@component('VoxelInteractor')
class VoxelInteractorComponent extends Component {
  reachDistance: number = 5;
  targetBlock: BlockCoord | null = null;
  targetFace: BlockFace | null = null;
}

@component('Inventory')
class InventoryComponent extends Component {
  slots: Array<ItemStack | null> = new Array(36).fill(null);
  selectedSlot: number = 0;
}
```

#### Scenario: Component registration
- **WHEN** component class is decorated with @component
- **THEN** unique componentId SHALL be assigned
- **AND** component SHALL be queryable by type

#### Scenario: Component data isolation
- **WHEN** component is added to entity
- **THEN** component instance SHALL be unique to that entity
- **AND** modifications SHALL not affect other entities

---

### Requirement: System Execution

The system SHALL fornecer um framework para sistemas que processam entidades.

```typescript
abstract class System {
  // Identificação
  abstract readonly name: string;
  
  // Ordem de execução
  priority: number = 0;
  
  // Dependências
  readonly dependencies: string[] = [];
  
  // Referências
  protected entities!: IEntityManager;
  protected world!: IVoxelWorld;
  protected events!: IEventBus;
  
  // Lifecycle
  abstract init(): void;
  abstract update(deltaTime: number): void;
  destroy(): void {}
  
  // Ativação
  enabled: boolean = true;
}

interface ISystemManager {
  // Registro
  register(system: System): void;
  unregister(systemName: string): void;
  get(systemName: string): System | undefined;
  
  // Execução
  update(deltaTime: number): void;
  fixedUpdate(fixedDeltaTime: number): void;
  
  // Controle
  enable(systemName: string): void;
  disable(systemName: string): void;
  
  // Ordenação
  reorderSystems(): void;
  
  readonly systems: readonly System[];
}

// Exemplo de sistema
class MovementSystem extends System {
  readonly name = 'Movement';
  priority = 100;  // Executa antes de física
  
  private query!: QueryResult<[TransformComponent, VelocityComponent]>;
  
  init() {
    this.query = this.entities.query(TransformComponent, VelocityComponent);
  }
  
  update(deltaTime: number) {
    this.query.forEach((entity, transform, velocity) => {
      vec3.scaleAndAdd(
        transform.position,
        transform.position,
        velocity.linear,
        deltaTime
      );
    });
  }
}
```

#### Scenario: System execution order
- **WHEN** systems are updated
- **THEN** systems SHALL execute in priority order
- **AND** dependencies SHALL be respected

#### Scenario: Query caching
- **WHEN** query is created in system init
- **THEN** query results SHALL be cached
- **AND** automatically updated when entities change

#### Scenario: System enabling/disabling
- **WHEN** system is disabled
- **THEN** update SHALL NOT be called
- **AND** re-enabling SHALL resume updates

---

### Requirement: Entity Prefabs

The system SHALL suportar templates de entidades para criação consistente.

```typescript
interface IEntityPrefab {
  readonly name: string;
  create(manager: IEntityManager, overrides?: ComponentOverrides): EntityId;
}

type ComponentOverrides = Partial<{
  [K in keyof ComponentMap]: Partial<ComponentMap[K]>;
}>;

interface IEntityFactory {
  registerPrefab(prefab: IEntityPrefab): void;
  create(prefabName: string, overrides?: ComponentOverrides): EntityId;
  get(prefabName: string): IEntityPrefab | undefined;
}

// Prefab de jogador
const PlayerPrefab: IEntityPrefab = {
  name: 'Player',
  create(manager, overrides = {}) {
    const entity = manager.createEntity();
    
    manager.addComponent(entity, Object.assign(new TransformComponent(), {
      position: [0, 64, 0],
      ...overrides.Transform,
    }));
    
    manager.addComponent(entity, Object.assign(new VelocityComponent(), {
      ...overrides.Velocity,
    }));
    
    manager.addComponent(entity, Object.assign(new PhysicsBodyComponent(), {
      bodyType: 'dynamic',
      mass: 80,
      ...overrides.PhysicsBody,
    }));
    
    manager.addComponent(entity, Object.assign(new RenderableComponent(), {
      meshId: 'player_model',
      ...overrides.Renderable,
    }));
    
    manager.addComponent(entity, Object.assign(new HealthComponent(), {
      maximum: 100,
      current: 100,
      ...overrides.Health,
    }));
    
    manager.addComponent(entity, Object.assign(new PlayerComponent(), {
      ...overrides.Player,
    }));
    
    manager.addComponent(entity, Object.assign(new NetworkedComponent(), {
      priority: EntityPriority.CRITICAL,
      ...overrides.Networked,
    }));
    
    manager.addComponent(entity, new VoxelInteractorComponent());
    manager.addComponent(entity, new InventoryComponent());
    
    return entity;
  },
};

// Prefab de projétil
const ProjectilePrefab: IEntityPrefab = {
  name: 'Projectile',
  create(manager, overrides = {}) {
    const entity = manager.createEntity();
    
    manager.addComponent(entity, Object.assign(new TransformComponent(), {
      ...overrides.Transform,
    }));
    
    manager.addComponent(entity, Object.assign(new VelocityComponent(), {
      ...overrides.Velocity,
    }));
    
    manager.addComponent(entity, Object.assign(new PhysicsBodyComponent(), {
      bodyType: 'kinematic',
      collisionLayer: CollisionLayer.PROJECTILE,
      ...overrides.PhysicsBody,
    }));
    
    manager.addComponent(entity, Object.assign(new ProjectileComponent(), {
      ...overrides.Projectile,
    }));
    
    manager.addComponent(entity, Object.assign(new NetworkedComponent(), {
      priority: EntityPriority.HIGH,
      ...overrides.Networked,
    }));
    
    return entity;
  },
};
```

#### Scenario: Prefab instantiation
- **WHEN** prefab is instantiated
- **THEN** entity SHALL have all prefab components
- **AND** overrides SHALL modify default values

#### Scenario: Prefab reusability
- **WHEN** multiple entities are created from same prefab
- **THEN** each entity SHALL be independent
- **AND** prefab definition SHALL be unchanged

---

### Requirement: Entity Events

The system SHALL emitir eventos sobre mudanças de entidades.

```typescript
interface EntityEvents {
  'entity:created': { entityId: EntityId };
  'entity:destroyed': { entityId: EntityId };
  'entity:component:added': { 
    entityId: EntityId; 
    componentType: string;
    component: Component;
  };
  'entity:component:removed': {
    entityId: EntityId;
    componentType: string;
  };
}

// Lifecycle hooks nos sistemas
abstract class System {
  // Chamado quando entidade com componentes de interesse é criada
  onEntityAdded?(entity: EntityId): void;
  
  // Chamado quando entidade perde componentes de interesse
  onEntityRemoved?(entity: EntityId): void;
}

// Exemplo de uso
class RenderSystem extends System {
  readonly name = 'Render';
  
  private renderables = new Map<EntityId, RenderObject>();
  
  init() {
    // Escuta entidades com Renderable
    this.events.on('entity:component:added', ({ entityId, componentType }) => {
      if (componentType === 'Renderable') {
        this.onEntityAdded(entityId);
      }
    });
  }
  
  onEntityAdded(entity: EntityId) {
    const renderable = this.entities.getComponent(entity, RenderableComponent);
    const transform = this.entities.getComponent(entity, TransformComponent);
    
    if (renderable && transform) {
      this.renderables.set(entity, this.createRenderObject(renderable, transform));
    }
  }
}
```

#### Scenario: Entity creation event
- **WHEN** entity is created
- **THEN** 'entity:created' event SHALL be emitted
- **AND** systems MAY react to it

#### Scenario: Component change events
- **WHEN** component is added or removed
- **THEN** appropriate event SHALL be emitted
- **AND** queries SHALL be automatically updated

---

### Requirement: Entity Serialization

The system SHALL suportar serialização de entidades para rede e persistência.

```typescript
interface IEntitySerializer {
  // Serializa entidade completa
  serialize(entityId: EntityId): SerializedEntity;
  
  // Deserializa e cria entidade
  deserialize(data: SerializedEntity): EntityId;
  
  // Serializa apenas componentes específicos
  serializeComponents(
    entityId: EntityId,
    componentTypes: string[]
  ): ComponentData[];
  
  // Serializa delta desde último snapshot
  serializeDelta(
    entityId: EntityId,
    lastSnapshot: SerializedEntity
  ): DeltaEntity | null;
}

interface SerializedEntity {
  id: EntityId;
  prefab?: string;
  components: ComponentData[];
}

interface ComponentData {
  type: string;
  data: Record<string, unknown>;
}

interface DeltaEntity {
  id: EntityId;
  changed: ComponentData[];
  removed: string[];
}

// Componentes serializáveis SHALLm implementar
interface ISerializableComponent {
  serialize(): Record<string, unknown>;
  deserialize(data: Record<string, unknown>): void;
}
```

#### Scenario: Full entity serialization
- **WHEN** entity is serialized
- **THEN** all components SHALL be included
- **AND** data SHALL be reconstructible

#### Scenario: Delta serialization
- **WHEN** entity delta is serialized
- **THEN** only changed components SHALL be included
- **AND** bandwidth SHALL be minimized

---

## Core Systems

### MovementSystem
Processa velocidade e atualiza posições.

### PhysicsSystem
Integra com engine de física, sincroniza componentes.

### NetworkSystem
Sincroniza entidades networked com servidor.

### RenderSystem
Gerencia objetos de renderização para entidades.

### InputSystem
Processa input do jogador e gera inputs para rede.

### AISystem
Processa lógica de NPCs e inimigos.

### CombatSystem
Processa dano, morte e respawn.

### VoxelInteractionSystem
Processa raycast e interação com blocos.

### InventorySystem
Gerencia inventário e uso de itens.

---

## Design Decisions

### Archetype-based vs Sparse Set ECS

**Decisão**: Usar sparse sets para simplicidade inicial.

```typescript
// Sparse Set: cada tipo de componente tem seu próprio Map
class ComponentStorage<T extends Component> {
  private components = new Map<EntityId, T>();
  
  add(entity: EntityId, component: T): void {
    this.components.set(entity, component);
  }
  
  get(entity: EntityId): T | undefined {
    return this.components.get(entity);
  }
  
  remove(entity: EntityId): void {
    this.components.delete(entity);
  }
  
  has(entity: EntityId): boolean {
    return this.components.has(entity);
  }
}

// Query itera sobre menor storage
function executeQuery<A, B>(
  storageA: ComponentStorage<A>,
  storageB: ComponentStorage<B>,
): Iterable<[EntityId, A, B]> {
  const smaller = storageA.size <= storageB.size ? storageA : storageB;
  // Itera sobre menor, checa no maior
}
```

**Justificativa**:
- Mais simples de implementar
- Boa performance para quantidades típicas (<10k entidades)
- Pode migrar para archetypes se necessário

### Entity ID Recycling

**Decisão**: Usar IDs incrementais com grace period antes de reciclar.

```typescript
class EntityIdAllocator {
  private nextId = 0;
  private freeIds: number[] = [];
  private recycleDelay = 60;  // frames
  private pendingRecycle: Array<{ id: number; frame: number }> = [];
  
  allocate(): EntityId {
    // Processa IDs prontos para reciclar
    const currentFrame = getFrameNumber();
    while (this.pendingRecycle.length > 0) {
      const oldest = this.pendingRecycle[0];
      if (currentFrame - oldest.frame >= this.recycleDelay) {
        this.freeIds.push(oldest.id);
        this.pendingRecycle.shift();
      } else {
        break;
      }
    }
    
    if (this.freeIds.length > 0) {
      return this.freeIds.pop()!;
    }
    
    return this.nextId++;
  }
  
  free(id: EntityId): void {
    this.pendingRecycle.push({ id, frame: getFrameNumber() });
  }
}
```

**Justificativa**:
- Evita referências stale após destruição
- Permite IDs compactos para rede
- Grace period previne problemas de timing

### Component Data Layout

**Decisão**: Componentes como classes com campos públicos.

```typescript
// Abordagem escolhida: Classe com campos
class TransformComponent {
  position: Vec3 = [0, 0, 0];
  rotation: Quat = [0, 0, 0, 1];
  scale: Vec3 = [1, 1, 1];
}

// Alternativa não escolhida: Struct of Arrays (melhor cache)
// class TransformStorage {
//   positionsX: Float32Array;
//   positionsY: Float32Array;
//   ...
// }
```

**Justificativa**:
- Mais ergonômico para TypeScript
- Menor complexidade de implementação
- Performance aceitável para quantidades esperadas
- Pode otimizar hot paths individualmente

### System Dependencies

```typescript
// Ordem típica de execução
const SYSTEM_PRIORITIES = {
  // Input primeiro
  Input: 1000,
  PlayerController: 900,
  
  // Lógica de jogo
  AI: 800,
  Combat: 700,
  VoxelInteraction: 600,
  
  // Física
  Physics: 500,
  Movement: 400,
  
  // Rede
  Network: 300,
  
  // Renderização por último
  Animation: 200,
  Render: 100,
};
```
