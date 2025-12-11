import { IVoxelWorld, Chunk, BlockData, ChunkCoord } from './types';
import { ChunkManager } from './ChunkManager';
import { BlockRegistry } from './BlockRegistry';
import { EventBus } from '../core/EventBus';

export class VoxelWorld implements IVoxelWorld {
  private chunkManager: ChunkManager;
  private blockRegistry: BlockRegistry;
  private eventBus: EventBus;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.chunkManager = new ChunkManager();
    this.blockRegistry = new BlockRegistry();
    this.blockRegistry.registerDefaultBlocks();
  }

  getBlock(x: number, y: number, z: number): BlockData {
    const [cx, cy, cz] = this.worldToChunk(x, y, z);
    const [lx, ly, lz] = this.worldToLocal(x, y, z);

    const chunk = this.chunkManager.getChunk(cx, cy, cz);
    if (!chunk) {
      return { id: 0, metadata: 0 }; // Air if chunk not loaded
    }

    return (chunk as any).getBlock(lx, ly, lz);
  }

  setBlock(x: number, y: number, z: number, blockId: number): void {
    const [cx, cy, cz] = this.worldToChunk(x, y, z);
    const [lx, ly, lz] = this.worldToLocal(x, y, z);

    // Load chunk if not already loaded
    this.chunkManager.loadChunk(cx, cy, cz).then(chunk => {
      (chunk as any).setBlock(lx, ly, lz, { id: blockId, metadata: 0 });
      this.eventBus.emit('block:changed', { x, y, z, oldType: 0, newType: blockId });
    });
  }

  getChunk(cx: number, cy: number, cz: number): Chunk | undefined {
    return this.chunkManager.getChunk(cx, cy, cz);
  }

  async loadChunk(cx: number, cy: number, cz: number): Promise<Chunk> {
    return this.chunkManager.loadChunk(cx, cy, cz);
  }

  unloadChunk(cx: number, cy: number, cz: number): void {
    this.chunkManager.unloadChunk(cx, cy, cz);
  }

  async generateChunk(cx: number, cy: number, cz: number): Promise<Chunk> {
    return this.chunkManager.generateChunk(cx, cy, cz);
  }

  findBlockRaycast(start: [number, number, number], direction: [number, number, number], maxDistance: number): { position: [number, number, number]; face: number } | null {
    // Simple raycast implementation
    let currentPos = [...start] as [number, number, number];
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

  private worldToChunk(x: number, y: number, z: number): ChunkCoord {
    const CHUNK_SIZE_X = 16;
    const CHUNK_SIZE_Y = 256;
    const CHUNK_SIZE_Z = 16;

    return [
      Math.floor(x / CHUNK_SIZE_X),
      Math.floor(y / CHUNK_SIZE_Y),
      Math.floor(z / CHUNK_SIZE_Z)
    ];
  }

  private worldToLocal(x: number, y: number, z: number): [number, number, number] {
    const CHUNK_SIZE_X = 16;
    const CHUNK_SIZE_Y = 256;
    const CHUNK_SIZE_Z = 16;

    return [
      ((x % CHUNK_SIZE_X) + CHUNK_SIZE_X) % CHUNK_SIZE_X,
      ((y % CHUNK_SIZE_Y) + CHUNK_SIZE_Y) % CHUNK_SIZE_Y,
      ((z % CHUNK_SIZE_Z) + CHUNK_SIZE_Z) % CHUNK_SIZE_Z
    ];
  }

  private determineFace(direction: [number, number, number]): number {
    // Simple face determination based on direction
    const absDir = [Math.abs(direction[0]), Math.abs(direction[1]), Math.abs(direction[2])];
    const max = Math.max(...absDir);

    if (max === absDir[0]) return direction[0] > 0 ? 3 : 2; // RIGHT : LEFT
    if (max === absDir[1]) return direction[1] > 0 ? 4 : 5; // TOP : BOTTOM
    return direction[2] > 0 ? 0 : 1; // FRONT : BACK
  }

  getBlockRegistry(): BlockRegistry {
    return this.blockRegistry;
  }

  getChunkManager(): ChunkManager {
    return this.chunkManager;
  }
}