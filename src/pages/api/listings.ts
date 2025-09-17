// Platform Listings API with Tenant Isolation
// Provides marketplace listings for the browse page
import type { APIContext } from 'astro';
import { withTenantIsolation, createTenantDb, validateTenantAccess } from '../../lib/tenant-isolation.js';

export const GET = withTenantIsolation(async (request, locals, ctx, tenant) => {
  const { DB } = locals.runtime?.env || {};
  const url = new URL(request.url);
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

    // Real database query with tenant isolation
    const tenantDb = createTenantDb(DB, tenant);

    let baseQuery = `
      SELECT
        l.id,
        l.title as platform_name,
        l.description,
        l.category,
        l.price,
        l.ai_score as ai_validation_score,
        l.technical_specs,
        l.created_at,
        l.status,
        u.name as seller_name,
        p.seller_rating
      FROM listings l
      LEFT JOIN users u ON l.seller_id = u.id
      LEFT JOIN profiles p ON l.seller_id = p.user_id
    `;

    // Apply tenant filtering
    let whereClause = '';
    const params = [];

    if (tenant?.type === 'seller') {
      // Sellers see only their own listings
      whereClause = 'WHERE l.seller_id = ?';
      params.push(tenant.sellerId);
    } else {
      // Buyers and public see only active listings
      whereClause = 'WHERE l.status = ?';
      params.push('active');
    }

    if (search) {
      whereClause += ` AND (l.title LIKE ? OR l.description LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (category && category !== 'all') {
      whereClause += ` AND l.category = ?`;
      params.push(category);
    }

    const query = `${baseQuery} ${whereClause} ORDER BY l.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const listings = await DB.prepare(query).bind(...params).all();

    // Get total count for pagination
    const countQuery = `SELECT COUNT(*) as total FROM listings l ${whereClause}`;
    const countParams = params.slice(0, -2); // Remove limit and offset

    const totalResult = await DB.prepare(countQuery).bind(...countParams).first();
    const total = totalResult?.total || 0;

    // Process technical_specs to extract technologies and features
    const processedListings = (listings.results || listings || []).map(listing => ({
      ...listing,
      technologies: listing.technical_specs ?
        JSON.parse(listing.technical_specs).technologies || [] : [],
      features: listing.technical_specs ?
        JSON.parse(listing.technical_specs).features || [] : [],
      ai_validation_score: listing.ai_validation_score || 0
    }));

    return new Response(JSON.stringify({
      success: true,
      data: processedListings,
      listings: processedListings,
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
      tenant: tenant ? {
        id: tenant.id,
        type: tenant.type
      } : null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Listings API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to fetch listings',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// POST endpoint for creating new listings with tenant isolation
export const POST = withTenantIsolation(async (request, locals, ctx, tenant) => {
  const { DB } = locals.runtime?.env || {};

  // Validate tenant has permission to create listings
  if (!validateTenantAccess(tenant, 'listing', undefined, 'create')) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Insufficient permissions to create listings'
    }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

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
    let {
      platform_name,
      description,
      category,
      price,
      technologies,
      features
    } = body;

    // Sanitize data for tenant context
    const sanitizedData = sanitizeForTenant({
      title: platform_name,
      description,
      category,
      price,
      technologies,
      features,
      seller_id: tenant?.sellerId
    }, tenant, 'listing');

    // Validate required fields
    if (!sanitizedData.title || !sanitizedData.description || !sanitizedData.category || !sanitizedData.price) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing required fields'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const listingId = crypto.randomUUID();
    const slug = sanitizedData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    await DB.prepare(`
      INSERT INTO listings (
        id,
        seller_id,
        title,
        slug,
        description,
        category,
        industry,
        price,
        technical_specs,
        status,
        package_tier,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      listingId,
      sanitizedData.seller_id,
      sanitizedData.title,
      slug,
      sanitizedData.description,
      sanitizedData.category,
      sanitizedData.category, // Use category as industry
      Math.round(sanitizedData.price * 100), // Convert to cents
      JSON.stringify({
        technologies: sanitizedData.technologies || [],
        features: sanitizedData.features || []
      }),
      'draft',
      'concept',
      Date.now(),
      Date.now()
    ).run();

    return new Response(JSON.stringify({
      success: true,
      data: {
        id: listingId,
        seller_id: sanitizedData.seller_id,
        title: sanitizedData.title,
        slug,
        description: sanitizedData.description,
        category: sanitizedData.category,
        price: Math.round(sanitizedData.price * 100),
        status: 'draft'
      },
      tenant: tenant ? {
        id: tenant.id,
        type: tenant.type
      } : null,
      message: 'Listing created successfully with tenant isolation'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Listing creation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create listing',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});