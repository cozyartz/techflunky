// Tenant Isolation Middleware for Workers for Platforms
// Provides secure multi-tenant data access and validation

export interface TenantContext {
  id: string;
  type: 'seller' | 'buyer' | 'platform';
  sellerId?: string;
  userId?: string;
  permissions: string[];
}

export interface TenantRequest extends Request {
  tenant?: TenantContext;
}

// Extract tenant context from request headers
export function extractTenantContext(request: Request): TenantContext | null {
  if (!request || !request.headers) {
    return null;
  }

  const tenantId = request.headers.get('X-Tenant-ID');
  const tenantType = request.headers.get('X-Tenant-Type');

  if (!tenantId || !tenantType) {
    return null;
  }

  const context: TenantContext = {
    id: tenantId,
    type: tenantType as 'seller' | 'buyer' | 'platform',
    permissions: []
  };

  // Extract specific IDs based on tenant type
  if (tenantType === 'seller' && tenantId.startsWith('seller_')) {
    context.sellerId = tenantId.replace('seller_', '');
    context.userId = context.sellerId;
    context.permissions = ['seller:read', 'seller:write', 'platform:create', 'platform:manage'];
  } else if (tenantType === 'buyer' && tenantId.startsWith('buyer_')) {
    context.userId = tenantId.replace('buyer_', '');
    context.permissions = ['buyer:read', 'platform:browse', 'offer:create'];
  }

  return context;
}

// Validate tenant access to resource
export function validateTenantAccess(
  tenant: TenantContext | null,
  resourceType: string,
  resourceId?: string,
  action: string = 'read'
): boolean {
  if (!tenant) {
    return false;
  }

  const permission = `${resourceType}:${action}`;

  // Check if tenant has required permission
  if (!tenant.permissions.includes(permission)) {
    return false;
  }

  // Additional validation for specific resources
  switch (resourceType) {
    case 'seller':
      // Sellers can only access their own data
      return tenant.type === 'seller' && (!resourceId || resourceId === tenant.sellerId);

    case 'platform':
      // Sellers can manage their own platforms, buyers can browse active ones
      if (tenant.type === 'seller') {
        return action === 'create' || !resourceId; // Will be validated at DB level
      }
      return tenant.type === 'buyer' && action === 'read';

    case 'listing':
      // Similar to platform
      return validateTenantAccess(tenant, 'platform', resourceId, action);

    default:
      return true;
  }
}

// Create tenant-aware database query
export function createTenantQuery(
  tenant: TenantContext | null,
  baseQuery: string,
  tableName: string
): { query: string; params: any[] } {
  const params: any[] = [];

  if (!tenant) {
    // No tenant context - return public data only
    if (tableName === 'listings') {
      return {
        query: `${baseQuery} WHERE status = 'active'`,
        params
      };
    }
    return { query: baseQuery, params };
  }

  let whereClause = '';

  switch (tableName) {
    case 'listings':
    case 'business_blueprints':
      if (tenant.type === 'seller') {
        // Sellers see only their own listings
        whereClause = ' WHERE seller_id = ?';
        params.push(tenant.sellerId);
      } else {
        // Buyers see only active public listings
        whereClause = ' WHERE status = \'active\'';
      }
      break;

    case 'offers':
      if (tenant.type === 'seller') {
        whereClause = ' WHERE seller_id = ?';
        params.push(tenant.sellerId);
      } else if (tenant.type === 'buyer') {
        whereClause = ' WHERE buyer_id = ?';
        params.push(tenant.userId);
      }
      break;

    case 'messages':
      // Messages require offer context
      whereClause = ' WHERE offer_id IN (SELECT id FROM offers WHERE seller_id = ? OR buyer_id = ?)';
      params.push(tenant.userId, tenant.userId);
      break;

    case 'reviews':
      whereClause = ' WHERE reviewer_id = ? OR reviewed_id = ?';
      params.push(tenant.userId, tenant.userId);
      break;

    case 'favorites':
      whereClause = ' WHERE user_id = ?';
      params.push(tenant.userId);
      break;

    case 'analytics':
      if (tenant.type === 'seller') {
        whereClause = ' WHERE user_id = ?';
        params.push(tenant.userId);
      }
      break;

    case 'users':
    case 'profiles':
      // Users can only access their own profile
      whereClause = ' WHERE id = ?';
      params.push(tenant.userId);
      break;

    default:
      // For other tables, apply basic user filtering if applicable
      if (tenant.userId) {
        whereClause = ' WHERE user_id = ?';
        params.push(tenant.userId);
      }
  }

  // Combine base query with tenant filtering
  const query = baseQuery.includes(' WHERE ')
    ? `${baseQuery} AND ${whereClause.substring(7)}` // Remove ' WHERE ' prefix
    : `${baseQuery}${whereClause}`;

  return { query, params };
}

// Tenant-aware middleware for API routes
export function withTenantIsolation(
  handler: (request: TenantRequest, locals: any, ctx: ExecutionContext, tenant: TenantContext | null) => Promise<Response>
) {
  return async ({ request, locals }: { request: Request; locals: any }): Promise<Response> => {
    const tenant = extractTenantContext(request);

    // Add tenant context to request
    const tenantRequest = request as TenantRequest;
    tenantRequest.tenant = tenant || undefined;

    try {
      return await handler(tenantRequest, locals, {} as ExecutionContext, tenant);
    } catch (error) {
      console.error('Tenant isolation error:', error);
      return new Response('Tenant access error', { status: 500 });
    }
  };
}

// Validate and sanitize data for tenant context
export function sanitizeForTenant(
  data: any,
  tenant: TenantContext | null,
  resourceType: string
): any {
  if (!data || !tenant) {
    return data;
  }

  // Clone data to avoid mutations
  const sanitized = JSON.parse(JSON.stringify(data));

  switch (resourceType) {
    case 'listing':
    case 'platform':
      // Ensure seller_id matches tenant for sellers
      if (tenant.type === 'seller') {
        sanitized.seller_id = tenant.sellerId;
      }
      break;

    case 'offer':
      // Ensure proper IDs based on tenant type
      if (tenant.type === 'seller') {
        sanitized.seller_id = tenant.sellerId;
      } else if (tenant.type === 'buyer') {
        sanitized.buyer_id = tenant.userId;
      }
      break;

    case 'user':
    case 'profile':
      // Ensure user can only modify their own data
      sanitized.id = tenant.userId;
      sanitized.user_id = tenant.userId;
      break;
  }

  return sanitized;
}

// Database wrapper with automatic tenant isolation
export class TenantDatabase {
  constructor(
    private db: D1Database,
    private tenant: TenantContext | null
  ) {}

  async prepare(query: string, tableName?: string) {
    if (!tableName) {
      // If no table specified, use query as-is (for simple queries)
      return this.db.prepare(query);
    }

    const { query: tenantQuery, params } = createTenantQuery(this.tenant, query, tableName);

    return {
      bind: (...additionalParams: any[]) => {
        return this.db.prepare(tenantQuery).bind(...params, ...additionalParams);
      },
      all: () => this.db.prepare(tenantQuery).bind(...params).all(),
      first: () => this.db.prepare(tenantQuery).bind(...params).first(),
      run: () => this.db.prepare(tenantQuery).bind(...params).run()
    };
  }

  // Direct access to underlying database for complex queries
  raw() {
    return this.db;
  }
}

// Create tenant-aware database instance
export function createTenantDb(db: D1Database, tenant: TenantContext | null): TenantDatabase {
  return new TenantDatabase(db, tenant);
}

// Rate limiting by tenant
export interface TenantRateLimit {
  requests: number;
  window: number; // in seconds
  burst?: number;
}

export const TENANT_RATE_LIMITS: Record<string, TenantRateLimit> = {
  'seller': { requests: 1000, window: 3600, burst: 100 }, // 1000/hour, burst 100
  'buyer': { requests: 500, window: 3600, burst: 50 },    // 500/hour, burst 50
  'platform': { requests: 100, window: 3600, burst: 20 } // 100/hour, burst 20
};

export async function checkTenantRateLimit(
  tenant: TenantContext | null,
  cache: KVNamespace
): Promise<boolean> {
  if (!tenant || !cache) {
    return true; // Allow if no tenant context or cache
  }

  const limits = TENANT_RATE_LIMITS[tenant.type];
  if (!limits) {
    return true;
  }

  const key = `rate_limit:${tenant.id}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - limits.window;

  try {
    const current = await cache.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= limits.requests) {
      return false; // Rate limit exceeded
    }

    // Increment counter
    await cache.put(key, (count + 1).toString(), { expirationTtl: limits.window });
    return true;

  } catch (error) {
    console.warn('Rate limit check failed:', error);
    return true; // Allow on error
  }
}