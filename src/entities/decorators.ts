import { ComponentRegistry } from './ComponentRegistry';

export function component(name: string) {
  return function<T extends { new(...args: any[]): any }>(constructor: T) {
    const id = ComponentRegistry.register(name, constructor);
    return constructor;
  };
}