import { ComponentRegistry } from './ComponentRegistry';
export function component(name) {
    return function (constructor) {
        const id = ComponentRegistry.register(name, constructor);
        return constructor;
    };
}
//# sourceMappingURL=decorators.js.map