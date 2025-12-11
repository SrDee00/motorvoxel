import { ICamera } from './types';
export declare class Camera implements ICamera {
    position: [number, number, number];
    rotation: [number, number, number];
    fov: number;
    near: number;
    far: number;
    private viewMatrix;
    private projectionMatrix;
    private viewProjectionMatrix;
    constructor();
    getViewMatrix(): Float32Array;
    getProjectionMatrix(width: number, height: number): Float32Array;
    getViewProjectionMatrix(width: number, height: number): Float32Array;
    update(): void;
    moveForward(distance: number): void;
    moveRight(distance: number): void;
    rotate(yawDelta: number, pitchDelta: number): void;
}
