import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    // Guard against build-time execution
    if (!locals?.runtime?.env) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Service temporarily unavailable'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const sessionToken = request.headers.get('cookie')?.split('session=')[1]?.split(';')[0];

    if (!sessionToken) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No session token found'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find active session
    const session = await locals.runtime.env.DB.prepare(`
      SELECT us.user_id, us.expires_at, u.email, u.name, u.role, p.bio, p.company, p.avatar_url
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE us.token = ? AND us.expires_at > ?
    `).bind(sessionToken, Date.now()).first();

    if (!session) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid or expired session'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: {
        user: {
          id: session.user_id,
          email: session.email,
          name: session.name,
          role: session.role,
          bio: session.bio,
          company: session.company,
          avatar_url: session.avatar_url
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Session check error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};