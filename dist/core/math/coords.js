export function worldToChunk(worldX, worldZ) {
    const chunkSizeX = 16; // Default chunk size
    const chunkSizeZ = 16;
    const cx = Math.floor(worldX / chunkSizeX);
    const cz = Math.floor(worldZ / chunkSizeZ);
    return { cx, cy: 0, cz }; // Simplified for 2D chunk coordinates
}
export function worldToLocal(worldX, worldY, worldZ) {
    const chunkSizeX = 16;
    const chunkSizeY = 256;
    const chunkSizeZ = 16;
    const lx = ((worldX % chunkSizeX) + chunkSizeX) % chunkSizeX;
    const ly = ((worldY % chunkSizeY) + chunkSizeY) % chunkSizeY;
    const lz = ((worldZ % chunkSizeZ) + chunkSizeZ) % chunkSizeZ;
    return { lx, ly, lz };
}
export function chunkToWorld(chunk) {
    const chunkSizeX = 16;
    const chunkSizeZ = 16;
    return [
        chunk.cx * chunkSizeX,
        0, // Simplified
        chunk.cz * chunkSizeZ
    ];
}
export function localToIndex(local, sizeX, sizeY) {
    return local.lx + local.lz * sizeX + local.ly * sizeX * sizeY;
}
export function indexToLocal(index, sizeX, sizeY) {
    const lz = Math.floor(index / (sizeX * sizeY));
    const remainder = index % (sizeX * sizeY);
    const ly = Math.floor(remainder / sizeX);
    const lx = remainder % sizeX;
    return { lx, ly, lz };
}
//# sourceMappingURL=coords.js.map