export class ShaderManager {
    constructor(gl) {
        this.shaders = new Map();
        this.gl = gl;
    }
    async loadShader(name, vertexSource, fragmentSource) {
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        const program = this.createShaderProgram(vertexSource, fragmentSource);
        const shader = {
            program,
            vertexShader,
            fragmentShader,
            use: () => {
                this.gl.useProgram(program);
            },
            setUniform: (name, value) => {
                const location = this.gl.getUniformLocation(program, name);
                if (!location) {
                    console.warn(`Uniform ${name} not found`);
                    return;
                }
                if (typeof value === 'number') {
                    this.gl.uniform1f(location, value);
                }
                else if (Array.isArray(value)) {
                    if (value.length === 2)
                        this.gl.uniform2fv(location, value);
                    else if (value.length === 3)
                        this.gl.uniform3fv(location, value);
                    else if (value.length === 4)
                        this.gl.uniform4fv(location, value);
                }
                else if (value instanceof Float32Array) {
                    this.gl.uniformMatrix4fv(location, false, value);
                }
            }
        };
        this.shaders.set(name, shader);
        return shader;
    }
    getShader(name) {
        return this.shaders.get(name);
    }
    createShaderProgram(vertexSource, fragmentSource) {
        const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
        const program = this.gl.createProgram();
        if (!program) {
            throw new Error('Failed to create shader program');
        }
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            const info = this.gl.getProgramInfoLog(program);
            this.gl.deleteProgram(program);
            throw new Error(`Shader program linking failed: ${info}`);
        }
        return program;
    }
    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        if (!shader) {
            throw new Error('Failed to create shader');
        }
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            const info = this.gl.getShaderInfoLog(shader);
            this.gl.deleteShader(shader);
            throw new Error(`Shader compilation failed: ${info}`);
        }
        return shader;
    }
}
//# sourceMappingURL=ShaderManager.js.map