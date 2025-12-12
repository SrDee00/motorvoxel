import { IChunkMesh, IMesh } from './types';

export class ChunkMesher {
  createChunkMesh(chunk: any): IChunkMesh {
    // Check if chunk has data
    if (!chunk || !chunk.coord || !chunk.blocks) {
      return this._createEmptyMesh(chunk.coord);
    }

    const chunkSize = chunk.size || [16, 16, 16]; // Default chunk size
    const [width, height, depth] = chunkSize;

    // Create arrays for mesh data
    const vertices: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    const uv: number[] = [];

    // Greedy meshing algorithm
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < depth; z++) {
          const blockType = this._getBlockType(chunk, x, y, z);
          
          if (blockType === 0) continue; // Skip air blocks
          
          // Check each face
          this._addFaceIfVisible(chunk, x, y, z, 'front', blockType, vertices, normals, indices, uv);
          this._addFaceIfVisible(chunk, x, y, z, 'back', blockType, vertices, normals, indices, uv);
          this._addFaceIfVisible(chunk, x, y, z, 'left', blockType, vertices, normals, indices, uv);
          this._addFaceIfVisible(chunk, x, y, z, 'right', blockType, vertices, normals, indices, uv);
          this._addFaceIfVisible(chunk, x, y, z, 'top', blockType, vertices, normals, indices, uv);
          this._addFaceIfVisible(chunk, x, y, z, 'bottom', blockType, vertices, normals, indices, uv);
        }
      }
    }

    // Create WebGL buffers (will be created by WebGLRenderer)
    const vertexBuffer = new WebGLBuffer();
    const indexBuffer = new WebGLBuffer();

    const mesh: IMesh = {
      vertexBuffer,
      indexBuffer,
      vertexCount: vertices.length / 3,
      indexCount: indices.length,
      render: () => {
        // Render implementation will be handled by WebGLRenderer
      },
      updateVertices: (newVertices: Float32Array) => {
        // Update vertices
      },
      updateIndices: (newIndices: Uint16Array) => {
        // Update indices
      }
    };

    return {
      mesh,
      chunkCoord: chunk.coord,
      isVisible: true,
      vertexCount: vertices.length / 3,
      indexCount: indices.length,
      updateFromChunk: (newChunk: any) => {
        // Update mesh from new chunk data
        const updatedMesh = this.createChunkMesh(newChunk);
        mesh.vertexBuffer = updatedMesh.mesh.vertexBuffer;
        mesh.normalBuffer = updatedMesh.mesh.normalBuffer;
        mesh.uvBuffer = updatedMesh.mesh.uvBuffer;
        mesh.indexBuffer = updatedMesh.mesh.indexBuffer;
        mesh.vertexCount = updatedMesh.mesh.vertexCount;
        mesh.indexCount = updatedMesh.mesh.indexCount;
      },
      render: () => {
        mesh.render();
      }
    };
  }

  private _createEmptyMesh(coord: any): IChunkMesh {
    const emptyMesh: IMesh = {
      vertexBuffer: null,
      normalBuffer: null,
      uvBuffer: null,
      indexBuffer: null,
      vertexCount: 0,
      indexCount: 0,
      render: () => {},
      updateVertices: () => {},
      updateIndices: () => {}
    };

    return {
      mesh: emptyMesh,
      chunkCoord: coord,
      isVisible: false,
      vertexCount: 0,
      indexCount: 0,
      updateFromChunk: () => {},
      render: () => {}
    };
  }

  private _getBlockType(chunk: any, x: number, y: number, z: number): number {
    // Get block type from chunk data
    // This is a simplified implementation
    if (chunk.blocks && chunk.blocks[x] && chunk.blocks[x][y] && chunk.blocks[x][y][z]) {
      return chunk.blocks[x][y][z];
    }
    return 0; // Air
  }

  private _addFaceIfVisible(chunk: any, x: number, y: number, z: number, face: string, 
                           blockType: number, vertices: number[], normals: number[], 
                           indices: number[], uv: number[]): void {
    // Check if face is visible (not adjacent to another block)
    const neighborPos = this._getNeighborPosition(x, y, z, face);
    const neighborType = this._getBlockType(chunk, neighborPos[0], neighborPos[1], neighborPos[2]);
    
    if (neighborType !== 0) {
      return; // Face is not visible
    }
    
    // Add face vertices
    const faceVertices = this._getFaceVertices(x, y, z, face);
    const faceNormals = this._getFaceNormals(face);
    const faceUV = this._getFaceUV(face, blockType);
    
    const startIndex = vertices.length / 3;
    
    // Add vertices
    vertices.push(...faceVertices);
    
    // Add normals
    for (let i = 0; i < 4; i++) {
      normals.push(...faceNormals);
    }
    
    // Add UV coordinates
    uv.push(...faceUV);
    
    // Add indices (two triangles)
    indices.push(startIndex, startIndex + 1, startIndex + 2);
    indices.push(startIndex, startIndex + 2, startIndex + 3);
  }

  private _getNeighborPosition(x: number, y: number, z: number, face: string): [number, number, number] {
    switch (face) {
      case 'front': return [x, y, z + 1];
      case 'back': return [x, y, z - 1];
      case 'left': return [x - 1, y, z];
      case 'right': return [x + 1, y, z];
      case 'top': return [x, y + 1, z];
      case 'bottom': return [x, y - 1, z];
      default: return [x, y, z];
    }
  }

  private _getFaceVertices(x: number, y: number, z: number, face: string): number[] {
    const size = 1.0; // Block size
    const halfSize = size / 2;
    
    switch (face) {
      case 'front': // Z+
        return [
          x - halfSize, y - halfSize, z + halfSize, // bottom-left
          x + halfSize, y - halfSize, z + halfSize, // bottom-right
          x + halfSize, y + halfSize, z + halfSize, // top-right
          x - halfSize, y + halfSize, z + halfSize  // top-left
        ];
      case 'back': // Z-
        return [
          x + halfSize, y - halfSize, z - halfSize, // bottom-right
          x - halfSize, y - halfSize, z - halfSize, // bottom-left
          x - halfSize, y + halfSize, z - halfSize, // top-left
          x + halfSize, y + halfSize, z - halfSize  // top-right
        ];
      case 'left': // X-
        return [
          x - halfSize, y - halfSize, z - halfSize, // bottom-back
          x - halfSize, y - halfSize, z + halfSize, // bottom-front
          x - halfSize, y + halfSize, z + halfSize, // top-front
          x - halfSize, y + halfSize, z - halfSize  // top-back
        ];
      case 'right': // X+
        return [
          x + halfSize, y - halfSize, z + halfSize, // bottom-front
          x + halfSize, y - halfSize, z - halfSize, // bottom-back
          x + halfSize, y + halfSize, z - halfSize, // top-back
          x + halfSize, y + halfSize, z + halfSize  // top-front
        ];
      case 'top': // Y+
        return [
          x - halfSize, y + halfSize, z + halfSize, // front-left
          x + halfSize, y + halfSize, z + halfSize, // front-right
          x + halfSize, y + halfSize, z - halfSize, // back-right
          x - halfSize, y + halfSize, z - halfSize  // back-left
        ];
      case 'bottom': // Y-
        return [
          x - halfSize, y - halfSize, z - halfSize, // back-left
          x + halfSize, y - halfSize, z - halfSize, // back-right
          x + halfSize, y - halfSize, z + halfSize, // front-right
          x - halfSize, y - halfSize, z + halfSize  // front-left
        ];
      default:
        return [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
  }

  private _getFaceNormals(face: string): number[] {
    switch (face) {
      case 'front': return [0, 0, 1];
      case 'back': return [0, 0, -1];
      case 'left': return [-1, 0, 0];
      case 'right': return [1, 0, 0];
      case 'top': return [0, 1, 0];
      case 'bottom': return [0, -1, 0];
      default: return [0, 0, 0];
    }
  }

  private _getFaceUV(face: string, blockType: number): number[] {
    // Simple UV mapping - will be enhanced with texture atlases
    const textureIndex = blockType % 16; // Assuming 16x16 texture atlas
    const texSize = 1/16;
    const texX = (textureIndex % 4) * texSize;
    const texY = Math.floor(textureIndex / 4) * texSize;
    
    return [
      texX, texY + texSize, // bottom-left
      texX + texSize, texY + texSize, // bottom-right
      texX + texSize, texY, // top-right
      texX, texY // top-left
    ];
  }

  private _createVertexBuffer(vertices: number[]): WebGLBuffer | null {
    // This will be created by WebGLRenderer when rendering
    return null;
  }

  private _createNormalBuffer(normals: number[]): WebGLBuffer | null {
    // This will be created by WebGLRenderer when rendering
    return null;
  }

  private _createUVBuffer(uv: number[]): WebGLBuffer | null {
    // This will be created by WebGLRenderer when rendering
    return null;
  }

  private _createIndexBuffer(indices: number[]): WebGLBuffer | null {
    // This will be created by WebGLRenderer when rendering
    return null;
  }

  // Greedy meshing optimization
  createChunkMeshOptimized(chunk: any): IChunkMesh {
    // This is a placeholder for the actual greedy meshing implementation
    // For now, we'll use the simple implementation
    return this.createChunkMesh(chunk);
  }
}