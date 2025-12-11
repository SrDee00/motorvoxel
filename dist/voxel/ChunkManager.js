import { ChunkImpl } from './Chunk';
export class ChunkManager {
    constructor() {
        this.chunks = new Map();
        this.loadedChunks = new Set();
    }
    getChunk(cx, cy, cz) {
        const key = this.getChunkKey(cx, cy, cz);
        return this.chunks.get(key);
    }
    async loadChunk(cx, cy, cz) {
        const key = this.getChunkKey(cx, cy, cz);
        if (this.chunks.has(key)) {
            return this.chunks.get(key);
        }
        // Create new chunk
        const chunk = new ChunkImpl(cx, cy, cz);
        this.chunks.set(key, chunk);
        this.loadedChunks.add(key);
        return chunk;
    }
    unloadChunk(cx, cy, cz) {
        const key = this.getChunkKey(cx, cy, cz);
        if (this.chunks.has(key)) {
            this.chunks.delete(key);
            this.loadedChunks.delete(key);
        }
    }
    getLoadedChunks() {
        return Array.from(this.loadedChunks.values()).map(key => this.chunks.get(key));
    }
    getChunkCount() {
        return this.chunks.size;
    }
    getChunkKey(cx, cy, cz) {
        return `${cx},${cy},${cz}`;
    }
    async generateChunk(cx, cy, cz) {
        // Simple flat world generation for now
        const chunk = new ChunkImpl(cx, cy, cz);
        const [sizeX, sizeY, sizeZ] = chunk.getSize();
        // Fill with grass on top, dirt below, stone at bottom
        for (let lx = 0; lx < sizeX; lx++) {
            for (let lz = 0; lz < sizeZ; lz++) {
                for (let ly = 0; ly < sizeY; ly++) {
                    if (ly === 64) { // Surface
                        chunk.setBlock(lx, ly, lz, { id: 2, metadata: 0 }); // Grass
                    }
                    else if (ly < 64 && ly > 60) { // Dirt layer
                        chunk.setBlock(lx, ly, lz, { id: 3, metadata: 0 }); // Dirt
                    }
                    else if (ly <= 60) { // Stone below
                        chunk.setBlock(lx, ly, lz, { id: 4, metadata: 0 }); // Stone
                    }
                    else { // Air above
                        chunk.setBlock(lx, ly, lz, { id: 0, metadata: 0 }); // Air
                    }
                }
            }
        }
        return chunk;
    }
}
//# sourceMappingURL=ChunkManager.js.map