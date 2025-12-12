import { WebSocketClient } from '../WebSocketClient';
import { EventBus } from '../../core/EventBus';

describe('WebSocketClient', () => {
  let client: WebSocketClient;
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
    client = new WebSocketClient(eventBus);
  });

  test('should initialize client', () => {
    expect(client).toBeDefined();
    expect(client.isConnected).toBe(false);
  });

  test('should handle connection state', () => {
    // Note: Actual WebSocket connection tests would require a mock server
    // This is just testing the basic functionality
    expect(client.isConnected).toBe(false);
  });

  test('should handle message sending', () => {
    // Test that sendMessage doesn't crash when not connected
    expect(() => {
      client.sendMessage('test', { data: 'test' });
    }).not.toThrow();
  });

  test('should handle event handlers', () => {
    const messageHandler = jest.fn();
    const connectHandler = jest.fn();
    const disconnectHandler = jest.fn();

    const unsubscribeMessage = client.onMessage(messageHandler);
    const unsubscribeConnect = client.onConnect(connectHandler);
    const unsubscribeDisconnect = client.onDisconnect(disconnectHandler);

    expect(unsubscribeMessage).toBeInstanceOf(Function);
    expect(unsubscribeConnect).toBeInstanceOf(Function);
    expect(unsubscribeDisconnect).toBeInstanceOf(Function);

    // Test unsubscription
    unsubscribeMessage();
    unsubscribeConnect();
    unsubscribeDisconnect();
  });
});