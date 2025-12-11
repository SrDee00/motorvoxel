export type EntityId = number;
export type ComponentType<T> = {
    new (...args: any[]): T;
    componentId: number;
    componentName: string;
};
export interface IEntityManager {
    createEntity(): EntityId;
    destroyEntity(entityId: EntityId): void;
    isAlive(entityId: EntityId): boolean;
    addComponent<T extends Component>(entityId: EntityId, component: T): void;
    removeComponent<T extends Component>(entityId: EntityId, componentType: ComponentType<T>): void;
    getComponent<T extends Component>(entityId: EntityId, componentType: ComponentType<T>): T | undefined;
    hasComponent<T extends Component>(entityId: EntityId, componentType: ComponentType<T>): boolean;
    query<T extends Component[]>(...componentTypes: ComponentType<T[number]>[]): QueryResult<T>;
    destroyAll(): void;
    readonly entityCount: number;
    readonly componentCounts: Map<string, number>;
}
export interface QueryResult<T extends Component[]> {
    forEach(callback: (entity: EntityId, ...components: T) => void): void;
    toArray(): Array<[EntityId, ...T]>;
    readonly count: number;
}
export declare abstract class Component {
    static readonly componentId: number;
    static readonly componentName: string;
}
export declare abstract class System {
    abstract readonly name: string;
    priority: number;
    readonly dependencies: string[];
    init(): void;
    update(deltaTime: number): void;
    destroy(): void;
    enabled: boolean;
}
export interface ISystemManager {
    register(system: System): void;
    unregister(systemName: string): void;
    get(systemName: string): System | undefined;
    update(deltaTime: number): void;
    fixedUpdate(fixedDeltaTime: number): void;
    enable(systemName: string): void;
    disable(systemName: string): void;
    reorderSystems(): void;
    getSystems(): readonly System[];
}
export interface IEntityPrefab {
    readonly name: string;
    create(manager: IEntityManager, overrides?: ComponentOverrides): EntityId;
}
export type ComponentOverrides = Partial<{
    [K in keyof ComponentMap]: Partial<ComponentMap[K]>;
}>;
export interface IEntityFactory {
    registerPrefab(prefab: IEntityPrefab): void;
    create(prefabName: string, overrides?: ComponentOverrides): EntityId;
    get(prefabName: string): IEntityPrefab | undefined;
}
export interface IEntitySerializer {
    serialize(entityId: EntityId): SerializedEntity;
    deserialize(data: SerializedEntity): EntityId;
    serializeComponents(entityId: EntityId, componentTypes: string[]): ComponentData[];
    serializeDelta(entityId: EntityId, lastSnapshot: SerializedEntity): DeltaEntity | null;
}
export interface SerializedEntity {
    id: EntityId;
    prefab?: string;
    components: ComponentData[];
}
export interface ComponentData {
    type: string;
    data: Record<string, unknown>;
}
export interface DeltaEntity {
    id: EntityId;
    changed: ComponentData[];
    removed: string[];
}
export interface ISerializableComponent {
    serialize(): Record<string, unknown>;
    deserialize(data: Record<string, unknown>): void;
}
export interface ComponentMap {
    Transform: TransformComponent;
    Velocity: VelocityComponent;
    Renderable: RenderableComponent;
    PhysicsBody: PhysicsBodyComponent;
    Networked: NetworkedComponent;
    Health: HealthComponent;
    Player: PlayerComponent;
    VoxelInteractor: VoxelInteractorComponent;
    Inventory: InventoryComponent;
}
export interface TransformComponent extends Component {
    position: [number, number, number];
    rotation: [number, number, number, number];
    scale: [number, number, number];
}
export interface VelocityComponent extends Component {
    linear: [number, number, number];
    angular: [number, number, number];
}
export interface RenderableComponent extends Component {
    meshId: string;
    materialId: string;
    visible: boolean;
    castShadow: boolean;
}
export interface PhysicsBodyComponent extends Component {
    bodyType: 'dynamic' | 'kinematic' | 'static';
    mass: number;
    friction: number;
    restitution: number;
    collisionLayer: number;
    collisionMask: number;
}
export interface NetworkedComponent extends Component {
    ownerId: number;
    lastUpdate: number;
    interpolate: boolean;
    priority: EntityPriority;
}
export interface HealthComponent extends Component {
    current: number;
    maximum: number;
    regeneration: number;
    invulnerable: boolean;
}
export interface PlayerComponent extends Component {
    playerId: number;
    username: string;
    lastInput: any | null;
}
export interface VoxelInteractorComponent extends Component {
    reachDistance: number;
    targetBlock: any | null;
    targetFace: any | null;
}
export interface InventoryComponent extends Component {
    slots: Array<any | null>;
    selectedSlot: number;
}
export declare enum EntityPriority {
    CRITICAL = 0,
    HIGH = 1,
    NORMAL = 2,
    LOW = 3
}
