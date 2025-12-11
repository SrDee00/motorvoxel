export class BlockRegistry {
    constructor() {
        this.blocks = new Map();
        this.blockNames = new Map();
        this.nextId = 0;
    }
    registerBlock(block) {
        if (this.blockNames.has(block.name)) {
            throw new Error(`Block ${block.name} already registered`);
        }
        const id = this.nextId++;
        block.id = id;
        this.blocks.set(id, block);
        this.blockNames.set(block.name, id);
        return id;
    }
    getBlockById(id) {
        return this.blocks.get(id);
    }
    getBlockByName(name) {
        const id = this.blockNames.get(name);
        if (id === undefined)
            return undefined;
        return this.blocks.get(id);
    }
    getAllBlocks() {
        return Array.from(this.blocks.values());
    }
    // Register default blocks
    registerDefaultBlocks() {
        this.registerBlock({
            id: 0,
            name: 'air',
            texture: '',
            isSolid: false,
            isTransparent: true,
            lightEmission: 0,
            hardness: 0,
            resistance: 0
        });
        this.registerBlock({
            id: 0,
            name: 'grass',
            texture: 'grass',
            isSolid: true,
            isTransparent: false,
            lightEmission: 0,
            hardness: 0.6,
            resistance: 3
        });
        this.registerBlock({
            id: 0,
            name: 'dirt',
            texture: 'dirt',
            isSolid: true,
            isTransparent: false,
            lightEmission: 0,
            hardness: 0.5,
            resistance: 2.5
        });
        this.registerBlock({
            id: 0,
            name: 'stone',
            texture: 'stone',
            isSolid: true,
            isTransparent: false,
            lightEmission: 0,
            hardness: 1.5,
            resistance: 6
        });
    }
}
//# sourceMappingURL=BlockRegistry.js.map