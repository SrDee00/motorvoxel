import { EntityState, WorldState, ClientInput } from './types';

export class MessageSerializer {
  static serializeEntityState(state: EntityState): Uint8Array {
    // Simple binary serialization for entity state
    const buffer = new ArrayBuffer(4 + 3*4 + 3*4 + 3*4 + 8); // id + position + velocity + rotation + timestamp
    const view = new DataView(buffer);
    
    let offset = 0;
    view.setUint32(offset, state.entityId);
    offset += 4;
    
    // Position (3 floats)
    view.setFloat32(offset, state.position[0]);
    offset += 4;
    view.setFloat32(offset, state.position[1]);
    offset += 4;
    view.setFloat32(offset, state.position[2]);
    offset += 4;
    
    // Velocity (3 floats)
    view.setFloat32(offset, state.velocity[0]);
    offset += 4;
    view.setFloat32(offset, state.velocity[1]);
    offset += 4;
    view.setFloat32(offset, state.velocity[2]);
    offset += 4;
    
    // Rotation (3 floats)
    view.setFloat32(offset, state.rotation[0]);
    offset += 4;
    view.setFloat32(offset, state.rotation[1]);
    offset += 4;
    view.setFloat32(offset, state.rotation[2]);
    offset += 4;
    
    // Timestamp (double)
    view.setFloat64(offset, state.timestamp);
    
    return new Uint8Array(buffer);
  }

  static deserializeEntityState(buffer: Uint8Array): EntityState {
    const view = new DataView(buffer.buffer);
    let offset = 0;
    
    const entityId = view.getUint32(offset);
    offset += 4;
    
    const position = [
      view.getFloat32(offset),
      view.getFloat32(offset + 4),
      view.getFloat32(offset + 8)
    ] as [number, number, number];
    offset += 12;
    
    const velocity = [
      view.getFloat32(offset),
      view.getFloat32(offset + 4),
      view.getFloat32(offset + 8)
    ] as [number, number, number];
    offset += 12;
    
    const rotation = [
      view.getFloat32(offset),
      view.getFloat32(offset + 4),
      view.getFloat32(offset + 8)
    ] as [number, number, number];
    offset += 12;
    
    const timestamp = view.getFloat64(offset);
    
    return {
      entityId,
      position,
      velocity,
      rotation,
      timestamp
    };
  }

  static serializeWorldState(state: WorldState): Uint8Array {
    // Calculate buffer size
    const entityDataSize = state.entities.length * (4 + 3*4 + 3*4 + 3*4 + 8);
    const blockDataSize = state.blocks.length * (4 + 4 + 4 + 4); // x, y, z, type
    const buffer = new ArrayBuffer(8 + entityDataSize + blockDataSize); // timestamp + entities + blocks
    const view = new DataView(buffer);
    
    let offset = 0;
    view.setFloat64(offset, state.timestamp);
    offset += 8;
    
    // Serialize entities
    view.setUint32(offset, state.entities.length);
    offset += 4;
    
    for (const entity of state.entities) {
      view.setUint32(offset, entity.entityId);
      offset += 4;
      
      view.setFloat32(offset, entity.position[0]);
      offset += 4;
      view.setFloat32(offset, entity.position[1]);
      offset += 4;
      view.setFloat32(offset, entity.position[2]);
      offset += 4;
      
      view.setFloat32(offset, entity.velocity[0]);
      offset += 4;
      view.setFloat32(offset, entity.velocity[1]);
      offset += 4;
      view.setFloat32(offset, entity.velocity[2]);
      offset += 4;
      
      view.setFloat32(offset, entity.rotation[0]);
      offset += 4;
      view.setFloat32(offset, entity.rotation[1]);
      offset += 4;
      view.setFloat32(offset, entity.rotation[2]);
      offset += 4;
      
      view.setFloat64(offset, entity.timestamp);
      offset += 8;
    }
    
    // Serialize blocks
    view.setUint32(offset, state.blocks.length);
    offset += 4;
    
    for (const block of state.blocks) {
      view.setInt32(offset, block.x);
      offset += 4;
      view.setInt32(offset, block.y);
      offset += 4;
      view.setInt32(offset, block.z);
      offset += 4;
      view.setUint32(offset, block.type);
      offset += 4;
    }
    
    return new Uint8Array(buffer);
  }

  static deserializeWorldState(buffer: Uint8Array): WorldState {
    const view = new DataView(buffer.buffer);
    let offset = 0;
    
    const timestamp = view.getFloat64(offset);
    offset += 8;
    
    // Deserialize entities
    const entityCount = view.getUint32(offset);
    offset += 4;
    
    const entities: EntityState[] = [];
    for (let i = 0; i < entityCount; i++) {
      const entityId = view.getUint32(offset);
      offset += 4;
      
      const position = [
        view.getFloat32(offset),
        view.getFloat32(offset + 4),
        view.getFloat32(offset + 8)
      ] as [number, number, number];
      offset += 12;
      
      const velocity = [
        view.getFloat32(offset),
        view.getFloat32(offset + 4),
        view.getFloat32(offset + 8)
      ] as [number, number, number];
      offset += 12;
      
      const rotation = [
        view.getFloat32(offset),
        view.getFloat32(offset + 4),
        view.getFloat32(offset + 8)
      ] as [number, number, number];
      offset += 12;
      
      const entityTimestamp = view.getFloat64(offset);
      offset += 8;
      
      entities.push({
        entityId,
        position: new Float32Array(position),
        velocity: new Float32Array(velocity),
        rotation: new Float32Array(rotation),
        timestamp: entityTimestamp
      });
    }
    
    // Deserialize blocks
    const blockCount = view.getUint32(offset);
    offset += 4;
    
    const blocks = [];
    for (let i = 0; i < blockCount; i++) {
      const x = view.getInt32(offset);
      offset += 4;
      const y = view.getInt32(offset);
      offset += 4;
      const z = view.getInt32(offset);
      offset += 4;
      const type = view.getUint32(offset);
      offset += 4;
      
      blocks.push({ x, y, z, type });
    }
    
    return {
      entities,
      blocks,
      timestamp
    };
  }

  static serializeClientInput(input: ClientInput): Uint8Array {
    const buffer = new ArrayBuffer(4 + 8 + 4*4 + 1); // entityId + timestamp + input + jump
    const view = new DataView(buffer);
    
    let offset = 0;
    view.setUint32(offset, input.entityId);
    offset += 4;
    
    view.setFloat64(offset, input.input.timestamp);
    offset += 8;
    
    view.setFloat32(offset, input.input.moveX);
    offset += 4;
    view.setFloat32(offset, input.input.moveY);
    offset += 4;
    view.setFloat32(offset, input.input.moveZ);
    offset += 4;
    
    view.setUint8(offset, input.input.jump ? 1 : 0);
    
    return new Uint8Array(buffer);
  }

  static deserializeClientInput(buffer: Uint8Array): ClientInput {
    const view = new DataView(buffer.buffer);
    let offset = 0;
    
    const entityId = view.getUint32(offset);
    offset += 4;
    
    const timestamp = view.getFloat64(offset);
    offset += 8;
    
    const moveX = view.getFloat32(offset);
    offset += 4;
    const moveY = view.getFloat32(offset);
    offset += 4;
    const moveZ = view.getFloat32(offset);
    offset += 4;
    
    const jump = view.getUint8(offset) === 1;
    
    return {
      entityId,
      input: {
        moveX,
        moveY,
        moveZ,
        jump,
        timestamp
      }
    };
  }

  static compressDelta(current: EntityState, previous: EntityState): Uint8Array {
    // Simple delta compression - only send changes
    const buffer = new ArrayBuffer(4 + 3*4 + 3*4 + 3*4 + 8); // id + position + velocity + rotation + timestamp
    const view = new DataView(buffer);
    
    let offset = 0;
    view.setUint32(offset, current.entityId);
    offset += 4;
    
    // Position delta
    view.setFloat32(offset, current.position[0] - previous.position[0]);
    offset += 4;
    view.setFloat32(offset, current.position[1] - previous.position[1]);
    offset += 4;
    view.setFloat32(offset, current.position[2] - previous.position[2]);
    offset += 4;
    
    // Velocity delta
    view.setFloat32(offset, current.velocity[0] - previous.velocity[0]);
    offset += 4;
    view.setFloat32(offset, current.velocity[1] - previous.velocity[1]);
    offset += 4;
    view.setFloat32(offset, current.velocity[2] - previous.velocity[2]);
    offset += 4;
    
    // Rotation delta
    view.setFloat32(offset, current.rotation[0] - previous.rotation[0]);
    offset += 4;
    view.setFloat32(offset, current.rotation[1] - previous.rotation[1]);
    offset += 4;
    view.setFloat32(offset, current.rotation[2] - previous.rotation[2]);
    offset += 4;
    
    // Timestamp
    view.setFloat64(offset, current.timestamp);
    
    return new Uint8Array(buffer);
  }

  static decompressDelta(delta: Uint8Array, previous: EntityState): EntityState {
    const view = new DataView(delta.buffer);
    let offset = 0;
    
    const entityId = view.getUint32(offset);
    offset += 4;
    
    const position = [
      previous.position[0] + view.getFloat32(offset),
      previous.position[1] + view.getFloat32(offset + 4),
      previous.position[2] + view.getFloat32(offset + 8)
    ] as [number, number, number];
    offset += 12;
    
    const velocity = [
      previous.velocity[0] + view.getFloat32(offset),
      previous.velocity[1] + view.getFloat32(offset + 4),
      previous.velocity[2] + view.getFloat32(offset + 8)
    ] as [number, number, number];
    offset += 12;
    
    const rotation = [
      previous.rotation[0] + view.getFloat32(offset),
      previous.rotation[1] + view.getFloat32(offset + 4),
      previous.rotation[2] + view.getFloat32(offset + 8)
    ] as [number, number, number];
    offset += 12;
    
    const timestamp = view.getFloat64(offset);
    
    return {
      entityId,
      position,
      velocity,
      rotation,
      timestamp
    };
  }
}