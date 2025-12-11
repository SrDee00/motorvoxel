import { ChunkCoord, LocalCoord } from '../types';

export function worldToChunk(worldX: number, worldZ: number): ChunkCoord {
  const chunkSizeX = 16; // Default chunk size
  const chunkSizeZ = 16;

  const cx = Math.floor(worldX / chunkSizeX);
  const cz = Math.floor(worldZ / chunkSizeZ);

  return { cx, cy: 0, cz }; // Simplified for 2D chunk coordinates
}

export function worldToLocal(worldX: number, worldY: number, worldZ: number): LocalCoord {
  const chunkSizeX = 16;
  const chunkSizeY = 256;
  const chunkSizeZ = 16;

  const lx = ((worldX % chunkSizeX) + chunkSizeX) % chunkSizeX;
  const ly = ((worldY % chunkSizeY) + chunkSizeY) % chunkSizeY;
  const lz = ((worldZ % chunkSizeZ) + chunkSizeZ) % chunkSizeZ;

  return { lx, ly, lz };
}

export function chunkToWorld(chunk: ChunkCoord): [number, number, number] {
  const chunkSizeX = 16;
  const chunkSizeZ = 16;

  return [
    chunk.cx * chunkSizeX,
    0, // Simplified
    chunk.cz * chunkSizeZ
  ];
}

export function localToIndex(local: LocalCoord, sizeX: number, sizeY: number): number {
  return local.lx + local.lz * sizeX + local.ly * sizeX * sizeY;
}

export function indexToLocal(index: number, sizeX: number, sizeY: number): LocalCoord {
  const lz = Math.floor(index / (sizeX * sizeY));
  const remainder = index % (sizeX * sizeY);
  const ly = Math.floor(remainder / sizeX);
  const lx = remainder % sizeX;

  return { lx, ly, lz };
}