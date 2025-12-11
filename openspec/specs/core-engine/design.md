# Core Engine Design

Decisões técnicas de arquitetura para a camada fundamental da engine.

## Context

A camada Core Engine é a fundação sobre a qual todos os outros sistemas são construídos. Decisões tomadas aqui afetam todo o projeto, por isso focamos em:
- Simplicidade e manutenibilidade
- Performance adequada ao target (60 FPS em browser)
- Extensibilidade para futuros sistemas
- Compatibilidade cross-browser

## Goals / Non-Goals

**Goals:**
- Fornecer abstração sólida para renderização (WebGL2/WebGPU)
- Loop de jogo performático e determinístico
- Sistema de eventos tipado e eficiente
- API pública estável para desenvolvedores de jogos

**Non-Goals:**
- Suporte a navegadores antigos (IE, versões antigas)
- Renderização 2D ou canvas
- Áudio avançado (fora do escopo inicial)

## Decisions

### Decision: Game Loop Implementation

O loop de jogo usa `requestAnimationFrame` com timestep fixo para física.

```typescript
class GameLoop {
  private accumulator = 0;
  private previousTime = 0;
  
  private loop(currentTime: number) {
    if (!this.isRunning) return;
    
    const frameTime = Math.min(currentTime - this.previousTime, MAX_FRAME_TIME);
    this.previousTime = currentTime;
    
    this.accumulator += frameTime;
    
    // Fixed timestep physics updates
    while (this.accumulator >= FIXED_TIMESTEP) {
      this.events.emit('loop:fixedUpdate', { 
        fixedDeltaTime: FIXED_TIMESTEP,
        time: this.currentTime 
      });
      this.accumulator -= FIXED_TIMESTEP;
      this.currentTime += FIXED_TIMESTEP;
    }
    
    // Interpolation factor for rendering
    const interpolation = this.accumulator / FIXED_TIMESTEP;
    
    // Variable timestep for rendering
    this.events.emit('loop:render', { 
      deltaTime: frameTime,
      interpolation 
    });
    
    requestAnimationFrame(this.loop.bind(this));
  }
}
```

**Alternatives considered:**
1. **setInterval**: Não sincroniza com display refresh, causa jank
2. **Fixed timestep sem acumulador**: Perde ticks em frames lentos
3. **Variable timestep para tudo**: Física não-determinística

**Rationale:** 
Timestep fixo para física garante comportamento consistente e determinístico (crucial para servidor autoritativo), enquanto rendering variável maximiza smoothness.

### Decision: Event System Design

Sistema de eventos baseado em Map de callbacks tipado.

```typescript
class EventBus {
  private handlers = new Map<string, Set<Function>>();
  
  on<T extends keyof EngineEvents>(
    event: T, 
    handler: (data: EngineEvents[T]) => void
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    
    return () => this.handlers.get(event)?.delete(handler);
  }
  
  emit<T extends keyof EngineEvents>(event: T, data: EngineEvents[T]) {
    const handlers = this.handlers.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error in event handler for ${event}:`, err);
        }
      }
    }
  }
}
```

**Alternatives considered:**
1. **EventEmitter do Node.js**: Tipagem fraca em TypeScript
2. **RxJS Observables**: Overhead e complexidade desnecessários
3. **Pub/Sub externo**: Dependência desnecessária

**Rationale:**
Implementação própria permite tipagem completa, zero dependências externas, e overhead mínimo.

### Decision: Renderer Abstraction

Interface abstrata com implementações específicas para WebGL2 e WebGPU.

```typescript
// Interface comum
interface IRendererBackend {
  init(canvas: HTMLCanvasElement): Promise<void>;
  createBuffer(data: ArrayBuffer, usage: BufferUsage): IBuffer;
  createTexture(image: ImageData, options: TextureOptions): ITexture;
  createShader(sources: ShaderSources): IShader;
  renderPass(config: RenderPassConfig, commands: RenderCommand[]): void;
}

// Factory
function createRenderer(type: 'webgl2' | 'webgpu'): IRendererBackend {
  if (type === 'webgpu' && 'gpu' in navigator) {
    return new WebGPUBackend();
  }
  return new WebGL2Backend();
}
```

**Rationale:**
- WebGL2 é maduro e suportado universalmente
- WebGPU oferece performance superior quando disponível
- Abstração permite upgrade gradual sem reescrita

### Decision: Configuration as TypeScript

Configuração usa objetos TypeScript com defaults, não JSON.

```typescript
const DEFAULT_CONFIG: EngineConfig = {
  renderDistance: 8,
  fov: 70,
  targetFps: 60,
  // ...
};

function createEngine(userConfig: Partial<EngineConfig>): IMotorVoxel {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  // ...
}
```

**Alternatives considered:**
1. **JSON files**: Sem tipagem, requer parsing
2. **YAML**: Dependência adicional
3. **dotenv**: Não adequado para config complexa

**Rationale:**
TypeScript config oferece tipagem, documentação inline, e validação em compile time.

## Risks / Trade-offs

### Risk: requestAnimationFrame throttling
- **Risk**: Browsers throttle rAF em tabs background
- **Mitigation**: Detectar tab visibility, pausar quando background
- **Mitigation**: Usar Web Worker para lógica crítica se necessário

### Risk: Event system performance
- **Risk**: Muitos eventos por frame pode impactar performance
- **Mitigation**: Profile regularmente
- **Mitigation**: Permitir eventos batch para alta frequência

### Trade-off: WebGL2 como base
- **Pro**: Compatibilidade máxima
- **Con**: Sem acesso a compute shaders
- **Decision**: Aceitável para escopo inicial, WebGPU adiciona quando necessário

## Migration Plan

### From current state (empty project):
1. Implementar estrutura de pastas
2. Criar classes core (Engine, GameLoop, EventBus)
3. Implementar WebGL2Backend
4. Testes unitários
5. Integração com próximas camadas

### Future WebGPU migration:
1. Implementar WebGPUBackend seguindo interface
2. Feature detection automática
3. Fallback transparente para WebGL2

## Open Questions

1. **Worker para game loop?**
   - Considerar se lógica precisa rodar em worker separado
   - Depende de profiling de carga real

2. **Event batching?**
   - Eventos de alta frequência (mouse move) podem precisar batching
   - Avaliar após implementação

3. **Hot reload de shaders?**
   - Útil para desenvolvimento
   - Implementar em tools layer?
