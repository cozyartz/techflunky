// Platform Listings API
// Provides marketplace listings for the browse page
import type { APIContext } from 'astro';

export async function GET({ url, locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};
  const search = url.searchParams.get('search') || '';
  const category = url.searchParams.get('category') || '';
  const limit = parseInt(url.searchParams.get('limit') || '20');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    // If no database, return demo listings
    if (!DB) {
      const demoListings = [
        {
          id: 'demo-1',
          platform_name: 'AI Social Media Manager',
          description: 'Complete AI-powered social media management platform',
          category: 'marketing',
          price: 9900,
          ai_validation_score: 8.5,
          technologies: ['React', 'Node.js', 'OpenAI'],
          features: ['Auto-posting', 'Content generation', 'Analytics'],
          seller_name: 'Demo Seller',
          created_at: new Date().toISOString(),
          is_featured: true
        },
        {
          id: 'demo-2',
          platform_name: 'E-commerce Analytics Dashboard',
          description: 'Real-time analytics and insights for online stores',
          category: 'analytics',
          price: 14900,
          ai_validation_score: 9.2,
          technologies: ['Vue.js', 'Python', 'PostgreSQL'],
          features: ['Real-time tracking', 'Sales forecasting', 'Customer insights'],
          seller_name: 'Demo Seller',
          created_at: new Date().toISOString(),
          is_featured: false
        },
        {
          id: 'demo-3',
          platform_name: 'Project Management Suite',
          description: 'Complete project management solution with team collaboration',
          category: 'productivity',
          price: 19900,
          ai_validation_score: 8.8,
          technologies: ['React', 'Express', 'MongoDB'],
          features: ['Task management', 'Team chat', 'Time tracking'],
          seller_name: 'Demo Seller',
          created_at: new Date().toISOString(),
          is_featured: true
        }
      ];

      // Filter by search and category
      let filteredListings = demoListings;

      if (search) {
        filteredListings = filteredListings.filter(listing =>
          listing.platform_name.toLowerCase().includes(search.toLowerCase()) ||
          listing.description.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (category && category !== 'all') {
        filteredListings = filteredListings.filter(listing =>
          listing.category === category
        );
      }

      // Apply pagination
      const paginatedListings = filteredListings.slice(offset, offset + limit);

      return new Response(JSON.stringify({
        success: true,
        data: paginatedListings,
        listings: paginatedListings,
        total: filteredListings.length,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(filteredListings.length / limit),
        note: 'Demo data - Database not configured'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Real database query (when DB is available)
    let query = `
      SELECT
        bp.id,
        bp.platform_name,
        bp.description,
        bp.category,
        bp.price,
        bp.ai_validation_score,
        bp.technologies,
        bp.features,
        bp.created_at,
        bp.is_featured,
        sp.name as seller_name
      FROM business_blueprints bp
      LEFT JOIN seller_profiles sp ON bp.seller_id = sp.user_id
      WHERE bp.status = 'approved'
    `;

    const params = [];

    if (search) {
      query += ` AND (bp.platform_name LIKE ? OR bp.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category && category !== 'all') {
      query += ` AND bp.category = ?`;
      params.push(category);
    }

    query += ` ORDER BY bp.is_featured DESC, bp.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const listings = await DB.prepare(query).bind(...params).all();

    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM business_blueprints bp WHERE bp.status = 'approved'`;
    const countParams = [];

    if (search) {
      countQuery += ` AND (bp.platform_name LIKE ? OR bp.description LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (category && category !== 'all') {
      countQuery += ` AND bp.category = ?`;
      countParams.push(category);
    }

    const totalResult = await DB.prepare(countQuery).bind(...countParams).first();
    const total = totalResult.total;

    return new Response(JSON.stringify({
      success: true,
      data: listings.results || listings || [],
      listings: listings.results || listings || [],
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch listings',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST endpoint for creating new listings
export async function POST({ request, locals }: APIContext) {
  const { DB } = locals.runtime?.env || {};

  if (!DB) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Database not configured'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const {
      platform_name,
      description,
      category,
      price,
      technologies,
      features,
      seller_id
    } = body;

    // Validate required fields
    if (!platform_name || !description || !category || !price || !seller_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const listingId = `listing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await DB.prepare(`
      INSERT INTO business_blueprints (
        id,
        platform_name,
        description,
        category,
        price,
        technologies,
        features,
        seller_id,
        status,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      listingId,
      platform_name,
      description,
      category,
      price,
      JSON.stringify(technologies || []),
      JSON.stringify(features || []),
      seller_id,
      'pending',
      new Date().toISOString()
    ).run();

    return new Response(JSON.stringify({
      success: true,
      listingId,
      message: 'Listing created successfully'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create listing',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}