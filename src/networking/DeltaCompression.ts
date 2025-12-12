import { EntityState, WorldState } from './types';
import { vec3_create, vec3_subtract } from '../core/math/vectors';

export class DeltaCompression {
  private lastEntityStates: Map<number, EntityState> = new Map();
  private lastWorldState: WorldState | null = null;

  constructor() {}

  compressEntityState(current: EntityState): { delta: Uint8Array; isDelta: boolean } {
    const lastState = this.lastEntityStates.get(current.entityId);
    
    if (!lastState) {
      // No previous state, send full state
      this.lastEntityStates.set(current.entityId, { ...current });
      return { delta: this.serializeFullEntityState(current), isDelta: false };
    }
    
    // Calculate deltas
    const positionDelta = vec3_subtract(vec3_create(), current.position, lastState.position);
    const velocityDelta = vec3_subtract(vec3_create(), current.velocity, lastState.velocity);
    const rotationDelta = vec3_subtract(vec3_create(), current.rotation, lastState.rotation);
    
    // Check if deltas are significant enough to warrant sending
    const positionChanged = this.isSignificantDelta(positionDelta);
    const velocityChanged = this.isSignificantDelta(velocityDelta);
    const rotationChanged = this.isSignificantDelta(rotationDelta);
    
    if (!positionChanged && !velocityChanged && !rotationChanged) {
      // No significant changes, don't send update
      return { delta: new Uint8Array(), isDelta: false };
    }
    
    // Create delta buffer
    const buffer = new ArrayBuffer(4 + 3*4 + 3*4 + 3*4 + 8); // id + position delta + velocity delta + rotation delta + timestamp
    const view = new DataView(buffer);
    
    let offset = 0;
    view.setUint32(offset, current.entityId);
    offset += 4;
    
    // Position delta (3 floats)
    view.setFloat32(offset, positionDelta[0]);
    offset += 4;
    view.setFloat32(offset, positionDelta[1]);
    offset += 4;
    view.setFloat32(offset, positionDelta[2]);
    offset += 4;
    
    // Velocity delta (3 floats)
    view.setFloat32(offset, velocityDelta[0]);
    offset += 4;
    view.setFloat32(offset, velocityDelta[1]);
    offset += 4;
    view.setFloat32(offset, velocityDelta[2]);
    offset += 4;
    
    // Rotation delta (3 floats)
    view.setFloat32(offset, rotationDelta[0]);
    offset += 4;
    view.setFloat32(offset, rotationDelta[1]);
    offset += 4;
    view.setFloat32(offset, rotationDelta[2]);
    offset += 4;
    
    // Timestamp (double)
    view.setFloat64(offset, current.timestamp);
    
    // Update last state
    this.lastEntityStates.set(current.entityId, { ...current });
    
    return { delta: new Uint8Array(buffer), isDelta: true };
  }

  decompressEntityState(delta: Uint8Array, lastState: EntityState): EntityState {
    const view = new DataView(delta.buffer);
    let offset = 0;
    
    const entityId = view.getUint32(offset);
    offset += 4;
    
    // Position delta
    const positionDelta = [
      view.getFloat32(offset),
      view.getFloat32(offset + 4),
      view.getFloat32(offset + 8)
    ] as [number, number, number];
    offset += 12;
    
    // Velocity delta
    const velocityDelta = [
      view.getFloat32(offset),
      view.getFloat32(offset + 4),
      view.getFloat32(offset + 8)
    ] as [number, number, number];
    offset += 12;
    
    // Rotation delta
    const rotationDelta = [
      view.getFloat32(offset),
      view.getFloat32(offset + 4),
      view.getFloat32(offset + 8)
    ] as [number, number, number];
    offset += 12;
    
    const timestamp = view.getFloat64(offset);
    
    return {
      entityId,
      position: new Float32Array([
        lastState.position[0] + positionDelta[0],
        lastState.position[1] + positionDelta[1],
        lastState.position[2] + positionDelta[2]
      ]),
      velocity: new Float32Array([
        lastState.velocity[0] + velocityDelta[0],
        lastState.velocity[1] + velocityDelta[1],
        lastState.velocity[2] + velocityDelta[2]
      ]),
      rotation: new Float32Array([
        lastState.rotation[0] + rotationDelta[0],
        lastState.rotation[1] + rotationDelta[1],
        lastState.rotation[2] + rotationDelta[2]
      ]),
      timestamp
    };
  }

  compressWorldState(current: WorldState): { delta: Uint8Array; isDelta: boolean } {
    if (!this.lastWorldState) {
      // No previous state, send full state
      this.lastWorldState = { ...current };
      return { delta: this.serializeFullWorldState(current), isDelta: false };
    }
    
    // Find changed entities
    const changedEntities: EntityState[] = [];
    const entityMap = new Map<number, EntityState>();
    
    for (const entity of current.entities) {
      entityMap.set(entity.entityId, entity);
    }
    
    for (const lastEntity of this.lastWorldState.entities) {
      const currentEntity = entityMap.get(lastEntity.entityId);
      
      if (currentEntity) {
        const positionDelta = vec3_subtract(vec3_create(), currentEntity.position, lastEntity.position);
        const velocityDelta = vec3_subtract(vec3_create(), currentEntity.velocity, lastEntity.velocity);
        const rotationDelta = vec3_subtract(vec3_create(), currentEntity.rotation, lastEntity.rotation);
        
        if (this.isSignificantDelta(positionDelta) || 
            this.isSignificantDelta(velocityDelta) || 
            this.isSignificantDelta(rotationDelta)) {
          changedEntities.push(currentEntity);
        }
      } else {
        // Entity removed
        changedEntities.push({ ...lastEntity, entityId: -lastEntity.entityId }); // Negative ID indicates removal
      }
    }
    
    // Find new entities
    for (const entity of current.entities) {
      if (!this.lastWorldState.entities.find(e => e.entityId === entity.entityId)) {
        changedEntities.push(entity);
      }
    }
    
    // Find changed blocks
    const changedBlocks: any[] = [];
    const blockMap = new Map<string, any>();
    
    for (const block of current.blocks) {
      blockMap.set(this.getBlockKey(block), block);
    }
    
    for (const lastBlock of this.lastWorldState.blocks) {
      const currentBlock = blockMap.get(this.getBlockKey(lastBlock));
      
      if (!currentBlock || currentBlock.type !== lastBlock.type) {
        changedBlocks.push(currentBlock || { ...lastBlock, type: -1 }); // Negative type indicates removal
      }
    }
    
    // Find new blocks
    for (const block of current.blocks) {
      if (!this.lastWorldState.blocks.find(b => this.getBlockKey(b) === this.getBlockKey(block))) {
        changedBlocks.push(block);
      }
    }
    
    if (changedEntities.length === 0 && changedBlocks.length === 0) {
      // No changes, don't send update
      return { delta: new Uint8Array(), isDelta: false };
    }
    
    // Create delta buffer
    const entityDataSize = changedEntities.length * (4 + 3*4 + 3*4 + 3*4 + 8);
    const blockDataSize = changedBlocks.length * (4 + 4 + 4 + 4);
    const buffer = new ArrayBuffer(8 + 4 + entityDataSize + 4 + blockDataSize); // timestamp + entity count + entities + block count + blocks
    const view = new DataView(buffer);
    
    let offset = 0;
    view.setFloat64(offset, current.timestamp);
    offset += 8;
    
    // Entities
    view.setUint32(offset, changedEntities.length);
    offset += 4;
    
    for (const entity of changedEntities) {
      view.setUint32(offset, entity.entityId);
      offset += 4;
      
      if (entity.entityId >= 0) { // Not a removal
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
    }
    
    // Blocks
    view.setUint32(offset, changedBlocks.length);
    offset += 4;
    
    for (const block of changedBlocks) {
      view.setInt32(offset, block.x);
      offset += 4;
      view.setInt32(offset, block.y);
      offset += 4;
      view.setInt32(offset, block.z);
      offset += 4;
      view.setInt32(offset, block.type);
      offset += 4;
    }
    
    // Update last state
    this.lastWorldState = { ...current };
    
    return { delta: new Uint8Array(buffer), isDelta: true };
  }

  decompressWorldState(delta: Uint8Array, lastState: WorldState): WorldState {
    const view = new DataView(delta.buffer);
    let offset = 0;
    
    const timestamp = view.getFloat64(offset);
    offset += 8;
    
    // Entities
    const entityCount = view.getUint32(offset);
    offset += 4;
    
    const entities = [...lastState.entities];
    
    for (let i = 0; i < entityCount; i++) {
      const entityId = view.getUint32(offset);
      offset += 4;
      
      if (entityId >= 0) { // Not a removal
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
        
        const entityIndex = entities.findIndex(e => e.entityId === entityId);
        
        if (entityIndex !== -1) {
          entities[entityIndex] = {
            entityId,
            position: new Float32Array(position),
            velocity: new Float32Array(velocity),
            rotation: new Float32Array(rotation),
            timestamp: entityTimestamp
          };
        } else {
          entities.push({
            entityId,
            position: new Float32Array(position),
            velocity: new Float32Array(velocity),
            rotation: new Float32Array(rotation),
            timestamp: entityTimestamp
          });
        }
      } else {
        // Remove entity
        const entityIdToRemove = -entityId;
        const entityIndex = entities.findIndex(e => e.entityId === entityIdToRemove);
        
        if (entityIndex !== -1) {
          entities.splice(entityIndex, 1);
        }
      }
    }
    
    // Blocks
    const blockCount = view.getUint32(offset);
    offset += 4;
    
    const blocks = [...lastState.blocks];
    
    for (let i = 0; i < blockCount; i++) {
      const x = view.getInt32(offset);
      offset += 4;
      const y = view.getInt32(offset);
      offset += 4;
      const z = view.getInt32(offset);
      offset += 4;
      const type = view.getInt32(offset);
      offset += 4;
      
      if (type >= 0) { // Not a removal
        const blockIndex = blocks.findIndex(b => b.x === x && b.y === y && b.z === z);
        
        if (blockIndex !== -1) {
          blocks[blockIndex] = { x, y, z, type };
        } else {
          blocks.push({ x, y, z, type });
        }
      } else {
        // Remove block
        const blockIndex = blocks.findIndex(b => b.x === x && b.y === y && b.z === z);
        
        if (blockIndex !== -1) {
          blocks.splice(blockIndex, 1);
        }
      }
    }
    
    return {
      entities,
      blocks,
      timestamp
    };
  }

  private serializeFullEntityState(state: EntityState): Uint8Array {
    const buffer = new ArrayBuffer(4 + 3*4 + 3*4 + 3*4 + 8);
    const view = new DataView(buffer);
    
    let offset = 0;
    view.setUint32(offset, state.entityId);
    offset += 4;
    
    view.setFloat32(offset, state.position[0]);
    offset += 4;
    view.setFloat32(offset, state.position[1]);
    offset += 4;
    view.setFloat32(offset, state.position[2]);
    offset += 4;
    
    view.setFloat32(offset, state.velocity[0]);
    offset += 4;
    view.setFloat32(offset, state.velocity[1]);
    offset += 4;
    view.setFloat32(offset, state.velocity[2]);
    offset += 4;
    
    view.setFloat32(offset, state.rotation[0]);
    offset += 4;
    view.setFloat32(offset, state.rotation[1]);
    offset += 4;
    view.setFloat32(offset, state.rotation[2]);
    offset += 4;
    
    view.setFloat64(offset, state.timestamp);
    
    return new Uint8Array(buffer);
  }

  private serializeFullWorldState(state: WorldState): Uint8Array {
    const entityDataSize = state.entities.length * (4 + 3*4 + 3*4 + 3*4 + 8);
    const blockDataSize = state.blocks.length * (4 + 4 + 4 + 4);
    const buffer = new ArrayBuffer(8 + 4 + entityDataSize + 4 + blockDataSize);
    const view = new DataView(buffer);
    
    let offset = 0;
    view.setFloat64(offset, state.timestamp);
    offset += 8;
    
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

  private isSignificantDelta(delta: Float32Array): boolean {
    // Check if any component of the delta is significant
    const epsilon = 0.001;
    return Math.abs(delta[0]) > epsilon || 
           Math.abs(delta[1]) > epsilon || 
           Math.abs(delta[2]) > epsilon;
  }

  private getBlockKey(block: { x: number; y: number; z: number; type: number }): string {
    return `${block.x},${block.y},${block.z}`;
  }

  clearHistory(): void {
    this.lastEntityStates.clear();
    this.lastWorldState = null;
  }
}