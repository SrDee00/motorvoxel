import { IChunkManager, Chunk, ChunkCoord } from './types';
import { ChunkImpl } from './Chunk';

export class ChunkManager implements IChunkManager {
  private chunks: Map<string, Chunk> = new Map();
  private loadedChunks: Set<string> = new Set();

  getChunk(cx: number, cy: number, cz: number): Chunk | undefined {
    const key = this.getChunkKey(cx, cy, cz);
    return this.chunks.get(key);
  }

  async loadChunk(cx: number, cy: number, cz: number): Promise<Chunk> {
    const key = this.getChunkKey(cx, cy, cz);

    if (this.chunks.has(key)) {
      return this.chunks.get(key)!;
    }

    // Create new chunk
    const chunk = new ChunkImpl(cx, cy, cz);
    this.chunks.set(key, chunk);
    this.loadedChunks.add(key);

    return chunk;
  }

  unloadChunk(cx: number, cy: number, cz: number): void {
    const key = this.getChunkKey(cx, cy, cz);

    if (this.chunks.has(key)) {
      this.chunks.delete(key);
      this.loadedChunks.delete(key);
    }
  }

  getLoadedChunks(): Chunk[] {
    return Array.from(this.loadedChunks.values()).map(key => this.chunks.get(key)!);
  }

  getChunkCount(): number {
    return this.chunks.size;
  }

  private getChunkKey(cx: number, cy: number, cz: number): string {
    return `${cx},${cy},${cz}`;
  }

  async generateChunk(cx: number, cy: number, cz: number): Promise<Chunk> {
    // Simple flat world generation for now
    const chunk = new ChunkImpl(cx, cy, cz);
    const [sizeX, sizeY, sizeZ] = chunk.getSize();

    // Fill with grass on top, dirt below, stone at bottom
    for (let lx = 0; lx < sizeX; lx++) {
      for (let lz = 0; lz < sizeZ; lz++) {
        for (let ly = 0; ly < sizeY; ly++) {
          if (ly === 64) { // Surface
            chunk.setBlock(lx, ly, lz, { id: 2, metadata: 0 }); // Grass
          } else if (ly < 64 && ly > 60) { // Dirt layer
            chunk.setBlock(lx, ly, lz, { id: 3, metadata: 0 }); // Dirt
          } else if (ly <= 60) { // Stone below
            chunk.setBlock(lx, ly, lz, { id: 4, metadata: 0 }); // Stone
          } else { // Air above
            chunk.setBlock(lx, ly, lz, { id: 0, metadata: 0 }); // Air
          }
        }
      }
    }

    return chunk;
  }
}