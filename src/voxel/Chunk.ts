import { Chunk, BlockData, ChunkCoord } from './types';

export class ChunkImpl implements Chunk {
  coord: ChunkCoord;
  blocks: BlockData[];
  isDirty: boolean = false;
  isEmpty: boolean = true;
  needsMeshing: boolean = true;

  constructor(cx: number, cy: number, cz: number, sizeX: number = 16, sizeY: number = 256, sizeZ: number = 16) {
    this.coord = [cx, cy, cz];
    this.blocks = new Array(sizeX * sizeY * sizeZ).fill({ id: 0, metadata: 0 }); // Air by default
  }

  getBlock(lx: number, ly: number, lz: number): BlockData {
    const index = this.getIndex(lx, ly, lz);
    return this.blocks[index];
  }

  setBlock(lx: number, ly: number, lz: number, blockData: BlockData): void {
    const index = this.getIndex(lx, ly, lz);
    this.blocks[index] = blockData;
    this.isDirty = true;
    this.needsMeshing = true;

    // Update isEmpty status
    if (blockData.id !== 0 && this.isEmpty) {
      this.isEmpty = false;
    } else if (blockData.id === 0) {
      // Check if all blocks are air
      this.isEmpty = this.blocks.every(b => b.id === 0);
    }
  }

  private getIndex(lx: number, ly: number, lz: number): number {
    // Assuming standard chunk size for simplicity
    const CHUNK_SIZE_X = 16;
    const CHUNK_SIZE_Y = 256;
    const CHUNK_SIZE_Z = 16;

    return lx + lz * CHUNK_SIZE_X + ly * CHUNK_SIZE_X * CHUNK_SIZE_Z;
  }

  getSize(): [number, number, number] {
    // Standard chunk size
    return [16, 256, 16];
  }

  isInBounds(lx: number, ly: number, lz: number): boolean {
    const [sizeX, sizeY, sizeZ] = this.getSize();
    return lx >= 0 && lx < sizeX && ly >= 0 && ly < sizeY && lz >= 0 && lz < sizeZ;
  }
}