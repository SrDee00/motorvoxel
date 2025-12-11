import { IEntityFactory, IEntityPrefab, ComponentOverrides, IEntityManager } from './types';
import { TransformComponent } from './components/TransformComponent';
import { VelocityComponent } from './components/VelocityComponent';

export class EntityFactory implements IEntityFactory {
  private prefabs: Map<string, IEntityPrefab> = new Map();

  registerPrefab(prefab: IEntityPrefab): void {
    this.prefabs.set(prefab.name, prefab);
  }

  create(prefabName: string, overrides?: ComponentOverrides): number {
    const prefab = this.prefabs.get(prefabName);
    if (!prefab) {
      throw new Error(`Prefab ${prefabName} not found`);
    }
    return prefab.create(this.entityManager, overrides);
  }

  get(prefabName: string): IEntityPrefab | undefined {
    return this.prefabs.get(prefabName);
  }

  // Simple player prefab example
  static createPlayerPrefab(): IEntityPrefab {
    return {
      name: 'Player',
      create: (manager: IEntityManager, overrides = {}) => {
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

  // This will be set by the engine
  private entityManager!: IEntityManager;
  setEntityManager(manager: IEntityManager): void {
    this.entityManager = manager;
  }
}