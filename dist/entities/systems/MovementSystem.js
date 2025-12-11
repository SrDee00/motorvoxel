import { System } from '../types';
import { TransformComponent } from '../components/TransformComponent';
import { VelocityComponent } from '../components/VelocityComponent';
export class MovementSystem extends System {
    constructor() {
        super(...arguments);
        this.name = 'Movement';
        this.priority = 100;
    }
    init() {
        // This will be set by the engine
        if (!this.entityManager) {
            throw new Error('EntityManager not set for MovementSystem');
        }
        // Create query for entities with both Transform and Velocity
        this.query = this.entityManager.query(TransformComponent, VelocityComponent);
    }
    update(deltaTime) {
        if (!this.query)
            return;
        this.query.forEach((entity, transform, velocity) => {
            // Simple movement: position += velocity * deltaTime
            transform.position[0] += velocity.linear[0] * deltaTime / 1000;
            transform.position[1] += velocity.linear[1] * deltaTime / 1000;
            transform.position[2] += velocity.linear[2] * deltaTime / 1000;
        });
    }
    // Method to set entity manager (will be called by engine)
    setEntityManager(manager) {
        this.entityManager = manager;
    }
}
//# sourceMappingURL=MovementSystem.js.map