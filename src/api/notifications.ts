// Notification System API
import type { APIContext } from 'astro';

export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  
  try {
    // TODO: Get authenticated user
    const userId = 'temp-user-id';
    
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;
    const offset = (page - 1) * limit;
    const unreadOnly = url.searchParams.get('unread') === 'true';

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = ?
    `;
    const params = [userId];

    if (unreadOnly) {
      query += ' AND read_at IS NULL';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const notifications = await DB.prepare(query).bind(...params).all();

    // Get unread count
    const unreadCount = await DB.prepare(`
      SELECT COUNT(*) as count 
      FROM notifications 
      WHERE user_id = ? AND read_at IS NULL
    `).bind(userId).first();

    return new Response(JSON.stringify({
      notifications: notifications.results,
      unreadCount: unreadCount?.count || 0,
      pagination: {
        page,
        hasMore: notifications.results.length === limit
      }
    }));

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch notifications' 
    }), { status: 500 });
  }
}

// Mark notification as read
export async function PATCH({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  
  try {
    const { notificationId, markAllRead } = await request.json();
    // TODO: Get authenticated user
    const userId = 'temp-user-id';

    if (markAllRead) {
      await DB.prepare(`
        UPDATE notifications 
        SET read_at = unixepoch() 
        WHERE user_id = ? AND read_at IS NULL
      `).bind(userId).run();
    } else {
      await DB.prepare(`
        UPDATE notifications 
        SET read_at = unixepoch() 
        WHERE id = ? AND user_id = ?
      `).bind(notificationId, userId).run();
    }

    return new Response(JSON.stringify({ success: true }));

  } catch (error) {
    console.error('Error updating notification:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to update notification' 
    }), { status: 500 });
  }
}

// Create notification (internal function)
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  actionUrl?: string,
  metadata?: any,
  env?: any
) {
  const { DB } = env;

  try {
    await DB.prepare(`
      INSERT INTO notifications (
        user_id, type, title, message, action_url, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      type,
      title,
      message,
      actionUrl || null,
      metadata ? JSON.stringify(metadata) : null
    ).run();

    // TODO: Send email notification for important types
    if (['offer_received', 'payment_received', 'service_completed'].includes(type)) {
      // Queue email notification
    }

  } catch (error) {
    console.error('Error creating notification:', error);
  }
}
