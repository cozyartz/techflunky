// Example API route for listing creation
// This demonstrates the Cloudflare Workers pattern for API endpoints

import type { APIContext } from 'astro';

export async function POST({ request, locals }: APIContext) {
  const { DB, BUCKET } = locals.runtime.env;
  
  try {
    const data = await request.json();
    const { title, description, category, industry, price, packageTier } = data;
    
    // Validate input
    if (!title || !description || !category || !industry || !price) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generate slug
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    // TODO: Add authentication check
    // const userId = await verifyAuth(request);
    
    // Insert into D1 database
    const result = await DB.prepare(`
      INSERT INTO listings (
        seller_id, title, slug, description, category, 
        industry, price, package_tier, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft')
    `).bind(
      'temp-user-id', // Replace with actual user ID from auth
      title,
      slug,
      description,
      category,
      industry,
      price * 100, // Convert to cents
      packageTier || 'concept'
    ).run();
    
    return new Response(JSON.stringify({
      success: true,
      listingId: result.meta.last_row_id,
      slug
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error creating listing:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET({ params, locals }: APIContext) {
  const { DB } = locals.runtime.env;
  
  try {
    // Get listings with pagination
    const page = Number(params.page) || 1;
    const limit = 12;
    const offset = (page - 1) * limit;
    
    const listings = await DB.prepare(`
      SELECT l.*, u.name as seller_name, p.avatar_url
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE l.status = 'active'
      ORDER BY l.created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();
    
    const totalCount = await DB.prepare(
      'SELECT COUNT(*) as count FROM listings WHERE status = "active"'
    ).first();
    
    return new Response(JSON.stringify({
      listings: listings.results,
      pagination: {
        page,
        totalPages: Math.ceil(totalCount.count / limit),
        totalItems: totalCount.count
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Error fetching listings:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
