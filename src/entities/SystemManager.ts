import { System, ISystemManager } from './types';

export class SystemManager implements ISystemManager {
  private systems: Map<string, System> = new Map();
  private executionOrder: System[] = [];

  register(system: System): void {
    if (this.systems.has(system.name)) {
      throw new Error(`System ${system.name} already registered`);
    }

    this.systems.set(system.name, system);
    this.reorderSystems();
  }

  unregister(systemName: string): void {
    this.systems.delete(systemName);
    this.reorderSystems();
  }

  get(systemName: string): System | undefined {
    return this.systems.get(systemName);
  }

  update(deltaTime: number): void {
    for (const system of this.executionOrder) {
      if (system.enabled) {
        system.update(deltaTime);
      }
    }
  }

  fixedUpdate(fixedDeltaTime: number): void {
    for (const system of this.executionOrder) {
      if (system.enabled) {
        // Systems can override fixedUpdate if they need different behavior
        if ((system as any).fixedUpdate) {
          (system as any).fixedUpdate(fixedDeltaTime);
        } else {
          system.update(fixedDeltaTime);
        }
      }
    }
  }

  enable(systemName: string): void {
    const system = this.systems.get(systemName);
    if (system) {
      system.enabled = true;
    }
  }

  disable(systemName: string): void {
    const system = this.systems.get(systemName);
    if (system) {
      system.enabled = false;
    }
  }

  reorderSystems(): void {
    // Convert to array and sort by priority
    this.executionOrder = Array.from(this.systems.values()).sort((a, b) => {
      // Higher priority systems execute first
      return b.priority - a.priority;
    });
  }

  getSystems(): readonly System[] {
    return this.executionOrder;
  }
}