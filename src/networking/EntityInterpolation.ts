import { EventBus } from '../core/EventBus';
import { EntityState } from './types';
import { vec3_create, vec3_copy, vec3_scale, vec3_add, vec3_subtract } from '../core/math/vectors';

export class EntityInterpolation {
  private eventBus: EventBus;
  private entityHistory: Map<number, EntityState[]> = new Map();
  private interpolationBuffer: Map<number, { start: EntityState; end: EntityState; startTime: number; duration: number }> = new Map();
  private maxHistorySize: number = 20;
  private interpolationFactor: number = 0.1;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  init(): void {
    // Listen for entity updates
    this.eventBus.on('network:entity:update', (state: EntityState) => {
      this.handleEntityUpdate(state);
    });
  }

  destroy(): void {
    this.entityHistory.clear();
    this.interpolationBuffer.clear();
  }

  private handleEntityUpdate(state: EntityState): void {
    // Store state in history
    if (!this.entityHistory.has(state.entityId)) {
      this.entityHistory.set(state.entityId, []);
    }
    
    const history = this.entityHistory.get(state.entityId)!;
    history.push(state);
    
    // Limit history size
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
    
    // If we have at least 2 states, create interpolation
    if (history.length >= 2) {
      this.createInterpolation(state.entityId, history);
    }
  }

  private createInterpolation(entityId: number, history: EntityState[]): void {
    // Get the two most recent states
    const endState = history[history.length - 1];
    const startState = history[history.length - 2];
    
    // Calculate time difference
    const timeDiff = endState.timestamp - startState.timestamp;
    
    // Only interpolate if time difference is reasonable
    if (timeDiff > 0 && timeDiff < 1000) { // Less than 1 second
      this.interpolationBuffer.set(entityId, {
        start: startState,
        end: endState,
        startTime: Date.now(),
        duration: timeDiff * this.interpolationFactor // Scale down for smoother interpolation
      });
    }
  }

  update(deltaTime: number): void {
    // Update interpolations for all entities
    for (const [entityId, interpolation] of this.interpolationBuffer) {
      const interpolatedState = this.updateInterpolation(interpolation, deltaTime);
      
      if (interpolatedState) {
        // Emit interpolated state
        this.eventBus.emit('network:entity:update', interpolatedState);
      }
    }
  }

  private updateInterpolation(interpolation: { start: EntityState; end: EntityState; startTime: number; duration: number }, deltaTime: number): EntityState | null {
    const elapsed = Date.now() - interpolation.startTime;
    const progress = Math.min(elapsed / interpolation.duration, 1.0);
    
    if (progress >= 1.0) {
      // Interpolation complete
      return null;
    }
    
    // Linear interpolation
    const interpolatedState: EntityState = {
      entityId: interpolation.start.entityId,
      position: vec3_create(),
      velocity: vec3_create(),
      rotation: vec3_create(),
      timestamp: Date.now()
    };
    
    // Interpolate position
    vec3_copy(interpolatedState.position, interpolation.start.position);
    const positionDiff = vec3_subtract(vec3_create(), interpolation.end.position, interpolation.start.position);
    vec3_add(interpolatedState.position, interpolatedState.position, vec3_scale(vec3_create(), positionDiff, progress));
    
    // Interpolate velocity
    vec3_copy(interpolatedState.velocity, interpolation.start.velocity);
    const velocityDiff = vec3_subtract(vec3_create(), interpolation.end.velocity, interpolation.start.velocity);
    vec3_add(interpolatedState.velocity, interpolatedState.velocity, vec3_scale(vec3_create(), velocityDiff, progress));
    
    // Interpolate rotation
    vec3_copy(interpolatedState.rotation, interpolation.start.rotation);
    const rotationDiff = vec3_subtract(vec3_create(), interpolation.end.rotation, interpolation.start.rotation);
    vec3_add(interpolatedState.rotation, interpolatedState.rotation, vec3_scale(vec3_create(), rotationDiff, progress));
    
    return interpolatedState;
  }

  getInterpolatedState(entityId: number): EntityState | null {
    const interpolation = this.interpolationBuffer.get(entityId);
    
    if (interpolation) {
      const elapsed = Date.now() - interpolation.startTime;
      const progress = Math.min(elapsed / interpolation.duration, 1.0);
      
      if (progress < 1.0) {
        return this.updateInterpolation(interpolation, 0);
      }
    }
    
    return null;
  }

  setInterpolationFactor(factor: number): void {
    this.interpolationFactor = Math.max(0.01, Math.min(1.0, factor));
  }

  setMaxHistorySize(size: number): void {
    this.maxHistorySize = Math.max(2, Math.min(100, size));
  }
}