import { IChunkManager, Chunk } from './types';
export declare class ChunkManager implements IChunkManager {
    private chunks;
    private loadedChunks;
    getChunk(cx: number, cy: number, cz: number): Chunk | undefined;
    loadChunk(cx: number, cy: number, cz: number): Promise<Chunk>;
    unloadChunk(cx: number, cy: number, cz: number): void;
    getLoadedChunks(): Chunk[];
    getChunkCount(): number;
    private getChunkKey;
    generateChunk(cx: number, cy: number, cz: number): Promise<Chunk>;
}
