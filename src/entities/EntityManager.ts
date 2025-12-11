import { IEntityManager, EntityId, Component, ComponentType, QueryResult } from './types';
import { ComponentRegistry } from './ComponentRegistry';

export class EntityManager implements IEntityManager {
  private nextEntityId = 0;
  private entities: Set<EntityId> = new Set();
  private components: Map<EntityId, Map<number, Component>> = new Map();
  private componentTypeMap: Map<number, Set<EntityId>> = new Map();
  private aliveEntities: Set<EntityId> = new Set();

  createEntity(): EntityId {
    const entityId = this.nextEntityId++;
    this.entities.add(entityId);
    this.aliveEntities.add(entityId);
    this.components.set(entityId, new Map());
    return entityId;
  }

  destroyEntity(entityId: EntityId): void {
    if (!this.aliveEntities.has(entityId)) return;

    // Remove all components
    const entityComponents = this.components.get(entityId);
    if (entityComponents) {
      for (const [componentId, component] of entityComponents) {
        this.removeComponentFromTracking(entityId, componentId);
      }
    }

    this.aliveEntities.delete(entityId);
    this.components.delete(entityId);
  }

  isAlive(entityId: EntityId): boolean {
    return this.aliveEntities.has(entityId);
  }

  addComponent<T extends Component>(entityId: EntityId, component: T): void {
    if (!this.aliveEntities.has(entityId)) {
      throw new Error(`Cannot add component to dead entity ${entityId}`);
    }

    const componentId = (component.constructor as any).componentId;
    if (componentId === undefined) {
      throw new Error(`Component ${component.constructor.name} not registered`);
    }

    // Add to entity
    let entityComponents = this.components.get(entityId);
    if (!entityComponents) {
      entityComponents = new Map();
      this.components.set(entityId, entityComponents);
    }
    entityComponents.set(componentId, component);

    // Add to component tracking
    this.addComponentToTracking(entityId, componentId);
  }

  removeComponent<T extends Component>(entityId: EntityId, componentType: ComponentType<T>): void {
    const componentId = componentType.componentId;
    if (!this.aliveEntities.has(entityId)) return;

    // Remove from entity
    const entityComponents = this.components.get(entityId);
    if (entityComponents) {
      entityComponents.delete(componentId);
    }

    // Remove from tracking
    this.removeComponentFromTracking(entityId, componentId);
  }

  getComponent<T extends Component>(entityId: EntityId, componentType: ComponentType<T>): T | undefined {
    if (!this.aliveEntities.has(entityId)) return undefined;

    const componentId = componentType.componentId;
    const entityComponents = this.components.get(entityId);
    if (!entityComponents) return undefined;

    return entityComponents.get(componentId) as T | undefined;
  }

  hasComponent<T extends Component>(entityId: EntityId, componentType: ComponentType<T>): boolean {
    if (!this.aliveEntities.has(entityId)) return false;

    const componentId = componentType.componentId;
    const entityComponents = this.components.get(entityId);
    if (!entityComponents) return false;

    return entityComponents.has(componentId);
  }

  query<T extends Component[]>(...componentTypes: ComponentType<T[number]>[]): QueryResult<T> {
    const componentIds = componentTypes.map(ct => ct.componentId);
    const result: Array<[EntityId, ...T]> = [];

    // Find entities that have all required components
    for (const entityId of this.aliveEntities) {
      const entityComponents = this.components.get(entityId);
      if (!entityComponents) continue;

      const hasAll = componentIds.every(id => entityComponents.has(id));
      if (hasAll) {
        const components = componentIds.map(id => entityComponents.get(id)) as T;
        result.push([entityId, ...components]);
      }
    }

    return {
      forEach: (callback) => {
        result.forEach(([entity, ...components]) => callback(entity, ...components as T));
      },
      toArray: () => result,
      get count(): number {
        return result.length;
      }
    };
  }

  destroyAll(): void {
    for (const entityId of Array.from(this.aliveEntities)) {
      this.destroyEntity(entityId);
    }
  }

  get entityCount(): number {
    return this.aliveEntities.size;
  }

  get componentCounts(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const [componentId, entities] of this.componentTypeMap) {
      const componentInfo = ComponentRegistry.getComponent(String(componentId));
      if (componentInfo) {
        counts.set(componentInfo.constructor.componentName, entities.size);
      }
    }
    return counts;
  }

  private addComponentToTracking(entityId: EntityId, componentId: number): void {
    if (!this.componentTypeMap.has(componentId)) {
      this.componentTypeMap.set(componentId, new Set());
    }
    this.componentTypeMap.get(componentId)!.add(entityId);
  }

  private removeComponentFromTracking(entityId: EntityId, componentId: number): void {
    const entitiesWithComponent = this.componentTypeMap.get(componentId);
    if (entitiesWithComponent) {
      entitiesWithComponent.delete(entityId);
    }
  }
}