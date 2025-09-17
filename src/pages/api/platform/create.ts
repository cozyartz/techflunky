// Platform Creation API
import type { APIContext } from 'astro';

export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  try {
    // Check for authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { name, description, category, price, technologies, features } = body;

    if (!name || !description || !category || !price) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const platformId = `platform_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    if (DB) {
      await DB.prepare(`
        INSERT INTO business_blueprints (
          id,
          platform_name,
          description,
          category,
          price,
          technologies,
          features,
          status,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        platformId,
        name,
        description,
        category,
        price,
        JSON.stringify(technologies || []),
        JSON.stringify(features || []),
        'pending',
        new Date().toISOString()
      ).run();
    }

    return new Response(JSON.stringify({
      success: true,
      platformId,
      message: 'Platform created successfully',
      note: DB ? 'Live platform creation' : 'Demo platform creation - Database not configured'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Platform creation failed',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}