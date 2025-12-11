export declare class ComponentRegistry {
    private static nextId;
    private static registry;
    static register(name: string, constructor: any): number;
    static getComponent(name: string): {
        id: number;
        constructor: any;
    } | undefined;
    static getAllComponents(): Map<string, {
        id: number;
        constructor: any;
    }>;
}
