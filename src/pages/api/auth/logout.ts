import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const sessionToken = request.headers.get('cookie')?.split('session=')[1]?.split(';')[0];

    if (sessionToken) {
      // Delete session from database
      await locals.runtime.env.DB.prepare(
        'DELETE FROM user_sessions WHERE token = ?'
      ).bind(sessionToken).run();
    }

    // Clear session cookie
    const response = new Response(JSON.stringify({
      success: true,
      message: 'Logged out successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    response.headers.set('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0');

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