// Secure WebSocket Service for Real-time Messaging
// Enterprise-grade real-time communication with E2E encryption

import { signalProtocol, type EncryptedMessage } from './encryption';
import { SecurityLogger } from '../security/auth';

export interface WebSocketMessage {
  type: 'message' | 'typing' | 'read' | 'delivery' | 'presence' | 'key_exchange';
  payload: any;
  timestamp: number;
  messageId: string;
}

export interface SecureWebSocketConfig {
  endpoint: string;
  authToken: string;
  userId: string;
  reconnectAttempts: number;
  heartbeatInterval: number;
  encryption: boolean;
}

export interface MessageDeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: number;
  recipientId: string;
}

export interface TypingIndicator {
  userId: string;
  isTyping: boolean;
  timestamp: number;
}

export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
}

// Secure WebSocket Client with E2E Encryption
export class SecureWebSocketClient {
  private ws: WebSocket | null = null;
  private config: SecureWebSocketConfig;
  private reconnectCount = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private eventHandlers: Map<string, Function[]> = new Map();
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private lastActivity = Date.now();

  constructor(config: SecureWebSocketConfig) {
    this.config = config;
    this.initializeEventHandlers();
  }

  // Connect to WebSocket server
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.connectionState = 'connecting';

    try {
      // Initialize encryption if enabled
      if (this.config.encryption) {
        await signalProtocol.initializeDevice(this.config.userId);
      }

      // Create secure WebSocket connection
      const wsUrl = `${this.config.endpoint}?token=${this.config.authToken}&userId=${this.config.userId}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      await SecurityLogger.logEvent({
        type: 'data_access',
        userId: this.config.userId,
        details: { action: 'websocket_connect_attempt' },
        severity: 'low'
      });

    } catch (error) {
      this.connectionState = 'error';
      await SecurityLogger.logEvent({
        type: 'suspicious_activity',
        userId: this.config.userId,
        details: { action: 'websocket_connect_failed', error: error.message },
        severity: 'medium'
      });
      throw error;
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.reconnectCount = 0;
    this.messageQueue = [];
  }

  // Send encrypted message
  async sendMessage(recipientId: string, content: string, type: 'text' | 'file' = 'text'): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    let encryptedMessage: EncryptedMessage;

    if (this.config.encryption) {
      // Encrypt message using Signal Protocol
      encryptedMessage = await signalProtocol.encryptMessage(recipientId, content, type);
    } else {
      // Fallback for non-encrypted mode (not recommended for production)
      encryptedMessage = {
        id: this.generateMessageId(),
        senderId: this.config.userId,
        recipientId,
        encryptedContent: content,
        signature: '',
        timestamp: Date.now(),
        messageType: type
      };
    }

    const wsMessage: WebSocketMessage = {
      type: 'message',
      payload: encryptedMessage,
      timestamp: Date.now(),
      messageId: encryptedMessage.id
    };

    this.sendWebSocketMessage(wsMessage);

    await SecurityLogger.logEvent({
      type: 'data_access',
      userId: this.config.userId,
      details: {
        action: 'message_sent',
        recipientId,
        encrypted: this.config.encryption,
        messageType: type
      },
      severity: 'low'
    });

    return encryptedMessage.id;
  }

  // Send typing indicator
  sendTypingIndicator(recipientId: string, isTyping: boolean): void {
    if (!this.isConnected()) return;

    const wsMessage: WebSocketMessage = {
      type: 'typing',
      payload: {
        recipientId,
        isTyping,
        userId: this.config.userId
      },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };

    this.sendWebSocketMessage(wsMessage);
  }

  // Mark message as read
  markAsRead(messageId: string, senderId: string): void {
    if (!this.isConnected()) return;

    const wsMessage: WebSocketMessage = {
      type: 'read',
      payload: {
        messageId,
        senderId,
        readBy: this.config.userId,
        readAt: Date.now()
      },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };

    this.sendWebSocketMessage(wsMessage);
  }

  // Update user presence
  updatePresence(status: 'online' | 'away' | 'offline'): void {
    if (!this.isConnected()) return;

    const wsMessage: WebSocketMessage = {
      type: 'presence',
      payload: {
        userId: this.config.userId,
        status,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };

    this.sendWebSocketMessage(wsMessage);
  }

  // Event handler registration
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Private methods
  private initializeEventHandlers(): void {
    // Initialize default event handlers
    this.eventHandlers.set('message', []);
    this.eventHandlers.set('typing', []);
    this.eventHandlers.set('read', []);
    this.eventHandlers.set('delivery', []);
    this.eventHandlers.set('presence', []);
    this.eventHandlers.set('connected', []);
    this.eventHandlers.set('disconnected', []);
    this.eventHandlers.set('error', []);
  }

  private handleOpen(): void {
    this.connectionState = 'connected';
    this.reconnectCount = 0;
    this.startHeartbeat();
    this.flushMessageQueue();
    this.emit('connected');

    SecurityLogger.logEvent({
      type: 'auth_success',
      userId: this.config.userId,
      details: { action: 'websocket_connected' },
      severity: 'low'
    });
  }

  private async handleMessage(event: MessageEvent): Promise<void> {
    this.lastActivity = Date.now();

    try {
      const wsMessage: WebSocketMessage = JSON.parse(event.data);

      switch (wsMessage.type) {
        case 'message':
          await this.handleIncomingMessage(wsMessage);
          break;
        case 'typing':
          this.emit('typing', wsMessage.payload);
          break;
        case 'read':
          this.emit('read', wsMessage.payload);
          break;
        case 'delivery':
          this.emit('delivery', wsMessage.payload);
          break;
        case 'presence':
          this.emit('presence', wsMessage.payload);
          break;
        default:
          console.warn('Unknown message type:', wsMessage.type);
      }
    } catch (error) {
      await SecurityLogger.logEvent({
        type: 'suspicious_activity',
        userId: this.config.userId,
        details: { action: 'websocket_message_parse_error', error: error.message },
        severity: 'medium'
      });
    }
  }

  private async handleIncomingMessage(wsMessage: WebSocketMessage): Promise<void> {
    const encryptedMessage: EncryptedMessage = wsMessage.payload;

    try {
      let decryptedContent: string;

      if (this.config.encryption) {
        // Decrypt message using Signal Protocol
        decryptedContent = await signalProtocol.decryptMessage(encryptedMessage);
      } else {
        // Fallback for non-encrypted mode
        decryptedContent = encryptedMessage.encryptedContent;
      }

      const message = {
        id: encryptedMessage.id,
        senderId: encryptedMessage.senderId,
        content: decryptedContent,
        timestamp: encryptedMessage.timestamp,
        messageType: encryptedMessage.messageType
      };

      this.emit('message', message);

      // Send delivery confirmation
      this.sendDeliveryConfirmation(encryptedMessage.id, encryptedMessage.senderId);

      await SecurityLogger.logEvent({
        type: 'data_access',
        userId: this.config.userId,
        details: {
          action: 'message_received',
          senderId: encryptedMessage.senderId,
          encrypted: this.config.encryption,
          messageType: encryptedMessage.messageType
        },
        severity: 'low'
      });

    } catch (error) {
      await SecurityLogger.logEvent({
        type: 'suspicious_activity',
        userId: this.config.userId,
        details: {
          action: 'message_decryption_failed',
          senderId: encryptedMessage.senderId,
          error: error.message
        },
        severity: 'high'
      });
    }
  }

  private handleClose(event: CloseEvent): void {
    this.connectionState = 'disconnected';
    this.stopHeartbeat();
    this.emit('disconnected', { code: event.code, reason: event.reason });

    // Attempt reconnection if not a normal closure
    if (event.code !== 1000 && this.reconnectCount < this.config.reconnectAttempts) {
      this.attemptReconnect();
    }

    SecurityLogger.logEvent({
      type: 'data_access',
      userId: this.config.userId,
      details: { action: 'websocket_disconnected', code: event.code, reason: event.reason },
      severity: 'low'
    });
  }

  private handleError(error: Event): void {
    this.connectionState = 'error';
    this.emit('error', error);

    SecurityLogger.logEvent({
      type: 'suspicious_activity',
      userId: this.config.userId,
      details: { action: 'websocket_error', error: error.toString() },
      severity: 'medium'
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        const heartbeat: WebSocketMessage = {
          type: 'message',
          payload: { type: 'heartbeat' },
          timestamp: Date.now(),
          messageId: this.generateMessageId()
        };
        this.sendWebSocketMessage(heartbeat);
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnect(): void {
    this.reconnectCount++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectCount), 30000);

    setTimeout(() => {
      if (this.connectionState !== 'connected') {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private sendWebSocketMessage(message: WebSocketMessage): void {
    if (this.isConnected()) {
      this.ws!.send(JSON.stringify(message));
    } else {
      // Queue message for later delivery
      this.messageQueue.push(message);
    }
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.ws!.send(JSON.stringify(message));
    }
  }

  private sendDeliveryConfirmation(messageId: string, senderId: string): void {
    const confirmation: WebSocketMessage = {
      type: 'delivery',
      payload: {
        messageId,
        senderId,
        deliveredTo: this.config.userId,
        deliveredAt: Date.now()
      },
      timestamp: Date.now(),
      messageId: this.generateMessageId()
    };

    this.sendWebSocketMessage(confirmation);
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  private isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private generateMessageId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public getters
  get state(): string {
    return this.connectionState;
  }

  get isReady(): boolean {
    return this.connectionState === 'connected';
  }

  get lastActivityTime(): number {
    return this.lastActivity;
  }
}

// WebSocket server endpoint for Cloudflare Workers
export const createWebSocketHandler = () => {
  return async (request: Request, env: any): Promise<Response> => {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');
    const userId = url.searchParams.get('userId');

    if (!token || !userId) {
      return new Response('Missing authentication parameters', { status: 400 });
    }

    // Verify token (use your auth service)
    // const user = await verifyToken(token);
    // if (!user || user.id !== userId) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    // Create WebSocket pair
    const [client, server] = Object.values(new WebSocketPair());

    // Handle WebSocket connection
    server.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data as string);

        // Route message based on type
        switch (message.type) {
          case 'message':
            await handleMessage(message, userId, env);
            break;
          case 'typing':
            await handleTyping(message, userId, env);
            break;
          case 'presence':
            await handlePresence(message, userId, env);
            break;
          default:
            console.warn('Unknown message type:', message.type);
        }

        await SecurityLogger.logEvent({
          type: 'data_access',
          userId,
          details: { action: 'websocket_message_handled', messageType: message.type },
          severity: 'low'
        });

      } catch (error) {
        await SecurityLogger.logEvent({
          type: 'suspicious_activity',
          userId,
          details: { action: 'websocket_message_error', error: error.message },
          severity: 'medium'
        });
      }
    });

    server.addEventListener('close', async () => {
      await SecurityLogger.logEvent({
        type: 'data_access',
        userId,
        details: { action: 'websocket_closed' },
        severity: 'low'
      });
    });

    server.accept();

    return new Response(null, {
      status: 101,
      webSocket: client
    });
  };
};

// Message handlers for server-side WebSocket
async function handleMessage(message: any, userId: string, env: any): Promise<void> {
  // Store message in database
  // Route to recipient(s)
  // Handle delivery confirmations
}

async function handleTyping(message: any, userId: string, env: any): Promise<void> {
  // Route typing indicators to recipients
}

async function handlePresence(message: any, userId: string, env: any): Promise<void> {
  // Update user presence status
  // Notify contacts
}