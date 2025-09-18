import type { APIContext } from 'astro';
import bcrypt from 'bcryptjs';
import { InputSanitizer } from '../../../lib/sanitization';
import { SecureCookieManager } from '../../../lib/cookies';

export async function POST({ request, locals }: APIContext) {
  try {
    const { email, password } = await request.json();

    // Validate and sanitize input
    if (!email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Email and password are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let sanitizedEmail: string;
    let validatedPassword: string;

    try {
      sanitizedEmail = InputSanitizer.validateAndSanitizeInput(email, 'email');
      validatedPassword = InputSanitizer.validateAndSanitizeInput(password, 'password');
    } catch (sanitizeError) {
      return new Response(JSON.stringify({
        success: false,
        error: sanitizeError instanceof Error ? sanitizeError.message : 'Invalid input format'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find user by email
    const DB = locals.runtime?.env?.DB || process.env.D1_DATABASE;
    if (!DB) {
      // Demo mode - accept any login with expiring session
      const baseToken = crypto.randomUUID();
      const expiresAt = Date.now() + (2 * 60 * 60 * 1000); // 2 hours for demo
      const sessionToken = `${baseToken}:${expiresAt}`;

      const response = new Response(JSON.stringify({
        success: true,
        data: {
          user: {
            id: 'demo-user',
            email: sanitizedEmail,
            name: 'Demo User',
            role: 'user'
          },
          token: baseToken
        },
        note: 'Demo login - Database not configured'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      const isDevelopment = process.env.NODE_ENV === 'development';
      const cookieString = SecureCookieManager.createSessionCookie(sessionToken, 2 * 60 * 60, isDevelopment);
      response.headers.set('Set-Cookie', cookieString);
      SecureCookieManager.addSecurityHeaders(response);
      return response;
    }

    const user = await DB.prepare(
      'SELECT id, email, name, password_hash, role FROM users WHERE email = ?'
    ).bind(sanitizedEmail).first();

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
    const passwordValid = await bcrypt.compare(validatedPassword, user.password_hash);
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

    await DB.prepare(`
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
    await DB.prepare(
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
        },
        token: sessionToken
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const isDevelopment = process.env.NODE_ENV === 'development';
    const cookieString = SecureCookieManager.createSessionCookie(sessionToken, 30 * 24 * 60 * 60, isDevelopment);
    response.headers.set('Set-Cookie', cookieString);
    SecureCookieManager.addSecurityHeaders(response);

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
}