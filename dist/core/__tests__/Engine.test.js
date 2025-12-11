import { Engine } from '../Engine';
describe('Engine', () => {
    let engine;
    let mockCanvas;
    beforeEach(() => {
        mockCanvas = document.createElement('canvas');
        engine = new Engine();
    });
    test('should initialize with valid config', async () => {
        const config = {
            canvas: mockCanvas,
            renderer: 'webgl2'
        };
        await expect(engine.init(config)).resolves.not.toThrow();
    });
    test('should start and stop engine', async () => {
        const config = {
            canvas: mockCanvas,
            renderer: 'webgl2'
        };
        await engine.init(config);
        expect(() => engine.start()).not.toThrow();
        expect(() => engine.stop()).not.toThrow();
    });
    test('should destroy engine', async () => {
        const config = {
            canvas: mockCanvas,
            renderer: 'webgl2'
        };
        await engine.init(config);
        expect(() => engine.destroy()).not.toThrow();
    });
});
describe('EventBus', () => {
    test('should handle event subscription and emission', () => {
        // This will be implemented in a separate test file
    });
});
describe('GameLoop', () => {
    test('should manage game loop lifecycle', () => {
        // This will be implemented in a separate test file
    });
});
describe('ConfigManager', () => {
    test('should manage configuration', () => {
        // This will be implemented in a separate test file
    });
});
describe('ResourceManager', () => {
    test('should manage resources', () => {
        // This will be implemented in a separate test file
    });
});
//# sourceMappingURL=Engine.test.js.map