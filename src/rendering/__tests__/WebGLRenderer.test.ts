import { WebGLRenderer } from '../WebGLRenderer';

describe('WebGLRenderer', () => {
  let renderer: WebGLRenderer;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    // Create a mock canvas
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    renderer = new WebGLRenderer();
  });

  test('should initialize and destroy', async () => {
    expect(renderer.isInitialized).toBe(false);

    await renderer.init(canvas);
    expect(renderer.isInitialized).toBe(true);
    expect(renderer.canvas).toBe(canvas);
    expect(renderer.webglContext).toBeTruthy();

    renderer.destroy();
    expect(renderer.isInitialized).toBe(false);
    expect(renderer.canvas).toBeNull();
    expect(renderer.webglContext).toBeNull();
  });

  test('should handle resize', async () => {
    await renderer.init(canvas);

    const initialWidth = canvas.width;
    const initialHeight = canvas.height;

    renderer.resize(1024, 768);
    expect(canvas.width).toBe(1024);
    expect(canvas.height).toBe(768);

    // Resize back
    renderer.resize(initialWidth, initialHeight);
    expect(canvas.width).toBe(initialWidth);
    expect(canvas.height).toBe(initialHeight);
  });

  test('should update configuration', async () => {
    await renderer.init(canvas);

    const newConfig = {
      clearColor: [1.0, 0.0, 0.0, 1.0] as [number, number, number, number], // Red
      wireframeMode: true
    };

    renderer.setConfig(newConfig);
    const config = renderer.config;
    expect(config.clearColor).toEqual(newConfig.clearColor);
    expect(config.wireframeMode).toBe(true);
  });
});