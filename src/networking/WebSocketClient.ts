import { EventBus } from '../core/EventBus';
import { INetworkClient, NetworkMessage, NetworkEvents } from './types';

export class WebSocketClient implements INetworkClient {
  private socket: WebSocket | null = null;
  private url: string = '';
  private eventBus: EventBus;
  private messageHandlers: Array<(type: string, data: any) => void> = [];
  private connectHandlers: Array<() => void> = [];
  private disconnectHandlers: Array<() => void> = [];
  private sequenceCounter: number = 0;
  private pendingMessages: Array<{type: string; data: any}> = [];
  private _isConnected: boolean = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async connect(url: string): Promise<void> {
    if (this.isConnected) {
      console.warn('Already connected');
      return;
    }

    this.url = url;
    this.isConnected = true;

    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(url);

        this.socket.onopen = () => {
          console.log('WebSocket connected');
          (this as any)._isConnected = true;
          
          // Send pending messages
          while (this.pendingMessages.length > 0) {
            const msg = this.pendingMessages.shift();
            if (msg) this.sendMessage(msg.type, msg.data);
          }
          
          // Notify connection
          this.notifyConnect();
          this.eventBus.emit('network:connect', undefined);
          resolve();
        };

        this.socket.onclose = () => {
          console.log('WebSocket disconnected');
          (this as any)._isConnected = false;
          this.notifyDisconnect();
          this.eventBus.emit('network:disconnect', undefined);
        };

        this.socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          (this as any)._isConnected = false;
          this.notifyDisconnect();
          this.eventBus.emit('network:disconnect', undefined);
          reject(error);
        };

        this.socket.onmessage = (event) => {
          try {
            const message: NetworkMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };
      } catch (error) {
        console.error('Connection error:', error);
        this.isConnected = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (!this._isConnected || !this.socket) return;

    (this as any)._isConnected = false;
    this.socket.close();
    this.socket = null;
    this.notifyDisconnect();
    this.eventBus.emit('network:disconnect', undefined);
  }

  sendMessage(type: string, data: any): void {
    const message: NetworkMessage = {
      type,
      data,
      timestamp: Date.now(),
      sequence: this.sequenceCounter++
    };

    if (!this._isConnected || !this.socket) {
      this.pendingMessages.push({ type, data });
      return;
    }

    try {
      const messageStr = JSON.stringify(message);
      this.socket.send(messageStr);
    } catch (error) {
      console.error('Error sending message:', error);
      this.pendingMessages.push({ type, data });
    }
  }

  onMessage(callback: (type: string, data: any) => void): () => void {
    this.messageHandlers.push(callback);
    return () => {
      const index = this.messageHandlers.indexOf(callback);
      if (index !== -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  onConnect(callback: () => void): () => void {
    this.connectHandlers.push(callback);
    return () => {
      const index = this.connectHandlers.indexOf(callback);
      if (index !== -1) {
        this.connectHandlers.splice(index, 1);
      }
    };
  }

  onDisconnect(callback: () => void): () => void {
    this.disconnectHandlers.push(callback);
    return () => {
      const index = this.disconnectHandlers.indexOf(callback);
      if (index !== -1) {
        this.disconnectHandlers.splice(index, 1);
      }
    };
  }

  private handleMessage(message: NetworkMessage): void {
    // Notify message handlers
    for (const handler of this.messageHandlers) {
      handler(message.type, message.data);
    }

    // Emit event
    this.eventBus.emit('network:message', {
      type: message.type,
      data: message.data
    });

    // Handle specific message types
    switch (message.type) {
      case 'entity_update':
        this.eventBus.emit('network:entity:update', message.data);
        break;
      case 'world_update':
        this.eventBus.emit('network:world:update', message.data);
        break;
    }
  }

  private notifyConnect(): void {
    for (const handler of this.connectHandlers) {
      handler();
    }
  }

  private notifyDisconnect(): void {
    for (const handler of this.disconnectHandlers) {
      handler();
    }
  }

  get isConnected(): boolean {
    return this._isConnected;
  }
}