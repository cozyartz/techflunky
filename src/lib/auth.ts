export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'seller' | 'investor' | 'admin';
  bio?: string;
  company?: string;
  avatar_url?: string;
}

export async function getCurrentUser(request: Request, env: any): Promise<User | null> {
  try {
    const sessionToken = request.headers.get('cookie')?.split('session=')[1]?.split(';')[0];

    if (!sessionToken) {
      return null;
    }

    // Demo mode fallback when database is not configured
    if (!env.DB) {
      // Validate demo session token format (should be UUID)
      if (sessionToken && sessionToken.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        return {
          id: 'demo-user',
          email: 'test@example.com',
          name: 'Demo User',
          role: 'user'
        };
      }
      return null;
    }

    const session = await env.DB.prepare(`
      SELECT us.user_id, us.expires_at, u.email, u.name, u.role, p.bio, p.company, p.avatar_url
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE us.token = ? AND us.expires_at > ?
    `).bind(sessionToken, Date.now()).first();

    if (!session) {
      return null;
    }

    return {
      id: session.user_id,
      email: session.email,
      name: session.name,
      role: session.role,
      bio: session.bio,
      company: session.company,
      avatar_url: session.avatar_url
    };
  } catch (error) {
    console.error('Auth check error:', error);
    return null;
  }
}

export function requireAuth(user: User | null): User {
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

export function requireRole(user: User | null, allowedRoles: string[]): User {
  const authenticatedUser = requireAuth(user);
  if (!allowedRoles.includes(authenticatedUser.role)) {
    throw new Error('Insufficient permissions');
  }
  return authenticatedUser;
}

export async function createSession(userId: string, env: any): Promise<string> {
  const sessionToken = crypto.randomUUID();
  const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

  await env.DB.prepare(`
    INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).bind(
    crypto.randomUUID(),
    userId,
    sessionToken,
    expiresAt,
    Date.now()
  ).run();

  return sessionToken;
}

export async function deleteSession(sessionToken: string, env: any): Promise<void> {
  await env.DB.prepare(
    'DELETE FROM user_sessions WHERE token = ?'
  ).bind(sessionToken).run();
}