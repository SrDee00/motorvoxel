import { IBlockRegistry, BlockType, BlockId } from './types';
export declare class BlockRegistry implements IBlockRegistry {
    private blocks;
    private blockNames;
    private nextId;
    registerBlock(block: BlockType): BlockId;
    getBlockById(id: BlockId): BlockType | undefined;
    getBlockByName(name: string): BlockType | undefined;
    getAllBlocks(): BlockType[];
    registerDefaultBlocks(): void;
}
