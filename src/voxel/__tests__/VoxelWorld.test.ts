import { VoxelWorld } from '../VoxelWorld';
import { EventBus } from '../../core/EventBus';

describe('VoxelWorld', () => {
  let voxelWorld: VoxelWorld;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    voxelWorld = new VoxelWorld(eventBus);
  });

  test('should get and set blocks', async () => {
    // Generate a chunk first
    await voxelWorld.generateChunk(0, 0, 0);

    // Get air block at origin
    const airBlock = voxelWorld.getBlock(0, 0, 0);
    expect(airBlock.id).toBe(0); // Air

    // Set a block
    voxelWorld.setBlock(0, 0, 0, 2); // Grass

    // Give it a moment to process
    await new Promise(resolve => setTimeout(resolve, 10));

    // Verify the block was set
    const newBlock = voxelWorld.getBlock(0, 0, 0);
    expect(newBlock.id).toBe(2);
  });

  test('should load and unload chunks', async () => {
    // Load a chunk
    const chunk = await voxelWorld.loadChunk(0, 0, 0);
    expect(chunk).toBeDefined();
    expect(chunk.coord).toEqual([0, 0, 0]);

    // Unload the chunk
    voxelWorld.unloadChunk(0, 0, 0);
    const unloadedChunk = voxelWorld.getChunk(0, 0, 0);
    expect(unloadedChunk).toBeUndefined();
  });

  test('should generate chunks', async () => {
    const chunk = await voxelWorld.generateChunk(0, 0, 0);
    expect(chunk).toBeDefined();
    expect(chunk.coord).toEqual([0, 0, 0]);

    // Check that some blocks were generated (not all air)
    const blockData = (chunk as any).blocks;
    const hasNonAirBlocks = blockData.some((b: any) => b.id !== 0);
    expect(hasNonAirBlocks).toBe(true);
  });

  test('should perform raycast', () => {
    // Generate a chunk first
    voxelWorld.generateChunk(0, 0, 0).then(() => {
      // Raycast from above the world downward
      const result = voxelWorld.findBlockRaycast(
        [8, 100, 8], // Start above world
        [0, -1, 0],  // Down direction
        200           // Max distance
      );

      expect(result).toBeDefined();
      if (result) {
        expect(result.position[1]).toBeLessThan(100); // Should hit something below start
        expect(result.position[1]).toBeGreaterThan(0); // Should hit above bottom
      }
    });
  });

  test('should manage block registry', () => {
    const registry = voxelWorld.getBlockRegistry();
    const blocks = registry.getAllBlocks();

    expect(blocks.length).toBeGreaterThan(0);
    expect(registry.getBlockByName('air')).toBeDefined();
    expect(registry.getBlockByName('grass')).toBeDefined();
  });
});