import type { APIRoute } from 'astro';
import { SecureCookieManager } from '../../../lib/cookies';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const sessionToken = request.headers.get('cookie')?.split('session=')[1]?.split(';')[0];

    if (sessionToken) {
      // Delete session from database
      const DB = locals.runtime?.env?.DB || process.env.D1_DATABASE;
      if (DB) {
        await DB.prepare(
          'DELETE FROM user_sessions WHERE token = ?'
        ).bind(sessionToken).run();
      }
    }

    // Clear session cookie with enhanced security
    const response = new Response(JSON.stringify({
      success: true,
      message: 'Logged out successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const isDevelopment = process.env.NODE_ENV === 'development';
    const logoutCookie = SecureCookieManager.createLogoutCookie(isDevelopment);
    response.headers.set('Set-Cookie', logoutCookie);
    SecureCookieManager.addSecurityHeaders(response);

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};