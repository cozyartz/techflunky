import type { APIContext } from 'astro';
import bcrypt from 'bcryptjs';

export async function POST({ request, locals }: APIContext) {
  try {
    const { email, password, name, role = 'user' } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Password must be at least 8 characters long'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already exists
    const DB = locals.runtime?.env?.DB || process.env.D1_DATABASE;
    if (!DB) {
      // Demo mode - accept registration without database
      const userId = crypto.randomUUID();
      return new Response(JSON.stringify({
        success: true,
        data: {
          user: {
            id: userId,
            email: email.toLowerCase(),
            name,
            role
          }
        },
        note: 'Demo registration - Database not configured'
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const existingUser = await DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (existingUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'User with this email already exists'
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate user ID
    const userId = crypto.randomUUID();

    // Create user
    await DB.prepare(`
      INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      email.toLowerCase(),
      name,
      passwordHash,
      role,
      Date.now(),
      Date.now()
    ).run();

    // Create user profile
    await DB.prepare(`
      INSERT INTO profiles (user_id, created_at, updated_at)
      VALUES (?, ?, ?)
    `).bind(
      userId,
      Date.now(),
      Date.now()
    ).run();

    // Create session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

    await DB.prepare(`
      INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      userId,
      sessionToken,
      expiresAt,
      Date.now()
    ).run();

    // Set session cookie
    const response = new Response(JSON.stringify({
      success: true,
      data: {
        user: {
          id: userId,
          email: email.toLowerCase(),
          name,
          role
        }
      }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

    response.headers.set('Set-Cookie', `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}`);

    return response;

  } catch (error) {
    console.error('Registration error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}