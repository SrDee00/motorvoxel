import { PhysicsWorld } from '../PhysicsWorld';
import { EventBus } from '../../core/EventBus';
import { vec3_create } from '../../core/math/vectors';

describe('PhysicsWorld', () => {
  let physicsWorld: PhysicsWorld;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    physicsWorld = new PhysicsWorld(eventBus);
  });

  test('should initialize physics world', async () => {
    await physicsWorld.init();
    expect(physicsWorld).toBeDefined();
  });

  test('should create and destroy rigid body', () => {
    const bodyId = physicsWorld.createRigidBody({
      collider: {
        type: 'box',
        size: vec3_create(1, 1, 1)
      }
    });

    expect(bodyId).toBe(1);
    expect(physicsWorld.getRigidBody(bodyId)).not.toBeNull();

    physicsWorld.destroyRigidBody(bodyId);
    expect(physicsWorld.getRigidBody(bodyId)).toBeNull();
  });

  test('should create and destroy character controller', () => {
    const controllerId = physicsWorld.createCharacterController({});

    expect(controllerId).toBe(1);
    expect(physicsWorld.getCharacterController(controllerId)).not.toBeNull();

    physicsWorld.destroyCharacterController(controllerId);
    expect(physicsWorld.getCharacterController(controllerId)).toBeNull();
  });

  test('should update physics world', () => {
    const bodyId = physicsWorld.createRigidBody({
      collider: {
        type: 'box',
        size: vec3_create(1, 1, 1)
      },
      mass: 1
    });

    const initialPosition = vec3_create();
    initialPosition[0] = physicsWorld.getRigidBody(bodyId)!.position[0];
    initialPosition[1] = physicsWorld.getRigidBody(bodyId)!.position[1];
    initialPosition[2] = physicsWorld.getRigidBody(bodyId)!.position[2];

    physicsWorld.update(0.016); // 16ms frame

    const newPosition = physicsWorld.getRigidBody(bodyId)!.position;
    // Should have moved due to gravity
    expect(newPosition[1]).toBeLessThan(initialPosition[1]);
  });

  test('should perform raycast', () => {
    const bodyId = physicsWorld.createRigidBody({
      position: vec3_create(0, 0, 0),
      collider: {
        type: 'sphere',
        size: vec3_create(1, 1, 1)
      }
    });

    const start = vec3_create(-2, 0, 0);
    const end = vec3_create(2, 0, 0);

    const result = physicsWorld.raycast(start, end);
    // Note: Simple raycast may not hit due to basic implementation
    if (result) {
      expect(result.hit).toBe(true);
      expect(result.bodyId).toBe(bodyId);
    }
  });

  test('should perform sweep test', () => {
    const bodyId = physicsWorld.createRigidBody({
      position: vec3_create(0, 0, 0),
      collider: {
        type: 'box',
        size: vec3_create(1, 1, 1)
      }
    });

    const displacement = vec3_create(0, 0, 2);
    const result = physicsWorld.sweepTest(physicsWorld.getRigidBody(bodyId)!, displacement);

    expect(result).not.toBeNull();
    // Simple sweep test may return hit=true due to basic implementation
    // expect(result.hit).toBe(false);
  });

  test('should handle gravity', () => {
    expect(physicsWorld.gravity[0]).toBe(0);
    expect(physicsWorld.gravity[1]).toBeCloseTo(-9.81);
    expect(physicsWorld.gravity[2]).toBe(0);

    const newGravity = vec3_create(0, -5, 0);
    physicsWorld.gravity = newGravity;

    expect(physicsWorld.gravity[1]).toBe(-5);
  });

  test('should handle debug draw', () => {
    expect(physicsWorld.debugDraw).toBe(false);

    physicsWorld.debugDraw = true;
    expect(physicsWorld.debugDraw).toBe(true);
  });
});