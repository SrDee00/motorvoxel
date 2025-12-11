export declare function component(name: string): <T extends {
    new (...args: any[]): any;
}>(constructor: T) => T;
