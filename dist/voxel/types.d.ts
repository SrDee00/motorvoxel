export type BlockId = number;
export type ChunkCoord = [number, number, number];
export type LocalCoord = [number, number, number];
export interface BlockType {
    id: BlockId;
    name: string;
    texture: string;
    isSolid: boolean;
    isTransparent: boolean;
    lightEmission: number;
    hardness: number;
    resistance: number;
}
export interface BlockData {
    id: BlockId;
    metadata: number;
}
export interface Chunk {
    coord: ChunkCoord;
    blocks: BlockData[];
    isDirty: boolean;
    isEmpty: boolean;
    needsMeshing: boolean;
}
export interface IVoxelWorld {
    getBlock(x: number, y: number, z: number): BlockData;
    setBlock(x: number, y: number, z: number, blockId: BlockId): void;
    getChunk(cx: number, cy: number, cz: number): Chunk | undefined;
    loadChunk(cx: number, cy: number, cz: number): Promise<Chunk>;
    unloadChunk(cx: number, cy: number, cz: number): void;
    generateChunk(cx: number, cy: number, cz: number): Promise<Chunk>;
    findBlockRaycast(start: [number, number, number], direction: [number, number, number], maxDistance: number): {
        position: [number, number, number];
        face: number;
    } | null;
}
export interface IChunkManager {
    getChunk(cx: number, cy: number, cz: number): Chunk | undefined;
    loadChunk(cx: number, cy: number, cz: number): Promise<Chunk>;
    unloadChunk(cx: number, cy: number, cz: number): void;
    getLoadedChunks(): Chunk[];
    getChunkCount(): number;
}
export interface IWorldGenerator {
    generateChunk(cx: number, cy: number, cz: number): Promise<Chunk>;
    getHeightAt(x: number, z: number): number;
    getBiomeAt(x: number, z: number): string;
}
export interface IBlockRegistry {
    registerBlock(block: BlockType): BlockId;
    getBlockById(id: BlockId): BlockType | undefined;
    getBlockByName(name: string): BlockType | undefined;
    getAllBlocks(): BlockType[];
}
export declare enum BlockFace {
    FRONT = 0,
    BACK = 1,
    LEFT = 2,
    RIGHT = 3,
    TOP = 4,
    BOTTOM = 5
}
