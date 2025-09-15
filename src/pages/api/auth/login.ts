import type { APIRoute } from 'astro';
import bcrypt from 'bcryptjs';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and password are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find user by email
    const user = await locals.runtime.env.DB.prepare(
      'SELECT id, email, name, password_hash, role FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email or password'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid email or password'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

    await locals.runtime.env.DB.prepare(`
      INSERT INTO user_sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      user.id,
      sessionToken,
      expiresAt,
      Date.now()
    ).run();

    // Update last login
    await locals.runtime.env.DB.prepare(
      'UPDATE users SET updated_at = ? WHERE id = ?'
    ).bind(Date.now(), user.id).run();

    // Set session cookie
    const response = new Response(JSON.stringify({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    response.headers.set('Set-Cookie', `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${30 * 24 * 60 * 60}`);

    return response;

  } catch (error) {
    console.error('Login error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};