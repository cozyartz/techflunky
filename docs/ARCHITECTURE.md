# Architecture Overview

## Workers for Platforms Multi-Tenant SaaS Architecture

TechFlunky is built on **Cloudflare Workers for Platforms**, providing true multi-tenant SaaS architecture with complete tenant isolation. This enterprise-grade system delivers sub-100ms global response times while maintaining the industry's lowest marketplace fee at 8%.

```
┌───────────────────────────────────────────────────────────────────────────┐
│                          TechFlunky Platform                                │
│                    (Workers for Platforms Architecture)                    │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌──────────────────────┐    ┌────────────────┐  │
│  │   Web Frontend  │     │   Dispatch Worker    │    │  Shared Assets │  │
│  │  (Astro+React) │────▶│  (techflunky.com)   │    │ (CDN/R2/Pages) │  │
│  └─────────────────┘     └──────────┬───────────┘    └────────────────┘  │
│           │                         │                          │           │
│           │                         ▼                          │           │
│           │              ┌──────────────────────┐              │           │
│           │              │  Dispatch Namespace  │              │           │
│           │              │ "techflunky-tenants" │              │           │
│           │              └──────────┬───────────┘              │           │
│           │                         │                          │           │
│           ▼                         ▼                          ▼           │
│  ┌─────────────────┐       ┌────────────────┐       ┌────────────────┐   │
│  │   Security &    │       │  Tenant Worker │       │   Shared D1    │   │
│  │  Auth Systems   │       │ (Per Seller/   │       │   Database     │   │
│  │ (JWT/Sessions)  │       │    Buyer)      │       │ (Multi-tenant) │   │
│  └─────────────────┘       └────────────────┘       └────────────────┘   │
│                                      │                        │           │
│                                      ▼                        │           │
│                           ┌─────────────────────┐            │           │
│                           │  Tenant Isolation   │            │           │
│                           │    Middleware       │            │           │
│                           │ (Data Separation)   │            │           │
│                           └─────────────────────┘            │           │
│                                      │                        │           │
└──────────────────────────────────────┼────────────────────────┼───────────┘
                                       │                        │
                                       ▼                        ▼
                            ┌─────────────────────┐  ┌─────────────────────┐
                            │  Seller Subdomain  │  │  Buyer Subdomain   │
                            │ seller.techflunky   │  │ buyer.techflunky    │
                            │     .com/*          │  │     .com/*          │
                            └─────────────────────┘  └─────────────────────┘
```

## Core Components

### 1. Frontend (Astro + React)

The frontend is built with Astro for optimal performance and React for interactive components.

**Key Features:**
- Server-side rendering for SEO
- Partial hydration for performance
- Tailwind CSS for styling
- TypeScript for type safety

**Main Pages:**
- `/` - Homepage
- `/browse` - Marketplace browser
- `/listing/[slug]` - Individual business package
- `/dashboard/deploy` - Deployment interface
- `/seller/onboarding` - Seller registration

### 2. Workers for Platforms Multi-Tenant System

**Dispatch Worker (techflunky-dispatch)**
- Routes requests to tenant-specific Workers
- Handles subdomain routing (`seller.techflunky.com`, `buyer.techflunky.com`)
- JWT token validation and tenant identification
- Security and rate limiting

**User Worker (techflunky-user-worker)**
- Deployed to `techflunky-tenants` dispatch namespace
- Complete tenant isolation
- Per-tenant data access controls
- Seller/buyer specific business logic

**API Endpoints with Tenant Isolation:**
- `GET /api/listings` - Tenant-filtered marketplace data
- `POST /api/platform/create` - Seller platform creation
- `POST /api/auth/login` - Multi-tenant authentication
- `POST /api/auth/register` - Tenant-aware registration
- `GET /api/investors/performance` - Isolated investor data

### 3. Deployment System

The deployment system automates the entire process of setting up a business on the buyer's Cloudflare account.

**Components:**
- `BusinessDeploymentManager` - Orchestrates deployment
- `CloudflareForSaaSManager` - Handles custom domains
- `PackageBuilder` - Creates and validates packages

**Deployment Flow:**
1. Verify buyer's Cloudflare credentials
2. Create namespace for isolation
3. Deploy Workers with code
4. Create D1 databases and run migrations
5. Set up R2 buckets with CORS
6. Configure custom domain or subdomain
7. Set up DNS records
8. Configure environment variables
9. Run post-deployment scripts

### 4. Package Management

Packages are self-contained business solutions with all necessary components.

**Package Structure:**
```
{
  "id": "unique_id",
  "name": "Business Name",
  "slug": "url-slug",
  "version": "1.0.0",
  "cloudflare": {
    "workers": [...],
    "d1_databases": [...],
    "r2_buckets": [...],
    "dns_records": [...]
  },
  "businessAssets": {
    "marketResearch": "path/to/research.pdf",
    "businessPlan": "path/to/plan.pdf"
  }
}
```

### 5. Payment Processing

Stripe Connect handles all payment processing with platform fees.

**Payment Flow:**
1. Buyer initiates purchase
2. Stripe checkout session created
3. Payment processed with 15% platform fee
4. Funds held for 3-day review period
5. After review, funds released to seller
6. Platform fee retained by Autimind, Inc.

## Security Architecture

### Multi-Tenant Security
- **Complete Tenant Isolation**: Database queries filtered by tenant context
- **Request-Level Validation**: Every API call validates tenant permissions
- **Data Sanitization**: All input/output sanitized for tenant context
- **JWT Secret Management**: Stored in Cloudflare secret store
- **CSRF Protection**: Enhanced token validation
- **Rate Limiting**: Per-tenant limits (sellers: 1000/hr, buyers: 500/hr)

### Workers for Platforms Security
- **Dispatch Namespace Isolation**: `techflunky-tenants` provides complete separation
- **Subdomain Routing**: Automatic tenant identification via subdomains
- **Environment Isolation**: Separate runtime contexts per tenant
- **Resource Access Control**: Tenant-scoped database and storage access

### Authentication & Authorization
- **JWT Token Management**: Production secrets in Cloudflare secret store
- **Session Management**: Secure session tokens with 30-day expiration
- **Role-Based Access**: Admin, Seller, Buyer, Investor permissions
- **MFA Support**: Multi-factor authentication ready
- **Password Security**: bcrypt hashing with 12 salt rounds

### Data Protection
- **Encryption**: All data encrypted at rest and in transit
- **TLS 1.3**: Latest security protocols
- **No Cross-Tenant Access**: Strict data isolation
- **Audit Logging**: Comprehensive security event tracking
- **GDPR Compliance**: Privacy by design implementation

## Scalability

### Edge Computing
- Workers run at 200+ locations
- Automatic global distribution
- No cold starts
- Scales to millions of requests

### Database Strategy
- D1 for relational data
- KV for caching
- R2 for object storage
- Durable Objects for state

### Performance Optimization
- Static assets on CDN
- Aggressive caching
- Lazy loading
- Code splitting

## Monitoring

### Platform Monitoring
- Cloudflare Analytics
- Custom metrics in Workers
- Error tracking
- Performance monitoring

### Business Monitoring
- Deployment success rates
- API response times
- Payment processing
- User engagement

## Disaster Recovery

### Backup Strategy
- Daily backups of platform data
- Package versioning
- Deployment rollback capability
- Multi-region redundancy

### Incident Response
1. Automated alerts
2. On-call rotation
3. Runbook procedures
4. Post-mortem process

## Future Architecture

### Planned Enhancements
- Multi-cloud deployment support
- Kubernetes package options
- Blockchain verification
- AI-powered optimization
- Real-time collaboration

### Scaling Strategy
- Horizontal scaling via Workers
- Database sharding if needed
- Multi-tenant optimization
- Edge caching improvements
