// TechFlunky Dispatch Worker for Workers for Platforms
// Routes requests to tenant-specific Workers based on seller context

export interface Env {
  // Workers for Platforms binding
  USER_WORKER: Fetcher;

  // Shared resources
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
    const url = new URL(request.url);

    // Extract tenant context from request
    const tenantId = await extractTenantId(request, env);

    // Handle main platform routes (non-tenant specific)
    if (shouldHandleDirectly(url.pathname)) {
      return handlePlatformRoute(request, env, ctx);
    }

    // Route to tenant-specific Worker
    if (tenantId) {
      return routeToTenantWorker(request, env, tenantId);
    }

    // Default to main platform handling
    return handlePlatformRoute(request, env, ctx);
  }
};

// Extract tenant ID from request context
async function extractTenantId(request: Request, env: Env): Promise<string | null> {
  const url = new URL(request.url);

  // Check for seller subdomain (seller.techflunky.com)
  const hostname = url.hostname;
  if (hostname !== 'techflunky.com' && hostname.endsWith('.techflunky.com')) {
    const subdomain = hostname.replace('.techflunky.com', '');
    if (subdomain !== 'www' && subdomain !== 'api') {
      return `seller_${subdomain}`;
    }
  }

  // Check for seller path (/seller/{id})
  const sellerMatch = url.pathname.match(/^\/seller\/([^\/]+)/);
  if (sellerMatch) {
    return `seller_${sellerMatch[1]}`;
  }

  // Check for platform-specific paths (/platform/{id})
  const platformMatch = url.pathname.match(/^\/platform\/([^\/]+)/);
  if (platformMatch) {
    // Get seller ID from platform ID via database lookup
    try {
      const platform = await env.DB.prepare(
        'SELECT seller_id FROM listings WHERE id = ? OR slug = ?'
      ).bind(platformMatch[1], platformMatch[1]).first();

      if (platform?.seller_id) {
        return `seller_${platform.seller_id}`;
      }
    } catch (error) {
      console.warn('Failed to lookup platform seller:', error);
    }
  }

  // Check authentication token for user context
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const session = await env.DB.prepare(
        'SELECT user_id FROM user_sessions WHERE token = ? AND expires_at > ?'
      ).bind(token, Date.now()).first();

      if (session?.user_id) {
        // Check if user is a seller
        const user = await env.DB.prepare(
          'SELECT role FROM users WHERE id = ?'
        ).bind(session.user_id).first();

        if (user?.role === 'seller') {
          return `seller_${session.user_id}`;
        }
      }
    } catch (error) {
      console.warn('Failed to lookup user session:', error);
    }
  }

  return null;
}

// Check if route should be handled by main platform
function shouldHandleDirectly(pathname: string): boolean {
  const platformRoutes = [
    '/api/auth/',
    '/api/stripe/webhook',
    '/api/admin/',
    '/browse',
    '/search',
    '/',
    '/login',
    '/register',
    '/about',
    '/pricing',
    '/contact'
  ];

  return platformRoutes.some(route => pathname.startsWith(route)) || pathname === '/';
}

// Route request to tenant-specific Worker
async function routeToTenantWorker(
  request: Request,
  env: Env,
  tenantId: string
): Promise<Response> {
  try {
    // Create tenant-specific request with context
    const tenantRequest = new Request(request.url, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'X-Tenant-ID': tenantId,
        'X-Tenant-Type': tenantId.startsWith('seller_') ? 'seller' : 'buyer'
      },
      body: request.body
    });

    // Route to user Worker with tenant context
    const response = await env.USER_WORKER.fetch(tenantRequest);

    // Add tenant identification headers to response
    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        'X-Served-By': 'tenant-worker',
        'X-Tenant-ID': tenantId
      }
    });

    return modifiedResponse;

  } catch (error) {
    console.error('Failed to route to tenant Worker:', error);

    // Fallback to main platform handling
    return handlePlatformRoute(request, env, {} as ExecutionContext);
  }
}

// Handle main platform routes
async function handlePlatformRoute(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  // Route all platform requests to the TechFlunky Pages deployment
  const url = new URL(request.url);

  // Special handling for security subdomain - route to /security page for HTML requests only
  let targetPath = url.pathname;

  if (url.hostname === 'security.techflunky.com' || url.hostname.includes('security.techflunky.com')) {
    // Only redirect to /security for HTML page requests, not static assets
    if (!url.pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp|map)$/)) {
      targetPath = '/security';
    }
  }

  // Create new URL pointing to the TechFlunky Pages deployment
  const pagesUrl = new URL(targetPath + url.search, 'https://7f72f172.techflunky.pages.dev');

  // Create new request with the updated URL
  const pagesRequest = new Request(pagesUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    redirect: 'manual'
  });

  try {
    // Proxy the request to TechFlunky Pages
    const response = await fetch(pagesRequest);

    // Return the response from Pages
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    });
  } catch (error) {
    console.error('Failed to proxy to TechFlunky Pages:', error);

    // Fallback response if Pages is unavailable
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>TechFlunky - Temporarily Unavailable</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
          <h1>TechFlunky Platform</h1>
          <p>Platform temporarily unavailable. Please try again later.</p>
          <p>Route: ${url.pathname}</p>
        </body>
      </html>
    `, {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}