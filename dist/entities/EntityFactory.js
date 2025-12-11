import { TransformComponent } from './components/TransformComponent';
import { VelocityComponent } from './components/VelocityComponent';
export class EntityFactory {
    constructor() {
        this.prefabs = new Map();
    }
    registerPrefab(prefab) {
        this.prefabs.set(prefab.name, prefab);
    }
    create(prefabName, overrides) {
        const prefab = this.prefabs.get(prefabName);
        if (!prefab) {
            throw new Error(`Prefab ${prefabName} not found`);
        }
        return prefab.create(this.entityManager, overrides);
    }
    get(prefabName) {
        return this.prefabs.get(prefabName);
    }
    // Simple player prefab example
    static createPlayerPrefab() {
        return {
            name: 'Player',
            create: (manager, overrides = {}) => {
                const entity = manager.createEntity();
                // Add transform component
                const transform = new TransformComponent();
                if (overrides.Transform) {
                    Object.assign(transform, overrides.Transform);
                }
                manager.addComponent(entity, transform);
                // Add velocity component
                const velocity = new VelocityComponent();
                if (overrides.Velocity) {
                    Object.assign(velocity, overrides.Velocity);
                }
                manager.addComponent(entity, velocity);
                return entity;
            }
        };
    }
    setEntityManager(manager) {
        this.entityManager = manager;
    }
}
//# sourceMappingURL=EntityFactory.js.map