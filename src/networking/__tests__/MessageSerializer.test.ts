import { MessageSerializer } from '../MessageSerializer';
import { EntityState, WorldState } from '../types';

describe('MessageSerializer', () => {
  test('should serialize and deserialize entity state', () => {
    const entity: EntityState = {
      entityId: 1,
      position: new Float32Array([1.0, 2.0, 3.0]),
      velocity: new Float32Array([0.1, 0.2, 0.3]),
      rotation: new Float32Array([0.0, 0.0, 0.0]),
      timestamp: Date.now()
    };

    const serialized = MessageSerializer.serializeEntityState(entity);
    expect(serialized).toBeInstanceOf(Uint8Array);
    expect(serialized.length).toBeGreaterThan(0);

    const deserialized = MessageSerializer.deserializeEntityState(serialized);
    expect(deserialized.entityId).toBe(entity.entityId);
    expect(deserialized.position[0]).toBeCloseTo(entity.position[0]);
    expect(deserialized.position[1]).toBeCloseTo(entity.position[1]);
    expect(deserialized.position[2]).toBeCloseTo(entity.position[2]);
  });

  test('should serialize and deserialize world state', () => {
    const world: WorldState = {
      entities: [
        {
          entityId: 1,
          position: new Float32Array([1.0, 2.0, 3.0]),
          velocity: new Float32Array([0.1, 0.2, 0.3]),
          rotation: new Float32Array([0.0, 0.0, 0.0]),
          timestamp: Date.now()
        }
      ],
      blocks: [
        { x: 0, y: 0, z: 0, type: 1 }
      ],
      timestamp: Date.now()
    };

    const serialized = MessageSerializer.serializeWorldState(world);
    expect(serialized).toBeInstanceOf(Uint8Array);
    expect(serialized.length).toBeGreaterThan(0);

    const deserialized = MessageSerializer.deserializeWorldState(serialized);
    expect(deserialized.entities.length).toBe(1);
    expect(deserialized.blocks.length).toBe(1);
    expect(deserialized.entities[0].entityId).toBe(1);
    expect(deserialized.blocks[0].x).toBe(0);
  });

  test('should compress and decompress entity delta', () => {
    const previous: EntityState = {
      entityId: 1,
      position: new Float32Array([1.0, 2.0, 3.0]),
      velocity: new Float32Array([0.1, 0.2, 0.3]),
      rotation: new Float32Array([0.0, 0.0, 0.0]),
      timestamp: Date.now()
    };

    const current: EntityState = {
      entityId: 1,
      position: new Float32Array([1.1, 2.1, 3.1]),
      velocity: new Float32Array([0.11, 0.21, 0.31]),
      rotation: new Float32Array([0.01, 0.01, 0.01]),
      timestamp: Date.now()
    };

    const compressed = MessageSerializer.compressDelta(current, previous);
    expect(compressed).toBeInstanceOf(Uint8Array);
    expect(compressed.length).toBeGreaterThan(0);

    const decompressed = MessageSerializer.decompressDelta(compressed, previous);
    expect(decompressed.entityId).toBe(current.entityId);
    expect(decompressed.position[0]).toBeCloseTo(current.position[0]);
    expect(decompressed.position[1]).toBeCloseTo(current.position[1]);
    expect(decompressed.position[2]).toBeCloseTo(current.position[2]);
  });
});