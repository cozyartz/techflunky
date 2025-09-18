---
title: Tenant Isolation API
description: Multi-tenant API design with complete data separation and security
---

# Tenant Isolation API

TechFlunky's API is built with **complete tenant isolation** using Workers for Platforms architecture. Every API request is automatically filtered by tenant context to ensure complete data separation.

## Authentication & Tenant Context

### JWT Token Structure

All authenticated requests use JWT tokens containing tenant information:

```json
{
  "sub": "user_123",
  "email": "seller@example.com",
  "role": "seller",
  "tier": "pro",
  "sessionId": "session_456",
  "permissions": ["seller:read", "seller:write", "platform:create"],
  "securityLevel": 2,
  "tenantId": "seller_123",
  "tenantType": "seller",
  "iat": 1640995200,
  "exp": 1643587200,
  "iss": "techflunky.com",
  "aud": "techflunky-users"
}
```

### Tenant Headers

Alternative tenant specification via headers:

```http
X-Tenant-ID: seller_123
X-Tenant-Type: seller
Authorization: Bearer <jwt_token>
```

## Tenant Types

### Seller Tenants

**Tenant ID Format**: `seller_{user_id}`
**Permissions**:
- `seller:read` - Read own data
- `seller:write` - Modify own data
- `platform:create` - Create platforms
- `platform:manage` - Manage own platforms

**Data Access**:
- Can only see their own listings, offers, and analytics
- Cannot access other sellers' data
- Can see public buyer information for their offers

### Buyer Tenants

**Tenant ID Format**: `buyer_{user_id}`
**Permissions**:
- `buyer:read` - Read own data
- `platform:browse` - Browse active platforms
- `offer:create` - Create purchase offers

**Data Access**:
- Can see all active/public platform listings
- Can only see their own offers and purchases
- Cannot access seller private data

### Admin Tenants

**Tenant ID Format**: `admin_{user_id}`
**Permissions**:
- `admin:*` - Full platform access
- Cross-tenant read/write capabilities
- System administration functions

## API Endpoints with Tenant Isolation

### Listings API

**Endpoint**: `GET /api/listings`

**Tenant Behavior**:
```javascript
// Seller context - sees only their listings
GET /api/listings
Headers: X-Tenant-Type: seller, X-Tenant-ID: seller_123
Response: { listings: [...own listings...], tenant: { id: "seller_123", type: "seller" } }

// Buyer context - sees all active listings
GET /api/listings
Headers: X-Tenant-Type: buyer, X-Tenant-ID: buyer_456
Response: { listings: [...all active listings...], tenant: { id: "buyer_456", type: "buyer" } }

// Public access - sees all active listings
GET /api/listings
Response: { listings: [...all active listings...], tenant: null }
```

**Database Query Logic**:
```sql
-- Seller query
SELECT * FROM listings WHERE seller_id = ? AND seller_id = 'seller_123'

-- Buyer/Public query
SELECT * FROM listings WHERE status = 'active'
```

### Platform Creation API

**Endpoint**: `POST /api/platform/create`

**Authentication**: Required (Seller permissions)

**Request**:
```http
POST /api/platform/create
Authorization: Bearer <seller_jwt>
Content-Type: application/json

{
  "name": "AI Social Platform",
  "description": "Complete AI-powered social media platform",
  "category": "social",
  "price": 25000,
  "technologies": ["React", "Node.js", "PostgreSQL"],
  "features": ["User management", "AI content", "Analytics"]
}
```

**Tenant Sanitization**:
```javascript
// Automatic tenant data injection
const sanitizedData = {
  ...requestData,
  seller_id: tenant.sellerId, // Automatically set from token
  created_by: tenant.userId,
  tenant_context: tenant.id
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "platform_789",
    "seller_id": "seller_123",
    "name": "AI Social Platform",
    "status": "draft"
  },
  "tenant": {
    "id": "seller_123",
    "type": "seller"
  }
}
```

### Authentication APIs

**Endpoint**: `POST /api/auth/login`

**Login Process**:
1. Validate credentials
2. Create tenant context based on user role
3. Generate JWT with tenant information
4. Set secure session cookie

**Response**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "seller@example.com",
      "role": "seller"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tenant": {
      "id": "seller_123",
      "type": "seller",
      "permissions": ["seller:read", "seller:write", "platform:create"]
    }
  }
}
```

## Data Isolation Middleware

### Automatic Query Filtering

All database queries are automatically filtered by tenant context:

```javascript
// Before tenant isolation
const listings = await DB.prepare('SELECT * FROM listings').all();

// After tenant isolation
const listings = await DB.prepare(`
  SELECT * FROM listings
  WHERE ${tenant.type === 'seller' ? 'seller_id = ?' : 'status = ?'}
`).bind(tenant.type === 'seller' ? tenant.sellerId : 'active').all();
```

### Permission Validation

Every API operation validates tenant permissions:

```javascript
// Check tenant permissions
if (!validateTenantAccess(tenant, 'platform', platformId, 'read')) {
  return new Response('Insufficient permissions', { status: 403 });
}

// Permission matrix
const permissions = {
  'seller': ['platform:create', 'platform:manage', 'seller:read', 'seller:write'],
  'buyer': ['platform:browse', 'offer:create', 'buyer:read'],
  'admin': ['*']
};
```

### Data Sanitization

All input/output is sanitized for tenant context:

```javascript
// Input sanitization
function sanitizeForTenant(data, tenant, resourceType) {
  const sanitized = { ...data };

  if (resourceType === 'platform' && tenant.type === 'seller') {
    sanitized.seller_id = tenant.sellerId; // Force correct seller
    delete sanitized.admin_fields; // Remove admin-only fields
  }

  return sanitized;
}

// Output filtering
function filterForTenant(data, tenant, resourceType) {
  if (tenant.type === 'buyer' && resourceType === 'platform') {
    // Remove sensitive seller information
    delete data.seller_contact;
    delete data.internal_notes;
  }

  return data;
}
```

## Rate Limiting by Tenant

### Per-Tenant Limits

```javascript
const TENANT_RATE_LIMITS = {
  'seller': {
    requests: 1000,
    window: 3600, // 1 hour
    burst: 100
  },
  'buyer': {
    requests: 500,
    window: 3600,
    burst: 50
  },
  'platform': {
    requests: 100,
    window: 3600,
    burst: 20
  }
};
```

### Rate Limit Headers

Responses include rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640999999
X-RateLimit-Tenant: seller_123
```

### Rate Limit Exceeded

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 300
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640999999

{
  "error": "Rate limit exceeded",
  "tenant": "seller_123",
  "limit": 1000,
  "window": 3600,
  "resetTime": "2025-01-01T01:00:00Z"
}
```

## Security Features

### Cross-Tenant Protection

Prevents access to other tenants' data:

```javascript
// Automatic tenant validation
app.use('/api/', async (request, response, next) => {
  const tenant = extractTenantContext(request);
  const resourceId = request.params.id;

  // Verify tenant can access this resource
  if (!await validateResourceAccess(tenant, resourceId)) {
    return response.status(403).json({
      error: 'Resource not found or access denied',
      tenant: tenant.id
    });
  }

  next();
});
```

### Audit Logging

All tenant operations are logged:

```javascript
await logSecurityEvent({
  type: 'data_access',
  tenant: tenant.id,
  resource: 'platform',
  action: 'read',
  resourceId: platformId,
  ipAddress: request.ip,
  userAgent: request.headers['User-Agent'],
  timestamp: new Date().toISOString()
});
```

### Input Validation

Tenant-aware input validation:

```javascript
// Validate tenant can create this type of resource
if (resourceType === 'platform' && tenant.type !== 'seller') {
  return response.status(403).json({
    error: 'Only sellers can create platforms',
    tenant: tenant.id,
    requiredRole: 'seller'
  });
}
```

## Error Handling

### Tenant-Specific Errors

```json
{
  "error": "Resource not found",
  "code": "RESOURCE_NOT_FOUND",
  "tenant": {
    "id": "seller_123",
    "type": "seller"
  },
  "details": {
    "resource": "platform",
    "id": "platform_456",
    "reason": "Not owned by tenant or does not exist"
  }
}
```

### Permission Errors

```json
{
  "error": "Insufficient permissions",
  "code": "PERMISSION_DENIED",
  "tenant": {
    "id": "buyer_789",
    "type": "buyer"
  },
  "required": {
    "permission": "platform:create",
    "role": "seller"
  }
}
```

## Testing Tenant Isolation

### Test with Different Tenants

```bash
# Test as seller
curl -H "Authorization: Bearer <seller_jwt>" \
     https://techflunky.com/api/listings

# Test as buyer
curl -H "Authorization: Bearer <buyer_jwt>" \
     https://techflunky.com/api/listings

# Test with explicit tenant headers
curl -H "X-Tenant-ID: seller_123" \
     -H "X-Tenant-Type: seller" \
     https://techflunky.com/api/listings
```

### Verify Data Isolation

```bash
# Seller should only see their own platforms
curl -H "Authorization: Bearer <seller_jwt>" \
     https://techflunky.com/api/platforms/my-platforms

# Buyer should see all active platforms
curl -H "Authorization: Bearer <buyer_jwt>" \
     https://techflunky.com/api/platforms/browse
```

### Test Cross-Tenant Access Prevention

```bash
# Try to access another seller's platform (should fail)
curl -H "Authorization: Bearer <seller_jwt>" \
     https://techflunky.com/api/platforms/other-seller-platform-id

# Expected: 403 Forbidden or 404 Not Found
```

---

This tenant isolation system ensures complete data separation while maintaining a unified API experience, delivering enterprise-grade security with sub-100ms performance across 200+ global edge locations.