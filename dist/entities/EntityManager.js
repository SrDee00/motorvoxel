import { ComponentRegistry } from './ComponentRegistry';
export class EntityManager {
    constructor() {
        this.nextEntityId = 0;
        this.entities = new Set();
        this.components = new Map();
        this.componentTypeMap = new Map();
        this.aliveEntities = new Set();
    }
    createEntity() {
        const entityId = this.nextEntityId++;
        this.entities.add(entityId);
        this.aliveEntities.add(entityId);
        this.components.set(entityId, new Map());
        return entityId;
    }
    destroyEntity(entityId) {
        if (!this.aliveEntities.has(entityId))
            return;
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
    isAlive(entityId) {
        return this.aliveEntities.has(entityId);
    }
    addComponent(entityId, component) {
        if (!this.aliveEntities.has(entityId)) {
            throw new Error(`Cannot add component to dead entity ${entityId}`);
        }
        const componentId = component.constructor.componentId;
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
    removeComponent(entityId, componentType) {
        const componentId = componentType.componentId;
        if (!this.aliveEntities.has(entityId))
            return;
        // Remove from entity
        const entityComponents = this.components.get(entityId);
        if (entityComponents) {
            entityComponents.delete(componentId);
        }
        // Remove from tracking
        this.removeComponentFromTracking(entityId, componentId);
    }
    getComponent(entityId, componentType) {
        if (!this.aliveEntities.has(entityId))
            return undefined;
        const componentId = componentType.componentId;
        const entityComponents = this.components.get(entityId);
        if (!entityComponents)
            return undefined;
        return entityComponents.get(componentId);
    }
    hasComponent(entityId, componentType) {
        if (!this.aliveEntities.has(entityId))
            return false;
        const componentId = componentType.componentId;
        const entityComponents = this.components.get(entityId);
        if (!entityComponents)
            return false;
        return entityComponents.has(componentId);
    }
    query(...componentTypes) {
        const componentIds = componentTypes.map(ct => ct.componentId);
        const result = [];
        // Find entities that have all required components
        for (const entityId of this.aliveEntities) {
            const entityComponents = this.components.get(entityId);
            if (!entityComponents)
                continue;
            const hasAll = componentIds.every(id => entityComponents.has(id));
            if (hasAll) {
                const components = componentIds.map(id => entityComponents.get(id));
                result.push([entityId, ...components]);
            }
        }
        return {
            forEach: (callback) => {
                result.forEach(([entity, ...components]) => callback(entity, ...components));
            },
            toArray: () => result,
            get count() {
                return result.length;
            }
        };
    }
    destroyAll() {
        for (const entityId of Array.from(this.aliveEntities)) {
            this.destroyEntity(entityId);
        }
    }
    get entityCount() {
        return this.aliveEntities.size;
    }
    get componentCounts() {
        const counts = new Map();
        for (const [componentId, entities] of this.componentTypeMap) {
            const componentInfo = ComponentRegistry.getComponent(String(componentId));
            if (componentInfo) {
                counts.set(componentInfo.constructor.componentName, entities.size);
            }
        }
        return counts;
    }
    addComponentToTracking(entityId, componentId) {
        if (!this.componentTypeMap.has(componentId)) {
            this.componentTypeMap.set(componentId, new Set());
        }
        this.componentTypeMap.get(componentId).add(entityId);
    }
    removeComponentFromTracking(entityId, componentId) {
        const entitiesWithComponent = this.componentTypeMap.get(componentId);
        if (entitiesWithComponent) {
            entitiesWithComponent.delete(entityId);
        }
    }
}
//# sourceMappingURL=EntityManager.js.map