import { EventBus } from '../core/EventBus';
import { vec3_create, vec3_copy, vec3_scale, vec3_add } from '../core/math/vectors';
import { IPhysicsWorld, RigidBody, CharacterController, RaycastResult, SweepTestResult, PhysicsBodyId, CharacterControllerId, RigidBodyOptions, CharacterControllerOptions, Collider, PhysicsEvents } from './types';

export class PhysicsWorld implements IPhysicsWorld {
  private _gravity: Float32Array = vec3_create(0, -9.81, 0);
  private _debugDraw: boolean = false;
  private _eventBus: EventBus;

  private _rigidBodies: Map<PhysicsBodyId, RigidBody> = new Map();
  private _characterControllers: Map<CharacterControllerId, CharacterController> = new Map();
  private _nextBodyId: PhysicsBodyId = 1;
  private _nextControllerId: CharacterControllerId = 1;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  async init(): Promise<void> {
    // Initialize physics world
    console.log('Physics world initialized');
  }

  update(deltaTime: number): void {
    // Use fixed timestep for physics stability
    const fixedDeltaTime = 1/60; // 60 FPS
    let accumulatedTime = deltaTime;
    
    // Fixed timestep loop
    while (accumulatedTime >= fixedDeltaTime) {
      this.fixedUpdate(fixedDeltaTime);
      accumulatedTime -= fixedDeltaTime;
    }
    
    // Store remaining time for next frame
    this.remainingTime = accumulatedTime;
  }

  private remainingTime: number = 0;

  private fixedUpdate(deltaTime: number): void {
    // Update all rigid bodies with proper physics
    this._rigidBodies.forEach(body => {
      if (body.isStatic || body.isSleeping) return;

      // Store previous position for collision detection
      const previousPosition = vec3_copy(vec3_create(), body.position);

      // Apply gravity
      const gravityForce = vec3_scale(vec3_create(), this._gravity, body.mass);
      vec3_add(body.velocity, body.velocity, vec3_scale(vec3_create(), gravityForce, deltaTime));

      // Apply velocity
      vec3_add(body.position, body.position, vec3_scale(vec3_create(), body.velocity, deltaTime));

      // Apply angular velocity (simple rotation)
      const rotationChange = vec3_scale(vec3_create(), body.angularVelocity, deltaTime);
      vec3_add(body.rotation, body.rotation, rotationChange);

      // Check for collisions and resolve them
      this.resolveCollisions(body, previousPosition, deltaTime);

      // Apply friction
      vec3_scale(body.velocity, body.velocity, Math.max(0, 1 - body.friction * deltaTime));
      vec3_scale(body.angularVelocity, body.angularVelocity, Math.max(0, 1 - body.friction * deltaTime));

      // Check for sleep with hysteresis
      this.checkSleepState(body, deltaTime);
    });

    // Update character controllers
    this._characterControllers.forEach(controller => {
      // Store previous position
      const previousPosition = vec3_copy(vec3_create(), controller.position);

      // Apply gravity
      vec3_add(controller.velocity, controller.velocity, vec3_scale(vec3_create(), this._gravity, deltaTime));

      // Apply velocity
      vec3_add(controller.position, controller.position, vec3_scale(vec3_create(), controller.velocity, deltaTime));

      // Check for ground collision
      controller.isGrounded = this.checkGroundCollision(controller, previousPosition);

      // Update ground normal if grounded
      if (controller.isGrounded) {
        const groundCheckStart = vec3_add(vec3_create(), controller.position, vec3_create(0, 0.1, 0));
        const groundCheckEnd = vec3_add(vec3_create(), controller.position, vec3_create(0, -0.5, 0));
        const groundHit = this.raycast(groundCheckStart, groundCheckEnd);
        
        if (groundHit) {
          vec3_copy(controller.groundNormal, groundHit.normal);
        }
      }
    });
  }

  private checkSleepState(body: RigidBody, deltaTime: number): void {
    // Calculate speed
    const speed = this.vec3_length(body.velocity);
    const angularSpeed = this.vec3_length(body.angularVelocity);
    
    // Different thresholds based on body properties
    const sleepThreshold = 0.01;
    const wakeThreshold = 0.1;
    
    if (body.isSleeping) {
      // Check if we should wake up
      if (speed > wakeThreshold || angularSpeed > wakeThreshold) {
        body.isSleeping = false;
      }
    } else {
      // Check if we should go to sleep
      if (speed < sleepThreshold && angularSpeed < sleepThreshold) {
        // Wait a bit before sleeping to avoid rapid sleep/wake cycles
        if (!body.sleepTimer) {
          body.sleepTimer = 0;
        }
        
        body.sleepTimer += deltaTime;
        
        if (body.sleepTimer >= 0.5) { // Wait 0.5 seconds
          body.isSleeping = true;
          body.sleepTimer = 0;
        }
      } else {
        // Reset sleep timer if moving
        body.sleepTimer = 0;
      }
    }
  }

    // Update character controllers
    this._characterControllers.forEach(controller => {
      // Store previous position
      const previousPosition = vec3_copy(vec3_create(), controller.position);

      // Apply gravity
      vec3_add(controller.velocity, controller.velocity, vec3_scale(vec3_create(), this._gravity, deltaTime));

      // Apply velocity
      vec3_add(controller.position, controller.position, vec3_scale(vec3_create(), controller.velocity, deltaTime));

      // Check for ground collision
      const wasGrounded = controller.isGrounded;
      controller.isGrounded = this.checkGroundCollision(controller, previousPosition);

      // Update ground normal if grounded
      if (controller.isGrounded) {
        const groundCheckStart = vec3_add(vec3_create(), controller.position, vec3_create(0, 0.1, 0));
        const groundCheckEnd = vec3_add(vec3_create(), controller.position, vec3_create(0, -0.5, 0));
        const groundHit = this.raycast(groundCheckStart, groundCheckEnd);
        
        if (groundHit) {
          vec3_copy(controller.groundNormal, groundHit.normal);
        }
        
        // Reset coyote time counter when grounded
        controller.coyoteTimeCounter = controller.coyoteTime || 0.1;
      } else {
        // Decrease coyote time counter when not grounded
        if (controller.coyoteTimeCounter) {
          controller.coyoteTimeCounter -= deltaTime;
        }
      }

      // Handle jump buffer
      if (controller.jumpBufferCounter) {
        controller.jumpBufferCounter -= deltaTime;
        if (controller.jumpBufferCounter <= 0) {
          controller.jumpBufferCounter = 0;
        }
      }

      // Emit grounded state change event
      if (wasGrounded !== controller.isGrounded) {
        this._eventBus.emit('physics:character:grounded', {
          controllerId: controller.id,
          isGrounded: controller.isGrounded
        });
      }
    });
  }

  // Advanced character controller methods
  
  moveCharacter(controllerId: CharacterControllerId, movement: Float32Array, deltaTime: number): void {
    const controller = this._characterControllers.get(controllerId);
    if (!controller) return;

    // Normalize movement vector
    const movementDir = this.vec3_normalize(vec3_create(), movement);
    
    // Apply movement based on ground state
    if (controller.isGrounded) {
      // Ground movement
      const speed = 5.0; // Base movement speed
      const targetVelocity = vec3_scale(vec3_create(), movementDir, speed);
      
      // Apply acceleration
      const acceleration = 15.0;
      const velocityChange = vec3_scale(vec3_create(), this.vec3_subtract(vec3_create(), targetVelocity, controller.velocity), acceleration * deltaTime);
      
      // Apply to XZ plane only
      velocityChange[1] = 0;
      controller.velocity[0] += velocityChange[0];
      controller.velocity[2] += velocityChange[2];
      
      // Apply friction
      const friction = 8.0;
      const currentSpeed = Math.sqrt(controller.velocity[0] * controller.velocity[0] + controller.velocity[2] * controller.velocity[2]);
      if (currentSpeed > 0) {
        const drop = currentSpeed * friction * deltaTime;
        const newSpeed = Math.max(0, currentSpeed - drop);
        const ratio = newSpeed / currentSpeed;
        controller.velocity[0] *= ratio;
        controller.velocity[2] *= ratio;
      }
    } else {
      // Air movement (less control)
      const airSpeed = 2.0;
      const airAcceleration = 5.0;
      const airVelocityChange = vec3_scale(vec3_create(), movementDir, airSpeed * airAcceleration * deltaTime);
      
      // Apply to XZ plane only
      airVelocityChange[1] = 0;
      controller.velocity[0] += airVelocityChange[0];
      controller.velocity[2] += airVelocityChange[2];
    }
  }

  jumpCharacter(controllerId: CharacterControllerId): void {
    const controller = this._characterControllers.get(controllerId);
    if (!controller) return;

    // Check if we can jump (grounded or within coyote time)
    const canJump = controller.isGrounded || (controller.coyoteTimeCounter && controller.coyoteTimeCounter > 0);
    
    if (canJump) {
      // Apply jump force
      controller.velocity[1] = controller.jumpForce || 5.0;
      controller.isGrounded = false;
      controller.coyoteTimeCounter = 0;
      
      // Emit jump event
      this._eventBus.emit('physics:character:grounded', {
        controllerId: controller.id,
        isGrounded: false
      });
    } else {
      // Buffer the jump for when we land
      controller.jumpBufferCounter = controller.jumpBufferTime || 0.1;
    }
  }

  private checkGroundCollision(controller: CharacterController, previousPosition: Float32Array): boolean {
    // Improved ground detection with multiple rays
    const rayCount = 5;
    const raySpacing = controller.radius / (rayCount - 1);
    
    for (let i = 0; i < rayCount; i++) {
      const offsetX = (i - Math.floor(rayCount / 2)) * raySpacing;
      const offsetZ = (i - Math.floor(rayCount / 2)) * raySpacing;
      
      const groundCheckStart = vec3_add(vec3_create(), controller.position, vec3_create(offsetX, 0.1, offsetZ));
      const groundCheckEnd = vec3_add(vec3_create(), controller.position, vec3_create(offsetX, -0.3, offsetZ));
      
      const groundHit = this.raycast(groundCheckStart, groundCheckEnd);
      
      if (groundHit && groundHit.distance < 0.3) {
        // Check slope angle
        const slopeAngle = Math.acos(this.vec3_dot(groundHit.normal, vec3_create(0, 1, 0)));
        
        if (slopeAngle <= (controller.maxSlopeAngle || Math.PI / 4)) {
          // Position correction
          const correction = vec3_scale(vec3_create(), vec3_create(0, 1, 0), 0.3 - groundHit.distance);
          vec3_add(controller.position, controller.position, correction);
          
          // Stop downward velocity
          if (controller.velocity[1] < 0) {
            controller.velocity[1] = 0;
          }
          
          return true;
        }
      }
    }
    
    return false;
  }

  private resolveCollisions(body: RigidBody, previousPosition: Float32Array, deltaTime: number): void {
    // Check for collisions with other bodies
    for (const [otherBodyId, otherBody] of this._rigidBodies) {
      if (otherBodyId === body.id || otherBody.isStatic && !otherBody.collider) continue;

      const collisionInfo = this.checkCollision(body, otherBody);
      
      if (collisionInfo.colliding) {
        // Position correction
        const correction = vec3_scale(vec3_create(), collisionInfo.normal, collisionInfo.penetration * 0.5);
        vec3_add(body.position, body.position, correction);
        
        if (!otherBody.isStatic) {
          this.vec3_subtract(otherBody.position, otherBody.position, correction);
        }

        // Velocity resolution using impulse
        const relativeVelocity = this.vec3_subtract(vec3_create(), body.velocity, otherBody.velocity);
        const velocityAlongNormal = this.vec3_dot(relativeVelocity, collisionInfo.normal);
        
        if (velocityAlongNormal > 0) continue; // Moving away, no collision

        // Calculate impulse
        const e = Math.min(body.restitution, otherBody.restitution);
        const j = -(1 + e) * velocityAlongNormal;
        const denominator = this.vec3_dot(collisionInfo.normal, collisionInfo.normal) * (1/body.mass + 1/otherBody.mass);
        const impulseScalar = j / denominator;
        const impulse = vec3_scale(vec3_create(), collisionInfo.normal, impulseScalar);
        
        // Apply impulse
        vec3_add(body.velocity, body.velocity, vec3_scale(vec3_create(), impulse, 1/body.mass));
        
        if (!otherBody.isStatic) {
          this.vec3_subtract(otherBody.velocity, otherBody.velocity, vec3_scale(vec3_create(), impulse, 1/otherBody.mass));
        }

        // Emit collision event
        this._eventBus.emit('physics:collision', {
          bodyA: body.id,
          bodyB: otherBody.id,
          normal: collisionInfo.normal,
          depth: collisionInfo.penetration
        });

        // Wake up sleeping bodies
        body.isSleeping = false;
        otherBody.isSleeping = false;
      }
    }
  }

  private checkCollision(bodyA: RigidBody, bodyB: RigidBody): { colliding: boolean; normal: Float32Array; penetration: number } {
    // Check collision based on collider types
    const normal = vec3_create(0, 0, 0);
    let penetration = 0;
    let colliding = false;

    // Simple collision detection based on collider types
    if (bodyA.collider.type === 'sphere' && bodyB.collider.type === 'sphere') {
      const distance = this.vec3_distance(bodyA.position, bodyB.position);
      const radiusSum = bodyA.collider.size[0] + bodyB.collider.size[0];
      
      if (distance < radiusSum) {
        colliding = true;
        penetration = radiusSum - distance;
        this.vec3_normalize(normal, this.vec3_subtract(vec3_create(), bodyB.position, bodyA.position));
      }
    } else if (bodyA.collider.type === 'box' && bodyB.collider.type === 'box') {
      // Box-box collision using separating axis theorem (simplified)
      const aHalfSize = vec3_scale(vec3_create(), bodyA.collider.size, 0.5);
      const bHalfSize = vec3_scale(vec3_create(), bodyB.collider.size, 0.5);
      
      const aMin = this.vec3_subtract(vec3_create(), bodyA.position, aHalfSize);
      const aMax = vec3_add(vec3_create(), bodyA.position, aHalfSize);
      const bMin = this.vec3_subtract(vec3_create(), bodyB.position, bHalfSize);
      const bMax = vec3_add(vec3_create(), bodyB.position, bHalfSize);
      
      // Check for overlap on all axes
      const overlapX = Math.min(aMax[0], bMax[0]) - Math.max(aMin[0], bMin[0]);
      const overlapY = Math.min(aMax[1], bMax[1]) - Math.max(aMin[1], bMin[1]);
      const overlapZ = Math.min(aMax[2], bMax[2]) - Math.max(aMin[2], bMin[2]);
      
      if (overlapX > 0 && overlapY > 0 && overlapZ > 0) {
        colliding = true;
        
        // Find smallest overlap for normal
        if (overlapX < overlapY && overlapX < overlapZ) {
          if (aMax[0] < bMax[0]) normal[0] = -1;
          else normal[0] = 1;
          penetration = overlapX;
        } else if (overlapY < overlapZ) {
          if (aMax[1] < bMax[1]) normal[1] = -1;
          else normal[1] = 1;
          penetration = overlapY;
        } else {
          if (aMax[2] < bMax[2]) normal[2] = -1;
          else normal[2] = 1;
          penetration = overlapZ;
        }
      }
    } else {
      // Fallback: simple distance check
      const distance = this.vec3_distance(bodyA.position, bodyB.position);
      const sizeSum = (bodyA.collider.size[0] + bodyB.collider.size[0]) * 0.5;
      
      if (distance < sizeSum) {
        colliding = true;
        penetration = sizeSum - distance;
        this.vec3_normalize(normal, this.vec3_subtract(vec3_create(), bodyB.position, bodyA.position));
      }
    }

    return { colliding, normal, penetration };
  }



  destroy(): void {
    this._rigidBodies.clear();
    this._characterControllers.clear();
  }

  createRigidBody(options: RigidBodyOptions): PhysicsBodyId {
    const bodyId = this._nextBodyId++;
    const body: RigidBody = {
      id: bodyId,
      position: options.position || vec3_create(0, 0, 0),
      rotation: options.rotation || vec3_create(0, 0, 0),
      velocity: vec3_create(0, 0, 0),
      angularVelocity: vec3_create(0, 0, 0),
      mass: options.mass || 1,
      friction: options.friction || 0.5,
      restitution: options.restitution || 0.2,
      collider: options.collider,
      isStatic: options.isStatic || false,
      isKinematic: options.isKinematic || false,
      isSleeping: false
    };

    this._rigidBodies.set(bodyId, body);
    return bodyId;
  }

  destroyRigidBody(bodyId: PhysicsBodyId): void {
    this._rigidBodies.delete(bodyId);
  }

  getRigidBody(bodyId: PhysicsBodyId): RigidBody | null {
    return this._rigidBodies.get(bodyId) || null;
  }

  createCharacterController(options: CharacterControllerOptions): CharacterControllerId {
    const controllerId = this._nextControllerId++;
    const controller: CharacterController = {
      id: controllerId,
      position: options.position || vec3_create(0, 0, 0),
      velocity: vec3_create(0, 0, 0),
      height: options.height || 1.8,
      radius: options.radius || 0.5,
      stepHeight: options.stepHeight || 0.2,
      slopeLimit: options.slopeLimit || 45,
      isGrounded: false,
      groundNormal: vec3_create(0, 1, 0),
      jumpForce: 5.0,
      maxSlopeAngle: Math.cos(options.slopeLimit || 45 * Math.PI / 180),
      coyoteTime: 0.1,
      coyoteTimeCounter: 0,
      jumpBufferTime: 0.1,
      jumpBufferCounter: 0,
      canJump: true
    };

    this._characterControllers.set(controllerId, controller);
    return controllerId;
  }

  destroyCharacterController(controllerId: CharacterControllerId): void {
    this._characterControllers.delete(controllerId);
  }

  getCharacterController(controllerId: CharacterControllerId): CharacterController | null {
    return this._characterControllers.get(controllerId) || null;
  }

  raycast(start: Float32Array, end: Float32Array): RaycastResult | null {
    const direction = this.vec3_subtract(vec3_create(), end, start);
    const length = this.vec3_length(direction);
    const normalizedDirection = this.vec3_normalize(vec3_create(), direction);

    let closestHit: RaycastResult | null = null;
    let closestDistance = Infinity;

    // Use spatial partitioning for optimization
    const potentialBodies = this.getPotentialCollisionBodies(start, end);

    // Check against potential bodies
    for (const [bodyId, body] of potentialBodies) {
      if (body.isStatic && !body.collider) continue;

      let hitResult: RaycastResult | null = null;

      // Different collision checks based on collider type
      switch (body.collider.type) {
        case 'sphere':
          hitResult = this.raycastSphere(start, normalizedDirection, length, body);
          break;
        case 'box':
          hitResult = this.raycastBox(start, normalizedDirection, length, body);
          break;
        case 'capsule':
          hitResult = this.raycastCapsule(start, normalizedDirection, length, body);
          break;
      }

      if (hitResult && hitResult.distance < closestDistance) {
        closestHit = hitResult;
        closestDistance = hitResult.distance;
      }
    }

    return closestHit;
  }

  private getPotentialCollisionBodies(start: Float32Array, end: Float32Array): Map<PhysicsBodyId, RigidBody> {
    // Simple spatial partitioning: divide space into grid cells
    // This is a simplified version - a real implementation would use a proper spatial data structure
    
    const result = new Map<PhysicsBodyId, RigidBody>();
    
    // Calculate bounding box of the ray
    const minX = Math.min(start[0], end[0]);
    const maxX = Math.max(start[0], end[0]);
    const minY = Math.min(start[1], end[1]);
    const maxY = Math.max(start[1], end[1]);
    const minZ = Math.min(start[2], end[2]);
    const maxZ = Math.max(start[2], end[2]);
    
    // Check which bodies could potentially intersect with this bounding box
    for (const [bodyId, body] of this._rigidBodies) {
      if (body.isStatic && !body.collider) continue;
      
      // Simple AABB check
      const bodyMinX = body.position[0] - body.collider.size[0];
      const bodyMaxX = body.position[0] + body.collider.size[0];
      const bodyMinY = body.position[1] - body.collider.size[1];
      const bodyMaxY = body.position[1] + body.collider.size[1];
      const bodyMinZ = body.position[2] - body.collider.size[2];
      const bodyMaxZ = body.position[2] + body.collider.size[2];
      
      // Check for overlap
      if (maxX < bodyMinX || minX > bodyMaxX ||
          maxY < bodyMinY || minY > bodyMaxY ||
          maxZ < bodyMinZ || minZ > bodyMaxZ) {
        continue; // No overlap
      }
      
      // Add to potential collision list
      result.set(bodyId, body);
    }
    
    return result;
  }

  private raycastSphere(start: Float32Array, direction: Float32Array, maxLength: number, body: RigidBody): RaycastResult | null {
    // Sphere collision detection
    const centerToStart = this.vec3_subtract(vec3_create(), start, body.position);
    const a = this.vec3_dot(direction, direction);
    const b = 2 * this.vec3_dot(centerToStart, direction);
    const c = this.vec3_dot(centerToStart, centerToStart) - body.collider.size[0] * body.collider.size[0];
    
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) {
      return null; // No intersection
    }
    
    const sqrtDiscriminant = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDiscriminant) / (2 * a);
    const t2 = (-b + sqrtDiscriminant) / (2 * a);
    
    const t = t1 >= 0 ? t1 : t2;
    
    if (t < 0 || t > maxLength) {
      return null; // Intersection behind start or beyond max length
    }
    
    const hitPoint = vec3_add(vec3_create(), start, vec3_scale(vec3_create(), direction, t));
    const normal = this.vec3_normalize(vec3_create(), this.vec3_subtract(vec3_create(), hitPoint, body.position));
    
    return {
      hit: true,
      point: hitPoint,
      normal: normal,
      distance: t,
      bodyId: body.id
    };
  }

  private raycastBox(start: Float32Array, direction: Float32Array, maxLength: number, body: RigidBody): RaycastResult | null {
    // Box collision detection using slab method
    const halfSize = vec3_scale(vec3_create(), body.collider.size, 0.5);
    const minBounds = this.vec3_subtract(vec3_create(), body.position, halfSize);
    const maxBounds = vec3_add(vec3_create(), body.position, halfSize);
    
    const invDir = vec3_create(
      1 / direction[0],
      1 / direction[1],
      1 / direction[2]
    );
    
    const sign = vec3_create(
      invDir[0] < 0 ? 1 : 0,
      invDir[1] < 0 ? 1 : 0,
      invDir[2] < 0 ? 1 : 0
    );
    
    const boundsMin = vec3_create(
      minBounds[0],
      minBounds[1],
      minBounds[2]
    );
    const boundsMax = vec3_create(
      maxBounds[0],
      maxBounds[1],
      maxBounds[2]
    );
    
    const tmin = vec3_create(
      (boundsMin[0] - start[0]) * invDir[0],
      (boundsMin[1] - start[1]) * invDir[1],
      (boundsMin[2] - start[2]) * invDir[2]
    );
    const tmax = vec3_create(
      (boundsMax[0] - start[0]) * invDir[0],
      (boundsMax[1] - start[1]) * invDir[1],
      (boundsMax[2] - start[2]) * invDir[2]
    );
    
    const t1 = Math.max(tmin[0], tmin[1], tmin[2]);
    const t2 = Math.min(tmax[0], tmax[1], tmax[2]);
    
    if (t1 > t2 || t2 < 0) {
      return null; // No intersection
    }
    
    const t = t1 >= 0 ? t1 : t2;
    
    if (t > maxLength) {
      return null; // Intersection beyond max length
    }
    
    const hitPoint = vec3_add(vec3_create(), start, vec3_scale(vec3_create(), direction, t));
    
    // Calculate normal based on which face was hit
    const normal = vec3_create(0, 0, 0);
    const epsilon = 0.001;
    
    if (Math.abs(hitPoint[0] - boundsMin[0]) < epsilon) normal[0] = -1;
    else if (Math.abs(hitPoint[0] - boundsMax[0]) < epsilon) normal[0] = 1;
    else if (Math.abs(hitPoint[1] - boundsMin[1]) < epsilon) normal[1] = -1;
    else if (Math.abs(hitPoint[1] - boundsMax[1]) < epsilon) normal[1] = 1;
    else if (Math.abs(hitPoint[2] - boundsMin[2]) < epsilon) normal[2] = -1;
    else if (Math.abs(hitPoint[2] - boundsMax[2]) < epsilon) normal[2] = 1;
    
    return {
      hit: true,
      point: hitPoint,
      normal: normal,
      distance: t,
      bodyId: body.id
    };
  }

  private raycastCapsule(start: Float32Array, direction: Float32Array, maxLength: number, body: RigidBody): RaycastResult | null {
    // Capsule collision detection (simplified as line segment with radius)
    const capsuleStart = vec3_add(vec3_create(), body.position, vec3_scale(vec3_create(), vec3_create(0, 1, 0), body.collider.size[1] * 0.5));
    const capsuleEnd = vec3_add(vec3_create(), body.position, vec3_scale(vec3_create(), vec3_create(0, -1, 0), body.collider.size[1] * 0.5));
    
    // Simple approach: raycast against the line segment and check distance
    const segmentDir = this.vec3_subtract(vec3_create(), capsuleEnd, capsuleStart);
    const segmentLength = this.vec3_length(segmentDir);
    const segmentNormalized = this.vec3_normalize(vec3_create(), segmentDir);
    
    const rayToSegmentStart = this.vec3_subtract(vec3_create(), start, capsuleStart);
    const a = this.vec3_dot(direction, direction);
    const b = this.vec3_dot(direction, segmentNormalized);
    const c = this.vec3_dot(segmentNormalized, segmentNormalized);
    const d = this.vec3_dot(direction, rayToSegmentStart);
    const e = this.vec3_dot(segmentNormalized, rayToSegmentStart);
    
    const denominator = a * c - b * b;
    
    if (Math.abs(denominator) < 0.0001) {
      return null; // Parallel
    }
    
    const sc = (b * e - c * d) / denominator;
    const tc = (a * e - b * d) / denominator;
    
    if (sc < 0 || sc > maxLength) {
      return null; // Ray segment doesn't intersect
    }
    
    if (tc < 0 || tc > segmentLength) {
      return null; // Segment doesn't intersect
    }
    
    const hitPoint = vec3_add(vec3_create(), start, vec3_scale(vec3_create(), direction, sc));
    const closestPointOnSegment = vec3_add(vec3_create(), capsuleStart, vec3_scale(vec3_create(), segmentNormalized, tc));
    
    const distance = this.vec3_distance(hitPoint, closestPointOnSegment);
    
    if (distance > body.collider.size[0]) {
      return null; // Outside capsule radius
    }
    
    const normal = this.vec3_normalize(vec3_create(), this.vec3_subtract(vec3_create(), hitPoint, closestPointOnSegment));
    
    return {
      hit: true,
      point: hitPoint,
      normal: normal,
      distance: sc,
      bodyId: body.id
    };
  }

  sweepTest(body: RigidBody, displacement: Float32Array): SweepTestResult {
    // Simple sweep test implementation
    const endPosition = vec3_add(vec3_create(), body.position, displacement);

    // Check if we hit anything along the path
    const raycastResult = this.raycast(body.position, endPosition);

    if (raycastResult && raycastResult.hit) {
      return {
        hit: true,
        point: raycastResult.point,
        normal: raycastResult.normal,
        distance: raycastResult.distance,
        bodyId: raycastResult.bodyId
      };
    }

    return {
      hit: false,
      point: endPosition,
      normal: vec3_create(0, 1, 0),
      distance: this.vec3_length(displacement),
      bodyId: null
    };
  }

  get gravity(): Float32Array {
    return this._gravity;
  }

  set gravity(value: Float32Array) {
    vec3_copy(this._gravity, value);
  }

  get debugDraw(): boolean {
    return this._debugDraw;
  }

  set debugDraw(value: boolean) {
    this._debugDraw = value;
  }

  // Helper function for vector length
  private vec3_length(v: Float32Array): number {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  }

  // Helper function for vector distance
  private vec3_distance(a: Float32Array, b: Float32Array): number {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    const dz = a[2] - b[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  // Helper function for vector dot product
  private vec3_dot(a: Float32Array, b: Float32Array): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  // Helper function for vector normalize
  private vec3_normalize(out: Float32Array, a: Float32Array): Float32Array {
    const len = this.vec3_length(a);
    if (len > 0) {
      out[0] = a[0] / len;
      out[1] = a[1] / len;
      out[2] = a[2] / len;
    }
    return out;
  }

  // Helper function for vector subtract
  private vec3_subtract(out: Float32Array, a: Float32Array, b: Float32Array): Float32Array {
    out[0] = a[0] - b[0];
    out[1] = a[1] - b[1];
    out[2] = a[2] - b[2];
    return out;
  }
}