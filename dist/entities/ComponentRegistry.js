export class ComponentRegistry {
    static register(name, constructor) {
        if (this.registry.has(name)) {
            throw new Error(`Component ${name} already registered`);
        }
        const id = this.nextId++;
        this.registry.set(name, { id, constructor });
        constructor.componentId = id;
        constructor.componentName = name;
        return id;
    }
    static getComponent(name) {
        return this.registry.get(name);
    }
    static getAllComponents() {
        return new Map(this.registry);
    }
}
ComponentRegistry.nextId = 0;
ComponentRegistry.registry = new Map();
//# sourceMappingURL=ComponentRegistry.js.map