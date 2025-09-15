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

    // Check if database tables exist
    try {
      await locals.runtime.env.DB.prepare('SELECT 1 FROM users LIMIT 1').first();
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Database not initialized. Please set up the database first.',
        note: 'Run: wrangler d1 execute techflunky-db --local --file=database/schema.sql'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user already exists
    const existingUser = await locals.runtime.env.DB.prepare(
      'SELECT id, email, name, role FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (existingUser) {
      // Update existing user to admin role
      await locals.runtime.env.DB.prepare(`
        UPDATE users SET role = 'admin', updated_at = ? WHERE email = ?
      `).bind(Date.now(), email.toLowerCase()).run();

      return new Response(JSON.stringify({
        success: true,
        message: `Updated ${email} to admin role`,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          role: 'admin'
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create new owner user
    const userId = crypto.randomUUID();
    const name = email.split('@')[0] + ' (Owner)';

    await locals.runtime.env.DB.prepare(`
      INSERT INTO users (id, email, name, password_hash, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      email.toLowerCase(),
      name,
      'github_oauth', // No password - will use OAuth
      'admin',
      Date.now(),
      Date.now()
    ).run();

    // Create profile
    await locals.runtime.env.DB.prepare(`
      INSERT INTO profiles (user_id, bio, company, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      'TechFlunky Platform Owner and Administrator',
      'TechFlunky',
      Date.now(),
      Date.now()
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: `Created owner account for ${email}`,
      user: {
        id: userId,
        email: email.toLowerCase(),
        name,
        role: 'admin'
      },
      note: 'You can now sign in using GitHub OAuth or create a magic link'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Seed owner error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create owner account',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};