import { EventBus } from '../core/EventBus';
import { INetworkServer, NetworkMessage, NetworkEvents } from './types';

export class WebSocketServer implements INetworkServer {
  private server: any = null;
  private clients: Map<string, any> = new Map();
  private eventBus: EventBus;
  private clientConnectHandlers: Array<(clientId: string) => void> = [];
  private clientDisconnectHandlers: Array<(clientId: string) => void> = [];
  private messageHandlers: Array<(clientId: string, type: string, data: any) => void> = [];
  private sequenceCounter: number = 0;
  private _isRunning: boolean = false;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
  }

  async start(port: number): Promise<void> {
    if (this.isRunning) {
      console.warn('Server already running');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        // Use WebSocket implementation based on environment
        const WebSocket = require('ws');
        
        this.server = new WebSocket.Server({ port });
        (this as any)._isRunning = true;

        this.server.on('listening', () => {
          console.log(`WebSocket server started on port ${port}`);
          (this as any)._isRunning = true;
          resolve();
        });

        this.server.on('connection', (socket: any, request: any) => {
          const clientId = this.generateClientId();
          this.clients.set(clientId, socket);
          
          console.log(`Client connected: ${clientId}`);
          
          socket.on('message', (data: any) => {
            try {
              const message: NetworkMessage = JSON.parse(data);
              this.handleMessage(clientId, message);
            } catch (error) {
              console.error('Error parsing message:', error);
            }
          });

          socket.on('close', () => {
            console.log(`Client disconnected: ${clientId}`);
            this.clients.delete(clientId);
            this.notifyClientDisconnect(clientId);
            this.eventBus.emit('network:disconnect', undefined);
          });

          socket.on('error', (error: any) => {
            console.error(`Client error: ${clientId}`, error);
            this.clients.delete(clientId);
            this.notifyClientDisconnect(clientId);
            this.eventBus.emit('network:disconnect', undefined);
          });

          this.notifyClientConnect(clientId);
          this.eventBus.emit('network:connect', undefined);
        });

        this.server.on('error', (error: any) => {
          console.error('Server error:', error);
          (this as any)._isRunning = false;
          reject(error);
        });
      } catch (error) {
        console.error('Server start error:', error);
        this.isRunning = false;
        reject(error);
      }
    });
  }

  stop(): void {
    if (!this._isRunning || !this.server) return;

    (this as any)._isRunning = false;
    
    // Close all client connections
    for (const [clientId, socket] of this.clients) {
      try {
        socket.close();
      } catch (error) {
        console.error(`Error closing client ${clientId}:`, error);
      }
    }
    this.clients.clear();

    // Close server
    try {
      this.server.close();
      this.server = null;
    } catch (error) {
      console.error('Error stopping server:', error);
    }

    console.log('WebSocket server stopped');
  }

  broadcast(type: string, data: any): void {
    if (!this._isRunning) return;

    const message: NetworkMessage = {
      type,
      data,
      timestamp: Date.now(),
      sequence: this.sequenceCounter++
    };

    const messageStr = JSON.stringify(message);

    for (const [clientId, socket] of this.clients) {
      try {
        if (socket.readyState === 1) { // OPEN
          socket.send(messageStr);
        }
      } catch (error) {
        console.error(`Error broadcasting to client ${clientId}:`, error);
      }
    }
  }

  sendToClient(clientId: string, type: string, data: any): void {
    if (!this._isRunning) return;

    const socket = this.clients.get(clientId);
    if (!socket) {
      console.warn(`Client ${clientId} not found`);
      return;
    }

    const message: NetworkMessage = {
      type,
      data,
      timestamp: Date.now(),
      sequence: this.sequenceCounter++
    };

    try {
      if (socket.readyState === 1) { // OPEN
        socket.send(JSON.stringify(message));
      }
    } catch (error) {
      console.error(`Error sending to client ${clientId}:`, error);
    }
  }

  onClientConnect(callback: (clientId: string) => void): () => void {
    this.clientConnectHandlers.push(callback);
    return () => {
      const index = this.clientConnectHandlers.indexOf(callback);
      if (index !== -1) {
        this.clientConnectHandlers.splice(index, 1);
      }
    };
  }

  onClientDisconnect(callback: (clientId: string) => void): () => void {
    this.clientDisconnectHandlers.push(callback);
    return () => {
      const index = this.clientDisconnectHandlers.indexOf(callback);
      if (index !== -1) {
        this.clientDisconnectHandlers.splice(index, 1);
      }
    };
  }

  onMessage(callback: (clientId: string, type: string, data: any) => void): () => void {
    this.messageHandlers.push(callback);
    return () => {
      const index = this.messageHandlers.indexOf(callback);
      if (index !== -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  private handleMessage(clientId: string, message: NetworkMessage): void {
    // Notify message handlers
    for (const handler of this.messageHandlers) {
      handler(clientId, message.type, message.data);
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

  private notifyClientConnect(clientId: string): void {
    for (const handler of this.clientConnectHandlers) {
      handler(clientId);
    }
  }

  private notifyClientDisconnect(clientId: string): void {
    for (const handler of this.clientDisconnectHandlers) {
      handler(clientId);
    }
  }

  private generateClientId(): string {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  }

  get isRunning(): boolean {
    return this._isRunning;
  }
}