import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Valid email address is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate magic link token
    const token = crypto.randomUUID();
    const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minutes

    // Check if user exists
    let user = await locals.runtime.env.DB.prepare(
      'SELECT id, email, name, role FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    let userId;
    let isNewUser = false;

    if (!user) {
      // Create new user account
      userId = crypto.randomUUID();
      isNewUser = true;

      await locals.runtime.env.DB.prepare(`
        INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).bind(
        userId,
        email.toLowerCase(),
        email.split('@')[0], // Use email prefix as default name
        'magic_link', // No password for magic link users
        'user',
        Date.now(),
        Date.now()
      ).run();

      // Create basic profile
      await locals.runtime.env.DB.prepare(`
        INSERT INTO profiles (user_id, bio, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).bind(
        userId,
        'New TechFlunky user',
        Date.now(),
        Date.now()
      ).run();
    } else {
      userId = user.id;
    }

    // Store magic link token
    await locals.runtime.env.DB.prepare(`
      INSERT OR REPLACE INTO magic_links (id, user_id, token, email, expires_at, used, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      userId,
      token,
      email.toLowerCase(),
      expiresAt,
      0,
      Date.now()
    ).run();

    // In production, you would send this via email
    // For development, we'll return the magic link
    const magicLink = `${locals.runtime.env.SITE_URL || 'http://localhost:4321'}/auth/verify?token=${token}`;

    console.log(`Magic Link for ${email}: ${magicLink}`);

    // TODO: Send email with magic link
    // await sendMagicLinkEmail(email, magicLink);

    return new Response(JSON.stringify({
      success: true,
      message: isNewUser
        ? 'Account created! Check your email for the magic link to sign in.'
        : 'Magic link sent! Check your email to sign in.',
      // In development, include the link for testing
      ...(locals.runtime.env.ENVIRONMENT === 'development' && {
        magicLink,
        note: 'This magic link is only shown in development mode'
      })
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Magic link error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to send magic link'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const token = url.searchParams.get('token');

  if (!token) {
    return redirect('/login?error=invalid_token');
  }

  try {
    // Verify magic link token
    const magicLink = await locals.runtime.env.DB.prepare(`
      SELECT ml.*, u.id as user_id, u.email, u.name, u.role
      FROM magic_links ml
      JOIN users u ON ml.user_id = u.id
      WHERE ml.token = ? AND ml.used = 0 AND ml.expires_at > ?
    `).bind(token, Date.now()).first();

    if (!magicLink) {
      return redirect('/login?error=invalid_or_expired_token');
    }

    // Mark magic link as used
    await locals.runtime.env.DB.prepare(`
      UPDATE magic_links SET used = 1, updated_at = ? WHERE token = ?
    `).bind(Date.now(), token).run();

    // Create user session
    const sessionToken = crypto.randomUUID();
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000); // 30 days

    await locals.runtime.env.DB.prepare(`
      INSERT INTO user_sessions (user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?)
    `).bind(magicLink.user_id, sessionToken, expiresAt, Date.now()).run();

    // Set session cookie and redirect
    const response = new Response(null, {
      status: 302,
      headers: {
        'Location': magicLink.role === 'admin' ? '/dashboard/admin' :
                   magicLink.role === 'seller' ? '/dashboard/seller' :
                   magicLink.role === 'investor' ? '/dashboard/investor' : '/browse',
        'Set-Cookie': `session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 60 * 60}`
      }
    });

    return response;

  } catch (error) {
    console.error('Magic link verification error:', error);
    return redirect('/login?error=verification_failed');
  }
};