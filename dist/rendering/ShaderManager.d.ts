import { IShaderManager, IShader } from './types';
export declare class ShaderManager implements IShaderManager {
    private shaders;
    private gl;
    constructor(gl: WebGLRenderingContext);
    loadShader(name: string, vertexSource: string, fragmentSource: string): Promise<IShader>;
    getShader(name: string): IShader | undefined;
    createShaderProgram(vertexSource: string, fragmentSource: string): WebGLProgram;
    private compileShader;
}
