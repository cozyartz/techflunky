import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const searchParams = url.searchParams;
    const query = searchParams.get('q') || '';
    const category = searchParams.get('category') || '';
    const minPrice = searchParams.get('minPrice') ? parseInt(searchParams.get('minPrice') || '0') : 0;
    const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice') || '999999999') : 999999999;
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = (page - 1) * limit;

    // Build the query
    let sql = `
      SELECT
        l.id, l.title, l.slug, l.description, l.category, l.industry,
        l.price, l.status, l.package_tier, l.views_count, l.favorites_count,
        l.ai_score, l.published_at, l.created_at,
        u.name as seller_name,
        p.seller_rating, p.seller_reviews_count
      FROM listings l
      JOIN users u ON l.seller_id = u.id
      LEFT JOIN profiles p ON u.id = p.user_id
      WHERE l.status = 'active'
    `;

    const params = [];

    // Add search filters
    if (query) {
      sql += ` AND (l.title LIKE ? OR l.description LIKE ? OR l.industry LIKE ?)`;
      const searchTerm = `%${query}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (category) {
      sql += ` AND l.category = ?`;
      params.push(category);
    }

    // Price range filter
    sql += ` AND l.price >= ? AND l.price <= ?`;
    params.push(minPrice * 100, maxPrice * 100); // Convert to cents

    // Add sorting
    const validSortFields = ['created_at', 'price', 'views_count', 'ai_score', 'favorites_count'];
    const validSortOrders = ['asc', 'desc'];

    if (validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder)) {
      sql += ` ORDER BY l.${sortBy} ${sortOrder.toUpperCase()}`;
    } else {
      sql += ` ORDER BY l.created_at DESC`;
    }

    // Add pagination
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // Execute main query
    const listings = await locals.runtime.env.DB.prepare(sql).bind(...params).all();

    // Get total count for pagination
    let countSql = `
      SELECT COUNT(*) as total
      FROM listings l
      WHERE l.status = 'active'
    `;

    const countParams = [];

    if (query) {
      countSql += ` AND (l.title LIKE ? OR l.description LIKE ? OR l.industry LIKE ?)`;
      const searchTerm = `%${query}%`;
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (category) {
      countSql += ` AND l.category = ?`;
      countParams.push(category);
    }

    countSql += ` AND l.price >= ? AND l.price <= ?`;
    countParams.push(minPrice * 100, maxPrice * 100);

    const countResult = await locals.runtime.env.DB.prepare(countSql).bind(...countParams).first();
    const total = countResult?.total || 0;

    // Transform results
    const transformedListings = listings.results.map(listing => ({
      id: listing.id,
      title: listing.title,
      slug: listing.slug,
      description: listing.description,
      category: listing.category,
      industry: listing.industry,
      price: listing.price / 100, // Convert back to dollars
      packageTier: listing.package_tier,
      viewsCount: listing.views_count,
      favoritesCount: listing.favorites_count,
      aiScore: listing.ai_score,
      publishedAt: listing.published_at,
      seller: {
        name: listing.seller_name,
        rating: listing.seller_rating,
        reviewsCount: listing.seller_reviews_count
      }
    }));

    return new Response(JSON.stringify({
      success: true,
      data: {
        listings: transformedListings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1
        },
        filters: {
          query,
          category,
          priceRange: { min: minPrice, max: maxPrice },
          sortBy,
          sortOrder
        }
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};