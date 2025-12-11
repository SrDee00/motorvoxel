import { EngineEvents } from './types';
export declare class EventBus {
    private handlers;
    on<T extends keyof EngineEvents>(event: T, handler: (data: EngineEvents[T]) => void): () => void;
    once<T extends keyof EngineEvents>(event: T, handler: (data: EngineEvents[T]) => void): () => void;
    emit<T extends keyof EngineEvents>(event: T, data: EngineEvents[T]): void;
    off<T extends keyof EngineEvents>(event: T, handler?: (data: EngineEvents[T]) => void): void;
}
