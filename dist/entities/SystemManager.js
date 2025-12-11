export class SystemManager {
    constructor() {
        this.systems = new Map();
        this.executionOrder = [];
    }
    register(system) {
        if (this.systems.has(system.name)) {
            throw new Error(`System ${system.name} already registered`);
        }
        this.systems.set(system.name, system);
        this.reorderSystems();
    }
    unregister(systemName) {
        this.systems.delete(systemName);
        this.reorderSystems();
    }
    get(systemName) {
        return this.systems.get(systemName);
    }
    update(deltaTime) {
        for (const system of this.executionOrder) {
            if (system.enabled) {
                system.update(deltaTime);
            }
        }
    }
    fixedUpdate(fixedDeltaTime) {
        for (const system of this.executionOrder) {
            if (system.enabled) {
                // Systems can override fixedUpdate if they need different behavior
                if (system.fixedUpdate) {
                    system.fixedUpdate(fixedDeltaTime);
                }
                else {
                    system.update(fixedDeltaTime);
                }
            }
        }
    }
    enable(systemName) {
        const system = this.systems.get(systemName);
        if (system) {
            system.enabled = true;
        }
    }
    disable(systemName) {
        const system = this.systems.get(systemName);
        if (system) {
            system.enabled = false;
        }
    }
    reorderSystems() {
        // Convert to array and sort by priority
        this.executionOrder = Array.from(this.systems.values()).sort((a, b) => {
            // Higher priority systems execute first
            return b.priority - a.priority;
        });
    }
    getSystems() {
        return this.executionOrder;
    }
}
//# sourceMappingURL=SystemManager.js.map