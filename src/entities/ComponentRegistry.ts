export class ComponentRegistry {
  private static nextId = 0;
  private static registry: Map<string, { id: number; constructor: any }> = new Map();

  static register(name: string, constructor: any): number {
    if (this.registry.has(name)) {
      throw new Error(`Component ${name} already registered`);
    }

    const id = this.nextId++;
    this.registry.set(name, { id, constructor });
    constructor.componentId = id;
    constructor.componentName = name;

    return id;
  }

  static getComponent(name: string): { id: number; constructor: any } | undefined {
    return this.registry.get(name);
  }

  static getAllComponents(): Map<string, { id: number; constructor: any }> {
    return new Map(this.registry);
  }
}