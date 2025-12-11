export class ChunkImpl {
    constructor(cx, cy, cz, sizeX = 16, sizeY = 256, sizeZ = 16) {
        this.isDirty = false;
        this.isEmpty = true;
        this.needsMeshing = true;
        this.coord = [cx, cy, cz];
        this.blocks = new Array(sizeX * sizeY * sizeZ).fill({ id: 0, metadata: 0 }); // Air by default
    }
    getBlock(lx, ly, lz) {
        const index = this.getIndex(lx, ly, lz);
        return this.blocks[index];
    }
    setBlock(lx, ly, lz, blockData) {
        const index = this.getIndex(lx, ly, lz);
        this.blocks[index] = blockData;
        this.isDirty = true;
        this.needsMeshing = true;
        // Update isEmpty status
        if (blockData.id !== 0 && this.isEmpty) {
            this.isEmpty = false;
        }
        else if (blockData.id === 0) {
            // Check if all blocks are air
            this.isEmpty = this.blocks.every(b => b.id === 0);
        }
    }
    getIndex(lx, ly, lz) {
        // Assuming standard chunk size for simplicity
        const CHUNK_SIZE_X = 16;
        const CHUNK_SIZE_Y = 256;
        const CHUNK_SIZE_Z = 16;
        return lx + lz * CHUNK_SIZE_X + ly * CHUNK_SIZE_X * CHUNK_SIZE_Z;
    }
    getSize() {
        // Standard chunk size
        return [16, 256, 16];
    }
    isInBounds(lx, ly, lz) {
        const [sizeX, sizeY, sizeZ] = this.getSize();
        return lx >= 0 && lx < sizeX && ly >= 0 && ly < sizeY && lz >= 0 && lz < sizeZ;
    }
}
//# sourceMappingURL=Chunk.js.map