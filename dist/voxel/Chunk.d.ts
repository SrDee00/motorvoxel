import { Chunk, BlockData, ChunkCoord } from './types';
export declare class ChunkImpl implements Chunk {
    coord: ChunkCoord;
    blocks: BlockData[];
    isDirty: boolean;
    isEmpty: boolean;
    needsMeshing: boolean;
    constructor(cx: number, cy: number, cz: number, sizeX?: number, sizeY?: number, sizeZ?: number);
    getBlock(lx: number, ly: number, lz: number): BlockData;
    setBlock(lx: number, ly: number, lz: number, blockData: BlockData): void;
    private getIndex;
    getSize(): [number, number, number];
    isInBounds(lx: number, ly: number, lz: number): boolean;
}
