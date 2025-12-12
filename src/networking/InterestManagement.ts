import { EventBus } from '../core/EventBus';
import { EntityState, WorldState } from './types';
import { vec3_create, vec3_distance, vec3_subtract } from '../core/math/vectors';

export class InterestManagement {
  private eventBus: EventBus;
  private clientPositions: Map<string, { position: Float32Array; interestRadius: number }> = new Map();
  private entityStates: Map<number, EntityState> = new Map();
  private worldState: WorldState | null = null;
  private interestRadius: number = 50; // Default interest radius in meters

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  init(): void {
    // Listen for entity updates
    this.eventBus.on('network:entity:update', (state: EntityState) => {
      this.handleEntityUpdate(state);
    });

    // Listen for world updates
    this.eventBus.on('network:world:update', (state: WorldState) => {
      this.handleWorldUpdate(state);
    });

    // Listen for client connections
    this.eventBus.on('network:connect', () => {
      // Client connected, will need to register position
    });
  }

  destroy(): void {
    this.clientPositions.clear();
    this.entityStates.clear();
    this.worldState = null;
  }

  registerClient(clientId: string, position: Float32Array, interestRadius: number = 50): void {
    this.clientPositions.set(clientId, {
      position: vec3_create(position[0], position[1], position[2]),
      interestRadius
    });
    
    // Send initial interest area to server
    this.sendInterestArea(clientId);
  }

  updateClientPosition(clientId: string, position: Float32Array): void {
    const client = this.clientPositions.get(clientId);
    
    if (client) {
      // Check if position changed significantly
      const distance = vec3_distance(client.position, position);
      
      if (distance > client.interestRadius * 0.1) { // 10% of interest radius
        client.position[0] = position[0];
        client.position[1] = position[1];
        client.position[2] = position[2];
        
        // Send updated interest area
        this.sendInterestArea(clientId);
      }
    }
  }

  private sendInterestArea(clientId: string): void {
    const client = this.clientPositions.get(clientId);
    
    if (client) {
      // Emit interest area update event
      this.eventBus.emit('network:message', {
        type: 'interest_area',
        data: {
          clientId,
          position: client.position,
          radius: client.interestRadius
        }
      });
    }
  }

  private handleEntityUpdate(state: EntityState): void {
    // Store entity state
    this.entityStates.set(state.entityId, state);
  }

  private handleWorldUpdate(state: WorldState): void {
    // Store world state
    this.worldState = state;
  }

  getEntitiesOfInterest(clientId: string): EntityState[] {
    const client = this.clientPositions.get(clientId);
    
    if (!client) {
      return [];
    }
    
    const entitiesOfInterest: EntityState[] = [];
    
    for (const [entityId, entity] of this.entityStates) {
      const distance = vec3_distance(client.position, entity.position);
      
      if (distance <= client.interestRadius) {
        entitiesOfInterest.push(entity);
      }
    }
    
    return entitiesOfInterest;
  }

  getBlocksOfInterest(clientId: string): any[] {
    const client = this.clientPositions.get(clientId);
    
    if (!client || !this.worldState) {
      return [];
    }
    
    const blocksOfInterest: any[] = [];
    
    for (const block of this.worldState.blocks) {
      // Simple distance check (would be more sophisticated in real implementation)
      const blockPosition = vec3_create(block.x, block.y, block.z);
      const distance = vec3_distance(client.position, blockPosition);
      
      if (distance <= client.interestRadius) {
        blocksOfInterest.push(block);
      }
    }
    
    return blocksOfInterest;
  }

  setInterestRadius(clientId: string, radius: number): void {
    const client = this.clientPositions.get(clientId);
    
    if (client) {
      client.interestRadius = radius;
      this.sendInterestArea(clientId);
    }
  }

  getInterestRadius(clientId: string): number {
    const client = this.clientPositions.get(clientId);
    return client ? client.interestRadius : this.interestRadius;
  }

  setDefaultInterestRadius(radius: number): void {
    this.interestRadius = radius;
  }
}