import { IEntityFactory, IEntityPrefab, ComponentOverrides, IEntityManager } from './types';
export declare class EntityFactory implements IEntityFactory {
    private prefabs;
    registerPrefab(prefab: IEntityPrefab): void;
    create(prefabName: string, overrides?: ComponentOverrides): number;
    get(prefabName: string): IEntityPrefab | undefined;
    static createPlayerPrefab(): IEntityPrefab;
    private entityManager;
    setEntityManager(manager: IEntityManager): void;
}
