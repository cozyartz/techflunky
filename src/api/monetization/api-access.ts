// API Monetization System
import type { APIContext } from 'astro';

const API_PRICING = {
  free: { requests: 10000, aiAnalyses: 100, price: 0 },
  starter: { requests: 100000, aiAnalyses: 1000, price: 1900 }, // $19/month
  pro: { requests: 500000, aiAnalyses: 10000, price: 7900 }, // $79/month
  enterprise: { requests: 2000000, aiAnalyses: -1, price: 19900 } // $199/month, unlimited AI
};

const ENDPOINT_COSTS = {
  '/api/listings': 1,
  '/api/matching/ai-matching': 5,
  '/api/intelligence/market-data': 10,
  '/api/analytics/advanced': 15,
  '/api/services/validation': 20
};

// Generate API key
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { userId, name, permissions = [], rateLimit = 1000 } = await request.json();

    if (!userId || !name) {
      return new Response(JSON.stringify({
        error: 'User ID and API key name required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate secure API key
    const apiKey = generateAPIKey();
    const keyHash = await hashAPIKey(apiKey);

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = now + (365 * 24 * 60 * 60); // 1 year

    // Create API key record
    const result = await DB.prepare(`
      INSERT INTO api_keys
      (user_id, key_hash, name, permissions, rate_limit, is_active, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      userId,
      keyHash,
      name,
      JSON.stringify(permissions),
      rateLimit,
      now,
      expiresAt
    ).run();

    return new Response(JSON.stringify({
      success: true,
      apiKeyId: result.meta.last_row_id,
      apiKey: apiKey, // Only returned once
      name,
      rateLimit,
      permissions,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      usage: {
        used: 0,
        limit: rateLimit,
        remaining: rateLimit
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error generating API key:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate API key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Get API keys and usage
export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  const userId = url.searchParams.get('userId');
  const apiKeyId = url.searchParams.get('keyId');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User ID required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    if (apiKeyId) {
      // Get specific API key details with usage
      const apiKey = await DB.prepare(`
        SELECT * FROM api_keys WHERE id = ? AND user_id = ?
      `).bind(apiKeyId, userId).first();

      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const usage = await getAPIKeyUsage(DB, apiKeyId);

      return new Response(JSON.stringify({
        apiKey: {
          ...apiKey,
          permissions: JSON.parse(apiKey.permissions || '[]'),
          keyHash: undefined, // Don't expose hash
          usage
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } else {
      // Get all user's API keys
      const apiKeys = await DB.prepare(`
        SELECT id, name, rate_limit, is_active, created_at, expires_at, last_used_at, permissions
        FROM api_keys WHERE user_id = ?
        ORDER BY created_at DESC
      `).bind(userId).all();

      const keysWithUsage = await Promise.all(
        apiKeys.map(async (key: any) => {
          const usage = await getAPIKeyUsage(DB, key.id);
          return {
            ...key,
            permissions: JSON.parse(key.permissions || '[]'),
            usage
          };
        })
      );

      return new Response(JSON.stringify({
        apiKeys: keysWithUsage,
        pricing: API_PRICING,
        endpointCosts: ENDPOINT_COSTS
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Error getting API keys:', error);
    return new Response(JSON.stringify({ error: 'Failed to retrieve API keys' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update API key
export async function PUT({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { apiKeyId, userId, name, permissions, rateLimit, isActive } = await request.json();

    if (!apiKeyId || !userId) {
      return new Response(JSON.stringify({
        error: 'API key ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify ownership
    const apiKey = await DB.prepare(`
      SELECT * FROM api_keys WHERE id = ? AND user_id = ?
    `).bind(apiKeyId, userId).first();

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'API key not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updates: any = {};
    if (name) updates.name = name;
    if (permissions) updates.permissions = JSON.stringify(permissions);
    if (rateLimit) updates.rate_limit = rateLimit;
    if (isActive !== undefined) updates.is_active = isActive;

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No updates provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const updateFields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const updateValues = Object.values(updates);

    await DB.prepare(`
      UPDATE api_keys SET ${updateFields} WHERE id = ? AND user_id = ?
    `).bind(...updateValues, apiKeyId, userId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'API key updated successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating API key:', error);
    return new Response(JSON.stringify({ error: 'Failed to update API key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Delete API key
export async function DELETE({ request, locals }: APIContext) {
  const { DB } = locals.runtime.env;

  try {
    const { apiKeyId, userId } = await request.json();

    if (!apiKeyId || !userId) {
      return new Response(JSON.stringify({
        error: 'API key ID and User ID required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify ownership and delete
    const result = await DB.prepare(`
      DELETE FROM api_keys WHERE id = ? AND user_id = ?
    `).bind(apiKeyId, userId).run();

    if (result.changes === 0) {
      return new Response(JSON.stringify({
        error: 'API key not found or access denied'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'API key deleted successfully'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting API key:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete API key' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function getAPIKeyUsage(DB: any, apiKeyId: string) {
  const today = new Date().toISOString().split('T')[0];
  const thisMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  const [dailyUsage, monthlyUsage, totalUsage] = await Promise.all([
    DB.prepare(`
      SELECT SUM(request_count) as count FROM api_usage
      WHERE api_key_id = ? AND usage_date = ?
    `).bind(apiKeyId, today).first(),

    DB.prepare(`
      SELECT SUM(request_count) as count FROM api_usage
      WHERE api_key_id = ? AND usage_date LIKE ? || '%'
    `).bind(apiKeyId, thisMonth).first(),

    DB.prepare(`
      SELECT SUM(request_count) as count FROM api_usage
      WHERE api_key_id = ?
    `).bind(apiKeyId).first()
  ]);

  return {
    today: dailyUsage?.count || 0,
    thisMonth: monthlyUsage?.count || 0,
    total: totalUsage?.count || 0
  };
}

function generateAPIKey(): string {
  const prefix = 'tk_';
  const randomBytes = crypto.getRandomValues(new Uint8Array(32));
  const key = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return prefix + key;
}

async function hashAPIKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}