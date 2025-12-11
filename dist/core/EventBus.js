export class EventBus {
    constructor() {
        this.handlers = new Map();
    }
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        const eventHandlers = this.handlers.get(event);
        eventHandlers.push(handler);
        return () => {
            const index = eventHandlers.indexOf(handler);
            if (index !== -1) {
                eventHandlers.splice(index, 1);
            }
        };
    }
    once(event, handler) {
        const unsubscribe = this.on(event, (data) => {
            handler(data);
            unsubscribe();
        });
        return unsubscribe;
    }
    emit(event, data) {
        const eventHandlers = this.handlers.get(event);
        if (eventHandlers) {
            for (const handler of eventHandlers) {
                handler(data);
            }
        }
    }
    off(event, handler) {
        if (!handler) {
            this.handlers.delete(event);
        }
        else {
            const eventHandlers = this.handlers.get(event);
            if (eventHandlers) {
                const index = eventHandlers.indexOf(handler);
                if (index !== -1) {
                    eventHandlers.splice(index, 1);
                }
            }
        }
    }
}
//# sourceMappingURL=EventBus.js.map