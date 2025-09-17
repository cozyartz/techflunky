// WebSocket API endpoint for secure messaging
// Handles E2E encrypted real-time communications

import type { APIContext } from 'astro';
import { getCurrentUser, SecurityLogger } from '../../../lib/security/auth';

export async function GET({ request, locals }: APIContext): Promise<Response> {
  const upgradeHeader = request.headers.get('upgrade');

  if (upgradeHeader !== 'websocket') {
    return new Response('Expected websocket upgrade', { status: 400 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const userId = url.searchParams.get('userId');

  if (!token || !userId) {
    return new Response('Missing authentication parameters', { status: 400 });
  }

  // Verify authentication
  const user = await getCurrentUser(request, locals.runtime?.env);
  if (!user || user.id !== userId) {
    await SecurityLogger.logEvent({
      type: 'auth_failure',
      details: { action: 'websocket_auth_failed', userId, userAgent: request.headers.get('User-Agent') },
      severity: 'medium'
    });
    return new Response('Unauthorized', { status: 401 });
  }

  // Create WebSocket pair for Cloudflare Workers
  const [client, server] = Object.values(new WebSocketPair());

  // Handle WebSocket connection
  handleWebSocketConnection(server, user, locals.runtime?.env);

  await SecurityLogger.logEvent({
    type: 'auth_success',
    userId: user.id,
    details: { action: 'websocket_connected' },
    severity: 'low'
  });

  return new Response(null, {
    status: 101,
    webSocket: client
  });
}

async function handleWebSocketConnection(server: WebSocket, user: any, env: any): Promise<void> {
  const { DB } = env;
  const connections = new Map<string, WebSocket>();
  const userPresence = new Map<string, { status: string; lastSeen: number }>();

  server.addEventListener('open', () => {
    connections.set(user.id, server);
    userPresence.set(user.id, { status: 'online', lastSeen: Date.now() });

    // Broadcast presence update
    broadcastPresenceUpdate(user.id, 'online', connections);
  });

  server.addEventListener('message', async (event) => {
    try {
      const message = JSON.parse(event.data as string);
      await handleWebSocketMessage(message, user, env, connections);
    } catch (error) {
      await SecurityLogger.logEvent({
        type: 'suspicious_activity',
        userId: user.id,
        details: { action: 'websocket_message_error', error: error.message },
        severity: 'medium'
      });
    }
  });

  server.addEventListener('close', () => {
    connections.delete(user.id);
    userPresence.set(user.id, { status: 'offline', lastSeen: Date.now() });

    // Broadcast presence update
    broadcastPresenceUpdate(user.id, 'offline', connections);
  });

  server.accept();
}

async function handleWebSocketMessage(
  message: any,
  user: any,
  env: any,
  connections: Map<string, WebSocket>
): Promise<void> {
  const { DB } = env;

  switch (message.type) {
    case 'message':
      await handleMessage(message, user, env, connections);
      break;
    case 'typing':
      await handleTyping(message, user, connections);
      break;
    case 'read':
      await handleReadReceipt(message, user, env, connections);
      break;
    case 'presence':
      await handlePresenceUpdate(message, user, connections);
      break;
    default:
      console.warn('Unknown message type:', message.type);
  }
}

async function handleMessage(
  message: any,
  user: any,
  env: any,
  connections: Map<string, WebSocket>
): Promise<void> {
  const { DB } = env;
  const encryptedMessage = message.payload;

  try {
    // Store encrypted message in database
    await DB.prepare(`
      INSERT INTO messages (
        id, conversation_id, sender_id, recipient_id,
        encrypted_content, signature, message_type,
        timestamp, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      encryptedMessage.id,
      `${user.id}_${encryptedMessage.recipientId}`, // Simple conversation ID
      user.id,
      encryptedMessage.recipientId,
      encryptedMessage.encryptedContent,
      encryptedMessage.signature,
      encryptedMessage.messageType,
      encryptedMessage.timestamp,
      Math.floor(Date.now() / 1000)
    ).run();

    // Forward message to recipient if online
    const recipientConnection = connections.get(encryptedMessage.recipientId);
    if (recipientConnection) {
      recipientConnection.send(JSON.stringify(message));
    }

    // Send delivery confirmation to sender
    const deliveryConfirmation = {
      type: 'delivery',
      payload: {
        messageId: encryptedMessage.id,
        senderId: user.id,
        deliveredTo: encryptedMessage.recipientId,
        deliveredAt: Date.now()
      },
      timestamp: Date.now(),
      messageId: generateMessageId()
    };

    const senderConnection = connections.get(user.id);
    if (senderConnection) {
      senderConnection.send(JSON.stringify(deliveryConfirmation));
    }

    await SecurityLogger.logEvent({
      type: 'data_access',
      userId: user.id,
      details: {
        action: 'message_stored',
        recipientId: encryptedMessage.recipientId,
        messageType: encryptedMessage.messageType
      },
      severity: 'low'
    });

  } catch (error) {
    await SecurityLogger.logEvent({
      type: 'suspicious_activity',
      userId: user.id,
      details: { action: 'message_storage_failed', error: error.message },
      severity: 'high'
    });
  }
}

async function handleTyping(
  message: any,
  user: any,
  connections: Map<string, WebSocket>
): Promise<void> {
  const { recipientId, isTyping } = message.payload;

  // Forward typing indicator to recipient
  const recipientConnection = connections.get(recipientId);
  if (recipientConnection) {
    const typingMessage = {
      type: 'typing',
      payload: {
        userId: user.id,
        isTyping,
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      messageId: generateMessageId()
    };

    recipientConnection.send(JSON.stringify(typingMessage));
  }
}

async function handleReadReceipt(
  message: any,
  user: any,
  env: any,
  connections: Map<string, WebSocket>
): Promise<void> {
  const { DB } = env;
  const { messageId, senderId } = message.payload;

  try {
    // Update message as read in database
    await DB.prepare(`
      UPDATE messages
      SET read_at = ?, read_by = ?
      WHERE id = ? AND recipient_id = ?
    `).bind(
      Math.floor(Date.now() / 1000),
      user.id,
      messageId,
      user.id
    ).run();

    // Send read receipt to sender
    const senderConnection = connections.get(senderId);
    if (senderConnection) {
      const readReceipt = {
        type: 'read',
        payload: {
          messageId,
          readBy: user.id,
          readAt: Date.now()
        },
        timestamp: Date.now(),
        messageId: generateMessageId()
      };

      senderConnection.send(JSON.stringify(readReceipt));
    }

  } catch (error) {
    await SecurityLogger.logEvent({
      type: 'suspicious_activity',
      userId: user.id,
      details: { action: 'read_receipt_failed', error: error.message },
      severity: 'medium'
    });
  }
}

async function handlePresenceUpdate(
  message: any,
  user: any,
  connections: Map<string, WebSocket>
): Promise<void> {
  const { status } = message.payload;

  // Broadcast presence update to all connections
  broadcastPresenceUpdate(user.id, status, connections);
}

function broadcastPresenceUpdate(
  userId: string,
  status: string,
  connections: Map<string, WebSocket>
): void {
  const presenceUpdate = {
    type: 'presence',
    payload: {
      userId,
      status,
      timestamp: Date.now()
    },
    timestamp: Date.now(),
    messageId: generateMessageId()
  };

  const messageStr = JSON.stringify(presenceUpdate);

  // Broadcast to all connected users except the sender
  connections.forEach((connection, connectedUserId) => {
    if (connectedUserId !== userId) {
      try {
        connection.send(messageStr);
      } catch (error) {
        // Connection might be closed, remove it
        connections.delete(connectedUserId);
      }
    }
  });
}

function generateMessageId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}