// TechFlunky Dispatch Worker - Multi-Domain Routing
//
// ARCHITECTURE OVERVIEW:
// This worker provides centralized routing for all TechFlunky domains:
// - techflunky.com (main platform)
// - security.techflunky.com (security documentation)
// - status.techflunky.com (system status)
// - docs.techflunky.com (documentation - separate Pages project)
//
// BENEFITS:
// 1. Single point of routing configuration
// 2. Consistent subdomain handling logic
// 3. Future-ready for Workers for Platforms tenant isolation
// 4. Performance optimization through edge routing
// 5. Centralized error handling and fallbacks
//
// Routes all requests to the main TechFlunky Pages deployment with subdomain-aware routing

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

// Handle main platform routes with optimized proxying
async function handlePlatformRoute(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);

  // Optimized subdomain routing logic
  let targetPath = url.pathname;

  // Security subdomain routing - only for HTML pages
  if (url.hostname.includes('security.techflunky.com')) {
    const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp|map)$/.test(url.pathname);
    if (!isStaticAsset) {
      // Route root requests to /security/, preserve other paths
      if (url.pathname === '/') {
        targetPath = '/security/';
      } else if (!url.pathname.startsWith('/security/')) {
        targetPath = '/security' + url.pathname;
      }
    }
  }

  // Status subdomain routing - only for HTML pages
  if (url.hostname.includes('status.techflunky.com')) {
    const isStaticAsset = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|webp|map)$/.test(url.pathname);
    if (!isStaticAsset) {
      // Route root requests to /status/, preserve other paths
      if (url.pathname === '/') {
        targetPath = '/status/';
      } else if (!url.pathname.startsWith('/status/')) {
        targetPath = '/status' + url.pathname;
      }
    }
  }

  // Construct target URL efficiently
  const pagesUrl = new URL(targetPath + url.search, 'https://4ab668d0.techflunky.pages.dev');

  try {
    // Optimized proxy request with minimal overhead
    const response = await fetch(pagesUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      redirect: 'manual'
    });

    // Stream response directly with minimal copying
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        ...Object.fromEntries(response.headers.entries()),
        // Add cache headers for performance
        'Cache-Control': response.headers.get('Cache-Control') || 'public, max-age=300',
        // Add routing identification
        'X-Routed-By': 'techflunky-dispatch'
      }
    });

  } catch (error) {
    console.error('Pages proxy error:', error);

    // Optimized fallback with proper error handling
    return new Response(getErrorPage(url.pathname), {
      status: 503,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache'
      }
    });
  }
}

// Optimized error page generation
function getErrorPage(pathname: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>TechFlunky - Service Temporarily Unavailable</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 2rem; background: #000; color: #fff; }
    .container { max-width: 600px; margin: 0 auto; }
    h1 { color: #fbbf24; }
  </style>
</head>
<body>
  <div class="container">
    <h1>TechFlunky Platform</h1>
    <p>Service temporarily unavailable. Please try again in a moment.</p>
    <p><small>Route: ${pathname}</small></p>
  </div>
</body>
</html>`;
}