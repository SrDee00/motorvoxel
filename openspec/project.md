# Project Context

## Purpose
MotorVoxel é uma **Game Engine Voxel para Web** focada em jogos **MMO em mundo aberto**. O objetivo é fornecer uma plataforma modular, performática e extensível para criação de jogos voxelizados que rodem diretamente no navegador, utilizando tecnologias web modernas como WebGL 2.0 ou WebGPU.

A engine implementa:
- Renderização eficiente usando **chunks + meshing** para reduzir polígonos
- **Servidor autoritativo** para segurança e anti-cheat em ambiente MMO
- **Física simples** para movimento de personagens e interação com blocos
- Arquitetura **ECS (Entity-Component-System)** para flexibilidade e performance

## Tech Stack
- **Runtime**: Web Browser (Chrome, Firefox, Edge, Safari modernos)
- **Linguagem**: TypeScript (transpilado para JavaScript ES2020+)
- **Renderização**: WebGL 2.0 (compatibilidade) / WebGPU (performance futura)
- **Rede**: WebSocket (com planos para WebTransport)
- **Servidor**: Node.js + TypeScript (código compartilhado client/server)
- **Persistência**: Interface abstrata (suporte a PostgreSQL, MongoDB, ou arquivos binários)
- **Build**: Vite ou Rollup para bundling
- **Distribuição**: npm package para uso como biblioteca

## Project Conventions

### Code Style
- **Formatação**: Prettier com 2 espaços de indentação
- **Linting**: ESLint com regras strict do TypeScript
- **Nomenclatura**:
  - Classes: PascalCase (ex: `ChunkManager`, `VoxelWorld`)
  - Funções/métodos: camelCase (ex: `getBlock`, `updateMesh`)
  - Constantes: UPPER_SNAKE_CASE (ex: `CHUNK_SIZE`, `MAX_ENTITIES`)
  - Interfaces: Prefixo I (ex: `IBlockType`, `INetworkMessage`)
  - Types: Sufixo descriptivo (ex: `BlockId`, `ChunkCoord`)
- **Documentação**: TSDoc para APIs públicas

### Architecture Patterns
- **ECS (Entity-Component-System)**: Para gerenciamento de entidades e lógica de jogo
- **Camadas**: Core → Voxel → Rendering → Physics → Network → Tools
- **Dependency Injection**: Para facilitar testes e modularidade
- **Event-Driven**: Comunicação entre camadas via eventos tipados
- **Worker Threads**: Web Workers para meshing assíncrono

### Testing Strategy
- **Unitários**: Jest para lógica de chunks, meshing, física
- **Integração**: Playwright para testes client-servidor
- **Performance**: Benchmarks automatizados para meshing e rendering
- **Carga**: Artillery ou k6 para simulação de múltiplos jogadores

### Git Workflow
- **Branch**: `main` (produção), `develop` (desenvolvimento), `feature/*`, `fix/*`
- **Commits**: Conventional Commits (feat:, fix:, docs:, refactor:, test:, perf:)
- **PRs**: Requerem aprovação e CI verde

## Domain Context

### Conceitos Fundamentais
- **Voxel**: Unidade 3D volumétrica, representada como bloco discreto
- **Chunk**: Região 3D do mundo contendo matriz de voxels (padrão: 16x16x256)
- **Meshing**: Processo de converter voxels em geometria renderizável
- **Greedy Meshing**: Algoritmo que combina faces adjacentes iguais
- **Servidor Autoritativo**: Servidor é fonte de verdade para todo estado crítico
- **Client-Side Prediction**: Cliente prevê movimento local, servidor corrige
- **Interest Management**: Servidor envia apenas dados relevantes ao jogador
- **LOD (Level of Detail)**: Níveis de detalhe baseados em distância

### Tipos de Blocos
- **Ar (Air)**: Bloco vazio, não renderizado
- **Sólido (Solid)**: Bloco opaco com colisão total
- **Semi-Sólido**: Bloco parcial (escadas, rampas, vegetação)
- **Líquido**: Bloco fluido (água, lava) com comportamento especial

## Important Constraints

### Performance
- **Target**: 60 FPS em hardware médio (Intel i5, GTX 1060, 8GB RAM)
- **Budget por frame**: 16ms máximo
- **Draw calls**: Máximo 500 por frame
- **Mundo ativo cliente**: Raio de ~16 chunks (~256 blocos)
- **Entidades visíveis**: Máximo 200 simultâneas

### Compatibilidade
- **Navegadores**: Chrome 90+, Firefox 90+, Edge 90+, Safari 15+
- **WebGL**: 2.0 obrigatório, WebGPU opcional como fallback progressivo
- **Mobile**: Suporte futuro, não é prioridade inicial

### Segurança
- **Cliente nunca é confiável**: Toda validação crítica no servidor
- **Rate limiting**: Limites de ações por tempo
- **Validação de inputs**: Verificar limites de velocidade, cooldowns

### Escalabilidade
- **Jogadores por shard**: Inicial 50-100, meta 200+
- **Mundo persistente**: Chunks alterados salvos automaticamente
- **Horizontal scaling**: Arquitetura preparada para múltiplos processos

## External Dependencies

### Runtime
- **glMatrix**: Operações matemáticas de vetores/matrizes
- **simplex-noise**: Geração procedural de terreno
- **msgpack-lite**: Serialização binária eficiente para rede

### Development
- **TypeScript**: Tipagem estática
- **Vite**: Build e dev server
- **Vitest**: Framework de testes
- **Playwright**: Testes end-to-end

### Server
- **Node.js**: Runtime do servidor
- **ws**: WebSocket server
- **better-sqlite3 ou pg**: Persistência
