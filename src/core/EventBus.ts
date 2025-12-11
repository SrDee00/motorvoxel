import { EngineEvents } from './types';

export class EventBus {
  private handlers: Map<keyof EngineEvents, Array<(data: any) => void>> = new Map();

  on<T extends keyof EngineEvents>(
    event: T,
    handler: (data: EngineEvents[T]) => void
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    const eventHandlers = this.handlers.get(event)!;
    eventHandlers.push(handler as any);

    return () => {
      const index = eventHandlers.indexOf(handler as any);
      if (index !== -1) {
        eventHandlers.splice(index, 1);
      }
    };
  }

  once<T extends keyof EngineEvents>(
    event: T,
    handler: (data: EngineEvents[T]) => void
  ): () => void {
    const unsubscribe = this.on(event, (data) => {
      handler(data);
      unsubscribe();
    });
    return unsubscribe;
  }

  emit<T extends keyof EngineEvents>(event: T, data: EngineEvents[T]): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      for (const handler of eventHandlers) {
        handler(data);
      }
    }
  }

  off<T extends keyof EngineEvents>(event: T, handler?: (data: EngineEvents[T]) => void): void {
    if (!handler) {
      this.handlers.delete(event);
    } else {
      const eventHandlers = this.handlers.get(event);
      if (eventHandlers) {
        const index = eventHandlers.indexOf(handler as any);
        if (index !== -1) {
          eventHandlers.splice(index, 1);
        }
      }
    }
  }
}