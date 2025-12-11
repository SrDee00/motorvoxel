import { EntityManager } from '../EntityManager';
import { TransformComponent } from '../components/TransformComponent';
import { VelocityComponent } from '../components/VelocityComponent';

describe('EntityManager', () => {
  let entityManager: EntityManager;

  beforeEach(() => {
    entityManager = new EntityManager();
  });

  test('should create and destroy entities', () => {
    const entity1 = entityManager.createEntity();
    const entity2 = entityManager.createEntity();

    expect(entityManager.isAlive(entity1)).toBe(true);
    expect(entityManager.isAlive(entity2)).toBe(true);
    expect(entityManager.entityCount).toBe(2);

    entityManager.destroyEntity(entity1);
    expect(entityManager.isAlive(entity1)).toBe(false);
    expect(entityManager.isAlive(entity2)).toBe(true);
    expect(entityManager.entityCount).toBe(1);
  });

  test('should add and get components', () => {
    const entity = entityManager.createEntity();
    const transform = new TransformComponent();
    transform.position = [1, 2, 3];

    entityManager.addComponent(entity, transform);

    const retrieved = entityManager.getComponent(entity, TransformComponent);
    expect(retrieved).toBeDefined();
    expect(retrieved?.position).toEqual([1, 2, 3]);
  });

  test('should remove components', () => {
    const entity = entityManager.createEntity();
    const transform = new TransformComponent();
    entityManager.addComponent(entity, transform);

    expect(entityManager.hasComponent(entity, TransformComponent)).toBe(true);

    entityManager.removeComponent(entity, TransformComponent);
    expect(entityManager.hasComponent(entity, TransformComponent)).toBe(false);
    expect(entityManager.getComponent(entity, TransformComponent)).toBeUndefined();
  });

  test('should query entities by components', () => {
    const entity1 = entityManager.createEntity();
    const entity2 = entityManager.createEntity();
    const entity3 = entityManager.createEntity();

    // Entity 1: Transform only
    entityManager.addComponent(entity1, new TransformComponent());

    // Entity 2: Velocity only
    entityManager.addComponent(entity2, new VelocityComponent());

    // Entity 3: Both Transform and Velocity
    entityManager.addComponent(entity3, new TransformComponent());
    entityManager.addComponent(entity3, new VelocityComponent());

    // Query for entities with both components
    const query = entityManager.query(TransformComponent, VelocityComponent);
    expect(query.count).toBe(1);

    const results = query.toArray();
    expect(results.length).toBe(1);
    expect(results[0][0]).toBe(entity3);
  });

  test('should destroy all entities', () => {
    entityManager.createEntity();
    entityManager.createEntity();
    entityManager.createEntity();

    expect(entityManager.entityCount).toBe(3);

    entityManager.destroyAll();
    expect(entityManager.entityCount).toBe(0);
  });
});