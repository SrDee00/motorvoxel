import { EventBus } from '../core/EventBus';
import { EntityState, ClientInput } from './types';
import { vec3_create, vec3_copy, vec3_add, vec3_scale } from '../core/math/vectors';

export class ClientPrediction {
  private eventBus: EventBus;
  private predictedStates: Map<number, EntityState> = new Map();
  private inputBuffer: Map<number, ClientInput[]> = new Map();
  private lastProcessedInput: Map<number, number> = new Map();
  private serverReconciliation: Map<number, EntityState> = new Map();

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  init(): void {
    // Listen for entity updates from server
    this.eventBus.on('network:entity:update', (state: EntityState) => {
      this.handleServerUpdate(state);
    });
  }

  destroy(): void {
    this.predictedStates.clear();
    this.inputBuffer.clear();
    this.lastProcessedInput.clear();
    this.serverReconciliation.clear();
  }

  addInput(entityId: number, input: ClientInput): void {
    // Store input in buffer
    if (!this.inputBuffer.has(entityId)) {
      this.inputBuffer.set(entityId, []);
    }
    
    const inputs = this.inputBuffer.get(entityId)!;
    inputs.push(input);
    
    // Send to server
    this.eventBus.emit('network:message', {
      type: 'client_input',
      data: input
    });
    
    // Apply prediction
    this.predictEntityMovement(entityId, input);
  }

  private predictEntityMovement(entityId: number, input: ClientInput): void {
    // Get current state (predicted or server-authoritative)
    let currentState = this.serverReconciliation.get(entityId) || this.predictedStates.get(entityId);
    
    if (!currentState) {
      // No known state, can't predict
      return;
    }
    
    // Create a copy for prediction
    const predictedState: EntityState = {
      entityId: currentState.entityId,
      position: vec3_copy(vec3_create(), currentState.position),
      velocity: vec3_copy(vec3_create(), currentState.velocity),
      rotation: vec3_copy(vec3_create(), currentState.rotation),
      timestamp: Date.now()
    };
    
    // Apply movement based on input
    const movement = vec3_scale(vec3_create(), 
      vec3_create(input.input.moveX, 0, input.input.moveZ), 
      5.0 // movement speed
    );
    
    // Simple prediction: apply movement to position
    vec3_add(predictedState.position, predictedState.position, movement);
    
    // Store predicted state
    this.predictedStates.set(entityId, predictedState);
    
    // Emit predicted state
    this.eventBus.emit('network:entity:update', predictedState);
  }

  private handleServerUpdate(state: EntityState): void {
    // Store server-authoritative state
    this.serverReconciliation.set(state.entityId, state);
    
    // Check if we need to reconcile
    const predictedState = this.predictedStates.get(state.entityId);
    
    if (predictedState) {
      // Calculate error between predicted and server state
      const positionError = vec3_create(
        state.position[0] - predictedState.position[0],
        state.position[1] - predictedState.position[1],
        state.position[2] - predictedState.position[2]
      );
      
      const errorMagnitude = Math.sqrt(
        positionError[0] * positionError[0] +
        positionError[1] * positionError[1] +
        positionError[2] * positionError[2]
      );
      
      if (errorMagnitude > 0.1) { // Significant error
        // Apply correction
        this.applyCorrection(state.entityId, state);
      }
    }
  }

  private applyCorrection(entityId: number, serverState: EntityState): void {
    // Get the last few inputs that haven't been processed by server yet
    const inputs = this.inputBuffer.get(entityId) || [];
    const lastProcessed = this.lastProcessedInput.get(entityId) || 0;
    
    // Find unprocessed inputs
    const unprocessedInputs = inputs.filter(input => 
      input.input.timestamp > lastProcessed
    );
    
    // Replay unprocessed inputs from the corrected state
    let correctedState = { ...serverState };
    
    for (const input of unprocessedInputs) {
      // Apply movement prediction
      const movement = vec3_scale(vec3_create(), 
        vec3_create(input.input.moveX, 0, input.input.moveZ), 
        5.0 // movement speed
      );
      
      vec3_add(correctedState.position, correctedState.position, movement);
    }
    
    // Update predicted state with corrected prediction
    this.predictedStates.set(entityId, correctedState);
    
    // Emit corrected state
    this.eventBus.emit('network:entity:update', correctedState);
    
    // Update last processed input
    if (unprocessedInputs.length > 0) {
      this.lastProcessedInput.set(entityId, 
        unprocessedInputs[unprocessedInputs.length - 1].input.timestamp
      );
    }
  }

  getPredictedState(entityId: number): EntityState | null {
    return this.predictedStates.get(entityId) || null;
  }

  getServerState(entityId: number): EntityState | null {
    return this.serverReconciliation.get(entityId) || null;
  }
}