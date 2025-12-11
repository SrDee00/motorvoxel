import { System } from '../types';
import { IEntityManager } from '../types';
export declare class MovementSystem extends System {
    readonly name = "Movement";
    priority: number;
    private entityManager;
    private query;
    init(): void;
    update(deltaTime: number): void;
    setEntityManager(manager: IEntityManager): void;
}
