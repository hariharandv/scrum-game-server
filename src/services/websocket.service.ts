// WebSocket Service for Real-time Game Updates
// Handles live synchronization of game state across all connected clients

import WebSocket from 'ws';
import { EventEmitter } from 'events';

export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
}

export interface GameUpdateMessage extends WebSocketMessage {
  type: 'game_update';
  payload: {
    gameState: any;
    action: string;
    player?: string;
  };
}

export interface PlayerActionMessage extends WebSocketMessage {
  type: 'player_action';
  payload: {
    action: string;
    player: string;
    data: any;
  };
}

export class WebSocketService extends EventEmitter {
  private wss: WebSocket.Server | null = null;
  private clients: Set<WebSocket> = new Set();

  constructor() {
    super();
  }

  // Initialize WebSocket server
  initialize(server: any): void {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection established');
      this.clients.add(ws);

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('Invalid WebSocket message:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      // Handle client disconnection
      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.clients.delete(ws);
      });

      // Handle connection errors
      ws.on('error', (error) => {
        console.error('WebSocket connection error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connected',
        payload: { message: 'Connected to Scrum Game server' },
        timestamp: Date.now()
      });
    });

    console.log('WebSocket server initialized');
  }

  // Handle incoming messages
  private handleMessage(ws: WebSocket, message: WebSocketMessage): void {
    console.log('Received WebSocket message:', message.type);

    switch (message.type) {
      case 'subscribe_game':
        // Client wants to subscribe to game updates
        this.emit('subscribe_game', { ws, gameId: message.payload?.gameId });
        break;

      case 'player_action':
        // Player performed an action
        this.emit('player_action', message.payload);
        break;

      case 'ping':
        // Respond to ping with pong
        this.sendToClient(ws, {
          type: 'pong',
          payload: {},
          timestamp: Date.now()
        });
        break;

      default:
        console.warn('Unknown message type:', message.type);
        this.sendError(ws, `Unknown message type: ${message.type}`);
    }
  }

  // Broadcast game state update to all connected clients
  broadcastGameUpdate(gameState: any, action: string, player?: string): void {
    const message: GameUpdateMessage = {
      type: 'game_update',
      payload: {
        gameState,
        action,
        player
      },
      timestamp: Date.now()
    };

    this.broadcast(message);
  }

  // Broadcast message to all connected clients
  private broadcast(message: WebSocketMessage): void {
    const messageStr = JSON.stringify(message);

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Send message to specific client
  private sendToClient(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Send error message to client
  private sendError(ws: WebSocket, errorMessage: string): void {
    this.sendToClient(ws, {
      type: 'error',
      payload: { message: errorMessage },
      timestamp: Date.now()
    });
  }

  // Get connection count
  getConnectionCount(): number {
    return this.clients.size;
  }

  // Cleanup
  close(): void {
    if (this.wss) {
      this.wss.close();
      this.clients.clear();
      console.log('WebSocket server closed');
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();