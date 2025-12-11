# Change: Implement Core Engine

## Why
The core engine is the fundamental layer that provides the infrastructure for all other systems in the MotorVoxel game engine. Implementing this first will establish the foundation needed for subsequent systems like entity-system, voxel-world, and networking.

## What Changes
- Create the core engine module with all required subsystems
- Implement engine initialization and lifecycle management
- Implement game loop with fixed and variable timesteps
- Implement event system for inter-layer communication
- Implement resource management system
- Implement configuration system
- Implement math utilities for 3D operations

## Impact
- Affected specs: core-engine
- Affected code: New implementation in src/core/
- This is a foundational change that all other systems will depend on
- No breaking changes as this is new functionality