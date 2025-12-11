import { vec3_create } from '../core/math/vectors';
export class Camera {
    constructor() {
        this.position = [0, 0, 0];
        this.rotation = [0, 0, 0]; // [yaw, pitch, roll]
        this.fov = 70;
        this.near = 0.1;
        this.far = 1000;
        this.viewMatrix = new Float32Array(16);
        this.projectionMatrix = new Float32Array(16);
        this.viewProjectionMatrix = new Float32Array(16);
        this.update();
    }
    getViewMatrix() {
        return this.viewMatrix;
    }
    getProjectionMatrix(width, height) {
        // Update projection matrix if canvas size changed
        // Simple perspective matrix
        const fovRad = this.fov * Math.PI / 180;
        const aspect = width / height;
        const f = 1.0 / Math.tan(fovRad / 2);
        this.projectionMatrix[0] = f / aspect;
        this.projectionMatrix[1] = 0;
        this.projectionMatrix[2] = 0;
        this.projectionMatrix[3] = 0;
        this.projectionMatrix[4] = 0;
        this.projectionMatrix[5] = f;
        this.projectionMatrix[6] = 0;
        this.projectionMatrix[7] = 0;
        this.projectionMatrix[8] = 0;
        this.projectionMatrix[9] = 0;
        this.projectionMatrix[10] = (this.far + this.near) / (this.near - this.far);
        this.projectionMatrix[11] = -1;
        this.projectionMatrix[12] = 0;
        this.projectionMatrix[13] = 0;
        this.projectionMatrix[14] = (2 * this.far * this.near) / (this.near - this.far);
        this.projectionMatrix[15] = 0;
        // Multiply matrices (simplified)
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                this.viewProjectionMatrix[i * 4 + j] =
                    this.projectionMatrix[i * 4 + 0] * this.viewMatrix[0 * 4 + j] +
                        this.projectionMatrix[i * 4 + 1] * this.viewMatrix[1 * 4 + j] +
                        this.projectionMatrix[i * 4 + 2] * this.viewMatrix[2 * 4 + j] +
                        this.projectionMatrix[i * 4 + 3] * this.viewMatrix[3 * 4 + j];
            }
        }
        return this.projectionMatrix;
    }
    getViewProjectionMatrix(width, height) {
        this.getProjectionMatrix(width, height);
        return this.viewProjectionMatrix;
    }
    update() {
        // Simple view matrix calculation
        const position = vec3_create(...this.position);
        // Calculate target based on rotation
        const yaw = this.rotation[0];
        const pitch = this.rotation[1];
        const targetX = position[0] + Math.cos(yaw) * Math.cos(pitch);
        const targetY = position[1] + Math.sin(pitch);
        const targetZ = position[2] + Math.sin(yaw) * Math.cos(pitch);
        // Simple look-at matrix (simplified)
        const zAxis = vec3_create(position[0] - targetX, position[1] - targetY, position[2] - targetZ);
        // Normalize z-axis
        const zLength = Math.sqrt(zAxis[0] * zAxis[0] + zAxis[1] * zAxis[1] + zAxis[2] * zAxis[2]);
        zAxis[0] /= zLength;
        zAxis[1] /= zLength;
        zAxis[2] /= zLength;
        // Calculate x-axis (right)
        const up = vec3_create(0, 1, 0);
        const xAxis = vec3_create(up[1] * zAxis[2] - up[2] * zAxis[1], up[2] * zAxis[0] - up[0] * zAxis[2], up[0] * zAxis[1] - up[1] * zAxis[0]);
        // Normalize x-axis
        const xLength = Math.sqrt(xAxis[0] * xAxis[0] + xAxis[1] * xAxis[1] + xAxis[2] * xAxis[2]);
        xAxis[0] /= xLength;
        xAxis[1] /= xLength;
        xAxis[2] /= xLength;
        // Calculate y-axis (up)
        const yAxis = vec3_create(zAxis[1] * xAxis[2] - zAxis[2] * xAxis[1], zAxis[2] * xAxis[0] - zAxis[0] * xAxis[2], zAxis[0] * xAxis[1] - zAxis[1] * xAxis[0]);
        // Build view matrix
        this.viewMatrix[0] = xAxis[0];
        this.viewMatrix[1] = yAxis[0];
        this.viewMatrix[2] = zAxis[0];
        this.viewMatrix[3] = 0;
        this.viewMatrix[4] = xAxis[1];
        this.viewMatrix[5] = yAxis[1];
        this.viewMatrix[6] = zAxis[1];
        this.viewMatrix[7] = 0;
        this.viewMatrix[8] = xAxis[2];
        this.viewMatrix[9] = yAxis[2];
        this.viewMatrix[10] = zAxis[2];
        this.viewMatrix[11] = 0;
        this.viewMatrix[12] = -(xAxis[0] * position[0] + xAxis[1] * position[1] + xAxis[2] * position[2]);
        this.viewMatrix[13] = -(yAxis[0] * position[0] + yAxis[1] * position[1] + yAxis[2] * position[2]);
        this.viewMatrix[14] = -(zAxis[0] * position[0] + zAxis[1] * position[1] + zAxis[2] * position[2]);
        this.viewMatrix[15] = 1;
    }
    moveForward(distance) {
        const yaw = this.rotation[0];
        const pitch = this.rotation[1];
        this.position[0] += Math.cos(yaw) * Math.cos(pitch) * distance;
        this.position[1] += Math.sin(pitch) * distance;
        this.position[2] += Math.sin(yaw) * Math.cos(pitch) * distance;
        this.update();
    }
    moveRight(distance) {
        const yaw = this.rotation[0];
        this.position[0] += Math.sin(yaw) * distance;
        this.position[2] -= Math.cos(yaw) * distance;
        this.update();
    }
    rotate(yawDelta, pitchDelta) {
        this.rotation[0] += yawDelta;
        this.rotation[1] += pitchDelta;
        // Clamp pitch to avoid over-rotation
        this.rotation[1] = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotation[1]));
        this.update();
    }
}
//# sourceMappingURL=Camera.js.map