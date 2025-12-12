import { Vec3 } from '../core/types';

export interface IPhysicsWorld {
  init(): Promise<void>;
  update(deltaTime: number): void;
  destroy(): void;

  createRigidBody(options: RigidBodyOptions): PhysicsBodyId;
  destroyRigidBody(bodyId: PhysicsBodyId): void;
  getRigidBody(bodyId: PhysicsBodyId): RigidBody | null;

  createCharacterController(options: CharacterControllerOptions): CharacterControllerId;
  destroyCharacterController(controllerId: CharacterControllerId): void;
  getCharacterController(controllerId: CharacterControllerId): CharacterController | null;

  raycast(start: Vec3, end: Vec3): RaycastResult | null;
  sweepTest(body: RigidBody, displacement: Vec3): SweepTestResult;

  readonly gravity: Vec3;
  readonly debugDraw: boolean;
}

export interface RigidBody {
  id: PhysicsBodyId;
  position: Vec3;
  rotation: Vec3;
  velocity: Vec3;
  angularVelocity: Vec3;
  mass: number;
  friction: number;
  restitution: number;
  collider: Collider;
  isStatic: boolean;
  isKinematic: boolean;
  isSleeping: boolean;
}

export interface CharacterController {
  id: CharacterControllerId;
  position: Vec3;
  velocity: Vec3;
  height: number;
  radius: number;
  stepHeight: number;
  slopeLimit: number;
  isGrounded: boolean;
  groundNormal: Vec3;
  
  // Advanced character controller properties
  jumpForce?: number;
  maxSlopeAngle?: number;
  coyoteTime?: number;
  coyoteTimeCounter?: number;
  jumpBufferTime?: number;
  jumpBufferCounter?: number;
  canJump?: boolean;
}

export interface RaycastResult {
  hit: boolean;
  point: Vec3;
  normal: Vec3;
  distance: number;
  bodyId: PhysicsBodyId | null;
}

export interface SweepTestResult {
  hit: boolean;
  point: Vec3;
  normal: Vec3;
  distance: number;
  bodyId: PhysicsBodyId | null;
}

export type PhysicsBodyId = number;
export type CharacterControllerId = number;

export interface RigidBodyOptions {
  position?: Vec3;
  rotation?: Vec3;
  mass?: number;
  friction?: number;
  restitution?: number;
  collider: Collider;
  isStatic?: boolean;
  isKinematic?: boolean;
}

export interface CharacterControllerOptions {
  position?: Vec3;
  height?: number;
  radius?: number;
  stepHeight?: number;
  slopeLimit?: number;
}

export interface Collider {
  type: 'box' | 'sphere' | 'capsule' | 'mesh';
  size: Vec3;
  offset?: Vec3;
}

export interface PhysicsEvents {
  'physics:collision': {
    bodyA: PhysicsBodyId;
    bodyB: PhysicsBodyId;
    normal: Vec3;
    depth: number;
  };
  'physics:trigger': {
    bodyA: PhysicsBodyId;
    bodyB: PhysicsBodyId;
  };
  'physics:character:grounded': {
    controllerId: CharacterControllerId;
    isGrounded: boolean;
  };
}