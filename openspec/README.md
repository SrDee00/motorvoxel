# MotorVoxel Engine - Technical Specification

## Overview

This document provides a comprehensive technical specification for **MotorVoxel**, a web-based voxel game engine designed for MMO gameplay. The engine uses modern web technologies (TypeScript, WebGL2/WebGPU) with a focus on:

- **Efficient rendering** via chunk-based meshing with greedy meshing algorithms
- **Authoritative server** architecture for anti-cheat and security
- **Simple deterministic physics** for character movement and collision
- **Scalable networking** with client-side prediction and interest management

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                         TOOLS/DEBUG                          │
├─────────────────────────────────────────────────────────────┤
│         NETWORKING        │         PERSISTENCE             │
├─────────────────────────────────────────────────────────────┤
│    PHYSICS    │   RENDERING   │   WORLD GENERATION          │
├─────────────────────────────────────────────────────────────┤
│                     ENTITY SYSTEM (ECS)                      │
├─────────────────────────────────────────────────────────────┤
│                       VOXEL WORLD                            │
├─────────────────────────────────────────────────────────────┤
│                       CORE ENGINE                            │
└─────────────────────────────────────────────────────────────┘
```

## Capabilities

| Capability | Requirements | Description |
|------------|--------------|-------------|
| [core-engine](specs/core-engine/spec.md) | 6 | Game loop, events, resources, config, math utilities |
| [voxel-world](specs/voxel-world/spec.md) | 6 | Chunk management, block registry, streaming, LOD |
| [rendering](specs/rendering/spec.md) | 8 | Meshing, shaders, camera, texture atlas, workers |
| [physics](specs/physics/spec.md) | 7 | AABB collision, player controller, projectiles |
| [networking](specs/networking/spec.md) | 9 | WebSocket, prediction, interpolation, interest management |
| [entity-system](specs/entity-system/spec.md) | 6 | ECS architecture, prefabs, serialization |
| [world-generation](specs/world-generation/spec.md) | 6 | Noise, biomes, caves, structures, seeds |
| [persistence](specs/persistence/spec.md) | 7 | Storage backends, region files, auto-save, backup |
| [tools](specs/tools/spec.md) | 7 | Debug overlay, profiler, logger, commands, admin |

**Total: 62 Requirements**

## Key Technical Decisions

### Rendering
- **WebGL2** as primary backend for compatibility (95%+ browsers)
- **WebGPU** as optional upgrade for modern hardware
- **Greedy meshing** to reduce vertex count by 10-20x
- **Web Workers** for async mesh generation
- Target: **60 FPS** on mid-range hardware

### Networking
- **WebSocket** for transport (WebTransport as future upgrade)
- **20 Hz** server tick rate, **20 Hz** snapshot rate
- **Client-side prediction** with server reconciliation
- **100ms interpolation buffer** for remote entities
- **Grid-based interest management** for scalability

### Physics
- **Fixed timestep** (60 Hz) for determinism
- **AABB** collision with swept collision detection
- **Player controller** with coyote time and jump buffering
- Deterministic for server-client synchronization

### World
- **16x256x16** chunk dimensions
- **32x32 chunks** per region file
- **Flat array** storage with index calculation
- **LOD support** for distant chunks

## Performance Targets

| Metric | Target |
|--------|--------|
| FPS | 60 on Intel i5 + GTX 1060 |
| Frame budget | 16ms |
| Draw calls | < 500/frame |
| View distance | 8-16 chunks |
| Visible entities | 200 max |
| Players per shard | 50-100 initial, 200+ goal |

## Technology Stack

### Client
- TypeScript/JavaScript ES2020+
- WebGL 2.0 / WebGPU
- WebSocket / WebTransport
- glMatrix, simplex-noise

### Server  
- Node.js + TypeScript
- ws (WebSocket server)
- SQLite/PostgreSQL for persistence
- MessagePack for serialization

### Development
- Vite (build)
- Vitest (testing)
- Playwright (e2e)
- Prettier + ESLint

## Next Steps

1. **Phase 1: Core Foundation**
   - Implement core engine, game loop, event system
   - Basic WebGL2 renderer
   - Chunk data structures

2. **Phase 2: Rendering Pipeline**
   - Greedy meshing implementation
   - Texture atlas
   - Worker pool for async meshing

3. **Phase 3: Physics & Input**
   - AABB collision
   - Player controller
   - Camera system

4. **Phase 4: Networking**
   - WebSocket client/server
   - Authoritative simulation
   - Prediction & reconciliation

5. **Phase 5: World Generation**
   - Noise-based terrain
   - Biome system
   - Structure placement

6. **Phase 6: Polish & Tools**
   - Debug overlay
   - Profiling tools
   - Admin panel
