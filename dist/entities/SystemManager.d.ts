import { System, ISystemManager } from './types';
export declare class SystemManager implements ISystemManager {
    private systems;
    private executionOrder;
    register(system: System): void;
    unregister(systemName: string): void;
    get(systemName: string): System | undefined;
    update(deltaTime: number): void;
    fixedUpdate(fixedDeltaTime: number): void;
    enable(systemName: string): void;
    disable(systemName: string): void;
    reorderSystems(): void;
    getSystems(): readonly System[];
}
