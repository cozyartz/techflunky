import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    // Redirect to Google OAuth
    const clientId = locals.runtime.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${url.origin}/api/auth/google`;
    const scope = 'openid email profile';
    const stateParam = Math.random().toString(36).substring(7);

    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=code&state=${stateParam}`;

    return redirect(googleUrl);
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: locals.runtime.env.GOOGLE_CLIENT_ID,
        client_secret: locals.runtime.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${url.origin}/api/auth/google`,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get user data from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    // Check if user exists
    let user = await locals.runtime.env.DB.prepare(
      'SELECT id, email, name, role FROM users WHERE email = ?'
    ).bind(userData.email.toLowerCase()).first();

    if (!user) {
      // Create new user account
      const userId = crypto.randomUUID();

      await locals.runtime.env.DB.prepare(`
        INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        userData.email.toLowerCase(),
        userData.name || userData.email.split('@')[0],
        'google_oauth', // No password for OAuth users
        'user',
        Date.now(),
        Date.now()
      ).run();

      // Create profile
      await locals.runtime.env.DB.prepare(`
        INSERT INTO profiles (user_id, bio, avatar_url, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(
        userId,
        'TechFlunky user authenticated via Google',
        userData.picture || null,
        Date.now(),
        Date.now()
      ).run();

      user = {
        id: userId,
        email: userData.email.toLowerCase(),
        name: userData.name || userData.email.split('@')[0],
        role: 'user'
      };
    }

    // Create session
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

    await locals.runtime.env.DB.prepare(`
      INSERT INTO user_sessions (user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(user.id, sessionToken, expiresAt, Date.now()).run();

    // Set session cookie
    const response = new Response(null, {
      status: 302,
      headers: {
        'Location': user.role === 'admin' ? '/dashboard/admin' :
                   user.role === 'seller' ? '/dashboard/seller' :
                   user.role === 'investor' ? '/dashboard/investor' : '/browse',
        'Set-Cookie': `session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
      }
    });

    return response;

  } catch (error) {
    console.error('Google OAuth error:', error);
    return redirect('/login?error=oauth_failed');
  }
};