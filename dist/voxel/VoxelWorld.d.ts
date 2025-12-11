import { IVoxelWorld, Chunk, BlockData } from './types';
import { ChunkManager } from './ChunkManager';
import { BlockRegistry } from './BlockRegistry';
import { EventBus } from '../core/EventBus';
export declare class VoxelWorld implements IVoxelWorld {
    private chunkManager;
    private blockRegistry;
    private eventBus;
    constructor(eventBus: EventBus);
    getBlock(x: number, y: number, z: number): BlockData;
    setBlock(x: number, y: number, z: number, blockId: number): void;
    getChunk(cx: number, cy: number, cz: number): Chunk | undefined;
    loadChunk(cx: number, cy: number, cz: number): Promise<Chunk>;
    unloadChunk(cx: number, cy: number, cz: number): void;
    generateChunk(cx: number, cy: number, cz: number): Promise<Chunk>;
    findBlockRaycast(start: [number, number, number], direction: [number, number, number], maxDistance: number): {
        position: [number, number, number];
        face: number;
    } | null;
    private worldToChunk;
    private worldToLocal;
    private determineFace;
    getBlockRegistry(): BlockRegistry;
    getChunkManager(): ChunkManager;
}
