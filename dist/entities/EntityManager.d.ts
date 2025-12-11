import { IEntityManager, EntityId, Component, ComponentType, QueryResult } from './types';
export declare class EntityManager implements IEntityManager {
    private nextEntityId;
    private entities;
    private components;
    private componentTypeMap;
    private aliveEntities;
    createEntity(): EntityId;
    destroyEntity(entityId: EntityId): void;
    isAlive(entityId: EntityId): boolean;
    addComponent<T extends Component>(entityId: EntityId, component: T): void;
    removeComponent<T extends Component>(entityId: EntityId, componentType: ComponentType<T>): void;
    getComponent<T extends Component>(entityId: EntityId, componentType: ComponentType<T>): T | undefined;
    hasComponent<T extends Component>(entityId: EntityId, componentType: ComponentType<T>): boolean;
    query<T extends Component[]>(...componentTypes: ComponentType<T[number]>[]): QueryResult<T>;
    destroyAll(): void;
    get entityCount(): number;
    get componentCounts(): Map<string, number>;
    private addComponentToTracking;
    private removeComponentFromTracking;
}
