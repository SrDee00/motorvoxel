import { System } from '../types';
import { TransformComponent } from '../components/TransformComponent';
import { VelocityComponent } from '../components/VelocityComponent';
import { IEntityManager } from '../types';

export class MovementSystem extends System {
  readonly name = 'Movement';
  priority = 100;

  private entityManager!: IEntityManager;
  private query: any; // QueryResult<[TransformComponent, VelocityComponent]>;

  init(): void {
    // This will be set by the engine
    if (!this.entityManager) {
      throw new Error('EntityManager not set for MovementSystem');
    }

    // Create query for entities with both Transform and Velocity
    this.query = this.entityManager.query(TransformComponent, VelocityComponent);
  }

  update(deltaTime: number): void {
    if (!this.query) return;

    this.query.forEach((entity: number, transform: TransformComponent, velocity: VelocityComponent) => {
      // Simple movement: position += velocity * deltaTime
      transform.position[0] += velocity.linear[0] * deltaTime / 1000;
      transform.position[1] += velocity.linear[1] * deltaTime / 1000;
      transform.position[2] += velocity.linear[2] * deltaTime / 1000;
    });
  }

  // Method to set entity manager (will be called by engine)
  setEntityManager(manager: IEntityManager): void {
    this.entityManager = manager;
  }
}