# Change: Implement Entity System (ECS)

## Why
The Entity System is the core architecture for game object management in MotorVoxel. It provides the Entity-Component-System pattern that enables efficient, modular, and performant game logic. This system is essential for managing players, NPCs, items, and all interactive objects in the voxel world.

## What Changes
- Create the entity system module with ECS architecture
- Implement entity manager for lifecycle management
- Implement component definition and registration system
- Implement system execution framework
- Implement entity prefabs for template-based creation
- Implement entity events and serialization
- Create core systems (Movement, Physics, Network, Render)

## Impact
- Affected specs: entity-system
- Affected code: New implementation in src/entities/
- This system depends on core-engine (EventBus, math utilities)
- All game objects will use this ECS architecture
- No breaking changes as this is new functionality