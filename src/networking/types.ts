import { Vec3 } from '../core/types';

export interface INetworkClient {
  connect(url: string): Promise<void>;
  disconnect(): void;
  sendMessage(type: string, data: any): void;
  onMessage(callback: (type: string, data: any) => void): () => void;
  onConnect(callback: () => void): () => void;
  onDisconnect(callback: () => void): () => void;
}

export interface INetworkServer {
  start(port: number): Promise<void>;
  stop(): void;
  broadcast(type: string, data: any): void;
  sendToClient(clientId: string, type: string, data: any): void;
  onClientConnect(callback: (clientId: string) => void): () => void;
  onClientDisconnect(callback: (clientId: string) => void): () => void;
  onMessage(callback: (clientId: string, type: string, data: any) => void): () => void;
}

export interface NetworkMessage {
  type: string;
  data: any;
  timestamp: number;
  sequence: number;
}

export interface EntityState {
  entityId: number;
  position: Vec3;
  velocity: Vec3;
  rotation: Vec3;
  timestamp: number;
}

export interface WorldState {
  entities: EntityState[];
  blocks: Array<{
    x: number;
    y: number;
    z: number;
    type: number;
  }>;
  timestamp: number;
}

export interface ClientInput {
  entityId: number;
  input: {
    moveX: number;
    moveY: number;
    moveZ: number;
    jump: boolean;
    timestamp: number;
  };
}

export interface NetworkEvents {
  'network:connect': void;
  'network:disconnect': void;
  'network:message': { type: string; data: any };
  'network:entity:update': EntityState;
  'network:world:update': WorldState;
}