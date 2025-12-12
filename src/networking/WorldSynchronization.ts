import { EventBus } from '../core/EventBus';
import { WorldState, EntityState } from './types';
import { vec3_create, vec3_distance } from '../core/math/vectors';

export class WorldSynchronization {
  private eventBus: EventBus;
  private serverWorldState: WorldState | null = null;
  private clientWorldState: WorldState | null = null;
  private lastSyncTime: number = 0;
  private syncInterval: number = 1000; // 1 second
  private dirtyBlocks: Set<string> = new Set();
  private dirtyEntities: Set<number> = new Set();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  init(): void {
    // Listen for world updates
    this.eventBus.on('network:world:update', (state: WorldState) => {
      this.handleWorldUpdate(state);
    });

    // Listen for entity updates
    this.eventBus.on('network:entity:update', (state: EntityState) => {
      this.handleEntityUpdate(state);
    });

    // Start sync loop
    this.startSyncLoop();
  }

  destroy(): void {
    this.serverWorldState = null;
    this.clientWorldState = null;
    this.dirtyBlocks.clear();
    this.dirtyEntities.clear();
  }

  private startSyncLoop(): void {
    setInterval(() => {
      this.syncWorldState();
    }, this.syncInterval);
  }

  private syncWorldState(): void {
    if (!this.serverWorldState || !this.clientWorldState) {
      return;
    }

    const now = Date.now();
    
    // Only sync if enough time has passed
    if (now - this.lastSyncTime < this.syncInterval) {
      return;
    }

    this.lastSyncTime = now;

    // Create delta update
    const deltaUpdate: WorldState = {
      entities: [],
      blocks: [],
      timestamp: now
    };

    // Add dirty entities
    for (const entityId of this.dirtyEntities) {
      const entity = this.clientWorldState.entities.find(e => e.entityId === entityId);
      if (entity) {
        deltaUpdate.entities.push(entity);
      }
    }

    // Add dirty blocks
    for (const blockKey of this.dirtyBlocks) {
      const block = this.clientWorldState.blocks.find(b => this.getBlockKey(b) === blockKey);
      if (block) {
        deltaUpdate.blocks.push(block);
      }
    }

    // Send delta update to server
    if (deltaUpdate.entities.length > 0 || deltaUpdate.blocks.length > 0) {
      this.eventBus.emit('network:message', {
        type: 'world_delta',
        data: deltaUpdate
      });
    }

    // Clear dirty flags
    this.dirtyEntities.clear();
    this.dirtyBlocks.clear();
  }

  private handleWorldUpdate(state: WorldState): void {
    // Store server world state
    this.serverWorldState = state;
    
    // If this is the first sync, store as client state
    if (!this.clientWorldState) {
      this.clientWorldState = JSON.parse(JSON.stringify(state));
      return;
    }
    
    // Apply delta updates to client state
    this.applyWorldDelta(state);
  }

  private handleEntityUpdate(state: EntityState): void {
    // Mark entity as dirty
    this.dirtyEntities.add(state.entityId);
    
    // Update client state
    if (this.clientWorldState) {
      const entityIndex = this.clientWorldState.entities.findIndex(e => e.entityId === state.entityId);
      
      if (entityIndex !== -1) {
        this.clientWorldState.entities[entityIndex] = state;
      } else {
        this.clientWorldState.entities.push(state);
      }
    }
  }

  private applyWorldDelta(delta: WorldState): void {
    if (!this.clientWorldState) {
      this.clientWorldState = JSON.parse(JSON.stringify(delta));
      return;
    }
    
    // Apply entity updates
    for (const entity of delta.entities) {
      const entityIndex = this.clientWorldState.entities.findIndex(e => e.entityId === entity.entityId);
      
      if (entityIndex !== -1) {
        this.clientWorldState.entities[entityIndex] = entity;
      } else {
        this.clientWorldState.entities.push(entity);
      }
    }
    
    // Apply block updates
    for (const block of delta.blocks) {
      const blockIndex = this.clientWorldState.blocks.findIndex(b => 
        b.x === block.x && b.y === block.y && b.z === block.z
      );
      
      if (blockIndex !== -1) {
        this.clientWorldState.blocks[blockIndex] = block;
      } else {
        this.clientWorldState.blocks.push(block);
      }
    }
  }

  markBlockDirty(x: number, y: number, z: number): void {
    this.dirtyBlocks.add(this.getBlockKey({ x, y, z, type: 0 }));
  }

  markEntityDirty(entityId: number): void {
    this.dirtyEntities.add(entityId);
  }

  getServerWorldState(): WorldState | null {
    return this.serverWorldState;
  }

  getClientWorldState(): WorldState | null {
    return this.clientWorldState;
  }

  setSyncInterval(interval: number): void {
    this.syncInterval = Math.max(100, Math.min(5000, interval));
  }

  private getBlockKey(block: { x: number; y: number; z: number; type: number }): string {
    return `${block.x},${block.y},${block.z}`;
  }

  // Check if world states are synchronized
  isSynchronized(): boolean {
    if (!this.serverWorldState || !this.clientWorldState) {
      return false;
    }
    
    // Simple check: compare entity counts and block counts
    if (this.serverWorldState.entities.length !== this.clientWorldState.entities.length) {
      return false;
    }
    
    if (this.serverWorldState.blocks.length !== this.clientWorldState.blocks.length) {
      return false;
    }
    
    return true;
  }

  // Force full synchronization
  forceFullSync(): void {
    if (this.serverWorldState) {
      this.eventBus.emit('network:message', {
        type: 'world_full_sync_request',
        data: {}
      });
    }
  }
}