import { ChunkCoord, LocalCoord } from '../types';
export declare function worldToChunk(worldX: number, worldZ: number): ChunkCoord;
export declare function worldToLocal(worldX: number, worldY: number, worldZ: number): LocalCoord;
export declare function chunkToWorld(chunk: ChunkCoord): [number, number, number];
export declare function localToIndex(local: LocalCoord, sizeX: number, sizeY: number): number;
export declare function indexToLocal(index: number, sizeX: number, sizeY: number): LocalCoord;
