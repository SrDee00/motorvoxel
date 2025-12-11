import { ChunkManager } from './ChunkManager';
import { BlockRegistry } from './BlockRegistry';
export class VoxelWorld {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.chunkManager = new ChunkManager();
        this.blockRegistry = new BlockRegistry();
        this.blockRegistry.registerDefaultBlocks();
    }
    getBlock(x, y, z) {
        const [cx, cy, cz] = this.worldToChunk(x, y, z);
        const [lx, ly, lz] = this.worldToLocal(x, y, z);
        const chunk = this.chunkManager.getChunk(cx, cy, cz);
        if (!chunk) {
            return { id: 0, metadata: 0 }; // Air if chunk not loaded
        }
        return chunk.getBlock(lx, ly, lz);
    }
    setBlock(x, y, z, blockId) {
        const [cx, cy, cz] = this.worldToChunk(x, y, z);
        const [lx, ly, lz] = this.worldToLocal(x, y, z);
        // Load chunk if not already loaded
        this.chunkManager.loadChunk(cx, cy, cz).then(chunk => {
            chunk.setBlock(lx, ly, lz, { id: blockId, metadata: 0 });
            this.eventBus.emit('block:changed', { x, y, z, oldType: 0, newType: blockId });
        });
    }
    getChunk(cx, cy, cz) {
        return this.chunkManager.getChunk(cx, cy, cz);
    }
    async loadChunk(cx, cy, cz) {
        return this.chunkManager.loadChunk(cx, cy, cz);
    }
    unloadChunk(cx, cy, cz) {
        this.chunkManager.unloadChunk(cx, cy, cz);
    }
    async generateChunk(cx, cy, cz) {
        return this.chunkManager.generateChunk(cx, cy, cz);
    }
    findBlockRaycast(start, direction, maxDistance) {
        // Simple raycast implementation
        let currentPos = [...start];
        const step = 0.1;
        let distance = 0;
        while (distance < maxDistance) {
            distance += step;
            // Move along direction
            currentPos[0] += direction[0] * step;
            currentPos[1] += direction[1] * step;
            currentPos[2] += direction[2] * step;
            // Check block at current position
            const block = this.getBlock(...currentPos);
            if (block.id !== 0) { // Found solid block
                return {
                    position: currentPos,
                    face: this.determineFace(direction)
                };
            }
        }
        return null;
    }
    worldToChunk(x, y, z) {
        const CHUNK_SIZE_X = 16;
        const CHUNK_SIZE_Y = 256;
        const CHUNK_SIZE_Z = 16;
        return [
            Math.floor(x / CHUNK_SIZE_X),
            Math.floor(y / CHUNK_SIZE_Y),
            Math.floor(z / CHUNK_SIZE_Z)
        ];
    }
    worldToLocal(x, y, z) {
        const CHUNK_SIZE_X = 16;
        const CHUNK_SIZE_Y = 256;
        const CHUNK_SIZE_Z = 16;
        return [
            ((x % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X,
            ((y % CHUNK_SIZE_Y) + CHUNK_SIZE_Y) % CHUNK_SIZE_Y,
            ((z % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z
        ];
    }
    determineFace(direction) {
        // Simple face determination based on direction
        const absDir = [Math.abs(direction[0]), Math.abs(direction[1]), Math.abs(direction[2])];
        const max = Math.max(...absDir);
        if (max === absDir[0])
            return direction[0] > 0 ? 3 : 2; // RIGHT : LEFT
        if (max === absDir[1])
            return direction[1] > 0 ? 4 : 5; // TOP : BOTTOM
        return direction[2] > 0 ? 0 : 1; // FRONT : BACK
    }
    getBlockRegistry() {
        return this.blockRegistry;
    }
    getChunkManager() {
        return this.chunkManager;
    }
}
//# sourceMappingURL=VoxelWorld.js.map