// TechFlunky User Worker for Workers for Platforms
// Handles tenant-specific requests with complete isolation

export interface Env {
  // Shared resources (provided by dispatch Worker)
  DB: D1Database;
  AI: any;
  BUCKET: R2Bucket;
  CACHE: KVNamespace;
  ANALYTICS: AnalyticsEngineDataset;

  // Environment variables
  ENVIRONMENT: string;
  SITE_URL: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET_TEST: string;
  STRIPE_WEBHOOK_SECRET_LIVE: string;
  AUTIMIND_STRIPE_KEY: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Extract tenant context from headers (set by dispatch Worker)
    const tenantId = request.headers.get('X-Tenant-ID');
    const tenantType = request.headers.get('X-Tenant-Type');

    if (!tenantId) {
      return new Response('Missing tenant context', { status: 400 });
    }

    // Add tenant context to all subsequent operations
    const tenantContext = {
      id: tenantId,
      type: tenantType as 'seller' | 'buyer',
      sellerId: tenantId.startsWith('seller_') ? tenantId.replace('seller_', '') : null
    };

    const url = new URL(request.url);

    // Route to appropriate handler based on path
    try {
      // API routes
      if (url.pathname.startsWith('/api/')) {
        return handleApiRoute(request, env, tenantContext);
      }

      // Seller dashboard routes
      if (url.pathname.startsWith('/seller/') || url.pathname.startsWith('/dashboard/')) {
        return handleSellerDashboard(request, env, tenantContext);
      }

      // Platform/listing routes
      if (url.pathname.startsWith('/platform/')) {
        return handlePlatformRoute(request, env, tenantContext);
      }

      // Default tenant-specific handling
      return handleTenantDefault(request, env, tenantContext);

    } catch (error) {
      console.error('User Worker error:', error);
      return new Response('Internal tenant error', { status: 500 });
    }
  }
};

interface TenantContext {
  id: string;
  type: 'seller' | 'buyer';
  sellerId: string | null;
}

// Handle API routes with tenant isolation
async function handleApiRoute(
  request: Request,
  env: Env,
  tenant: TenantContext
): Promise<Response> {
  const url = new URL(request.url);

  // Seller-specific API routes
  if (url.pathname.startsWith('/api/seller/')) {
    return handleSellerApi(request, env, tenant);
  }

  // Platform management API
  if (url.pathname.startsWith('/api/platform/')) {
    return handlePlatformApi(request, env, tenant);
  }

  // Blueprint/business plan API
  if (url.pathname.startsWith('/api/blueprint/')) {
    return handleBlueprintApi(request, env, tenant);
  }

  // Tenant-isolated listings API
  if (url.pathname.startsWith('/api/listings')) {
    return handleListingsApi(request, env, tenant);
  }

  return new Response('API route not found', { status: 404 });
}

// Handle seller-specific API endpoints
async function handleSellerApi(
  request: Request,
  env: Env,
  tenant: TenantContext
): Promise<Response> {
  // Ensure only sellers can access seller APIs
  if (tenant.type !== 'seller') {
    return new Response('Unauthorized', { status: 403 });
  }

  const url = new URL(request.url);

  if (url.pathname === '/api/seller/dashboard' && request.method === 'GET') {
    // Get seller dashboard data
    try {
      const seller = await env.DB.prepare(`
        SELECT u.*, p.bio, p.company, p.website, p.seller_rating, p.seller_reviews_count
        FROM users u
        LEFT JOIN profiles p ON u.id = p.user_id
        WHERE u.id = ? AND u.role = 'seller'
      `).bind(tenant.sellerId).first();

      if (!seller) {
        return new Response('Seller not found', { status: 404 });
      }

      // Get seller's platforms
      const platforms = await env.DB.prepare(`
        SELECT id, title, slug, description, price, status, views_count,
               favorites_count, ai_score, created_at, updated_at
        FROM listings
        WHERE seller_id = ?
        ORDER BY created_at DESC
      `).bind(tenant.sellerId).all();

      // Get sales statistics
      const stats = await env.DB.prepare(`
        SELECT
          COUNT(*) as total_platforms,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_platforms,
          COUNT(CASE WHEN status = 'sold' THEN 1 END) as sold_platforms,
          SUM(CASE WHEN status = 'sold' THEN price ELSE 0 END) as total_revenue
        FROM listings
        WHERE seller_id = ?
      `).bind(tenant.sellerId).first();

      return new Response(JSON.stringify({
        success: true,
        data: {
          seller,
          platforms: platforms.results || [],
          stats: stats || {
            total_platforms: 0,
            active_platforms: 0,
            sold_platforms: 0,
            total_revenue: 0
          }
        },
        tenant: {
          id: tenant.id,
          type: tenant.type
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Seller dashboard error:', error);
      return new Response('Failed to load dashboard', { status: 500 });
    }
  }

  return new Response('Seller API endpoint not found', { status: 404 });
}

// Handle platform management API with tenant isolation
async function handlePlatformApi(
  request: Request,
  env: Env,
  tenant: TenantContext
): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/api/platform/create' && request.method === 'POST') {
    // Only sellers can create platforms
    if (tenant.type !== 'seller') {
      return new Response('Unauthorized', { status: 403 });
    }

    try {
      const body = await request.json();
      const { title, description, category, industry, price } = body;

      // Validate required fields
      if (!title || !description || !category || !industry || price === undefined) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Missing required fields'
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Create platform with tenant isolation
      const platformId = crypto.randomUUID();
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      const result = await env.DB.prepare(`
        INSERT INTO listings (
          id, seller_id, title, slug, description, category, industry, price,
          status, package_tier, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'concept', ?, ?)
      `).bind(
        platformId,
        tenant.sellerId,
        title,
        slug,
        description,
        category,
        industry,
        Math.round(price * 100), // Convert to cents
        Date.now(),
        Date.now()
      ).run();

      return new Response(JSON.stringify({
        success: true,
        data: {
          id: platformId,
          seller_id: tenant.sellerId,
          title,
          slug,
          description,
          category,
          industry,
          price: Math.round(price * 100),
          status: 'draft',
          package_tier: 'concept'
        },
        tenant: {
          id: tenant.id,
          type: tenant.type
        }
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Platform creation error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to create platform'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }

  return new Response('Platform API endpoint not found', { status: 404 });
}

// Handle blueprint API with tenant isolation
async function handleBlueprintApi(
  request: Request,
  env: Env,
  tenant: TenantContext
): Promise<Response> {
  const url = new URL(request.url);

  // All blueprint operations require seller context
  if (tenant.type !== 'seller') {
    return new Response('Unauthorized', { status: 403 });
  }

  // Route to existing blueprint handlers but with tenant context
  return new Response(JSON.stringify({
    message: 'Blueprint API - will integrate with existing handlers',
    tenant: {
      id: tenant.id,
      type: tenant.type,
      sellerId: tenant.sellerId
    },
    path: url.pathname
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle listings API with tenant filtering
async function handleListingsApi(
  request: Request,
  env: Env,
  tenant: TenantContext
): Promise<Response> {
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    try {
      // Filter to only show this seller's listings or public listings
      let query = `
        SELECT id, seller_id, title, slug, description, category, industry,
               price, status, package_tier, views_count, favorites_count,
               ai_score, created_at, updated_at
        FROM listings
      `;

      let params: any[] = [];

      if (tenant.type === 'seller') {
        // Sellers see only their own listings
        query += ' WHERE seller_id = ?';
        params.push(tenant.sellerId);
      } else {
        // Buyers see only active public listings
        query += ' WHERE status = "active"';
      }

      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      const listings = await env.DB.prepare(query).bind(...params).all();

      return new Response(JSON.stringify({
        success: true,
        data: listings.results || [],
        pagination: {
          page,
          limit,
          total: listings.results?.length || 0
        },
        tenant: {
          id: tenant.id,
          type: tenant.type
        }
      }), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('Listings API error:', error);
      return new Response('Failed to fetch listings', { status: 500 });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}

// Handle seller dashboard UI
async function handleSellerDashboard(
  request: Request,
  env: Env,
  tenant: TenantContext
): Promise<Response> {
  if (tenant.type !== 'seller') {
    return new Response('Unauthorized', { status: 403 });
  }

  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Seller Dashboard - TechFlunky</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: system-ui, sans-serif; margin: 0; padding: 20px; }
          .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .tenant-info { background: #e3f2fd; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>TechFlunky Seller Dashboard</h1>
          <p>Isolated seller environment</p>
        </div>

        <div class="tenant-info">
          <h3>Tenant Information</h3>
          <p><strong>Tenant ID:</strong> ${tenant.id}</p>
          <p><strong>Tenant Type:</strong> ${tenant.type}</p>
          <p><strong>Seller ID:</strong> ${tenant.sellerId}</p>
        </div>

        <h2>Your Platforms</h2>
        <p>Platform management interface will be integrated here.</p>

        <h2>Sales Analytics</h2>
        <p>Revenue and performance metrics will be displayed here.</p>

        <p><em>Served by isolated User Worker</em></p>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Handle platform detail pages
async function handlePlatformRoute(
  request: Request,
  env: Env,
  tenant: TenantContext
): Promise<Response> {
  const url = new URL(request.url);
  const platformMatch = url.pathname.match(/^\/platform\/([^\/]+)/);

  if (!platformMatch) {
    return new Response('Platform not found', { status: 404 });
  }

  const platformId = platformMatch[1];

  // Verify platform belongs to this tenant (if seller)
  if (tenant.type === 'seller') {
    try {
      const platform = await env.DB.prepare(
        'SELECT seller_id FROM listings WHERE id = ? OR slug = ?'
      ).bind(platformId, platformId).first();

      if (!platform || platform.seller_id !== tenant.sellerId) {
        return new Response('Platform not found', { status: 404 });
      }
    } catch (error) {
      console.error('Platform verification error:', error);
      return new Response('Error accessing platform', { status: 500 });
    }
  }

  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Platform: ${platformId} - TechFlunky</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <h1>Platform: ${platformId}</h1>
        <p>Tenant: ${tenant.id} (${tenant.type})</p>
        <p>Platform detail page will be integrated here.</p>
        <p><em>Served by isolated User Worker</em></p>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}

// Handle default tenant requests
async function handleTenantDefault(
  request: Request,
  env: Env,
  tenant: TenantContext
): Promise<Response> {
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>TechFlunky - Tenant: ${tenant.id}</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
      </head>
      <body>
        <h1>TechFlunky Tenant Environment</h1>
        <p><strong>Tenant ID:</strong> ${tenant.id}</p>
        <p><strong>Tenant Type:</strong> ${tenant.type}</p>
        <p><strong>Path:</strong> ${new URL(request.url).pathname}</p>
        <p><em>Served by isolated User Worker</em></p>
      </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' }
  });
}