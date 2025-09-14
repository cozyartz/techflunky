# Architecture Overview

## System Architecture

TechFlunky is built on a modern, serverless architecture leveraging Cloudflare's global network for maximum performance and scalability.

```
┌─────────────────────────────────────────────────────────────────┐
│                         TechFlunky Platform                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐     ┌─────────────────┐    ┌────────────┐ │
│  │   Web Frontend  │     │   API Gateway   │    │  Database  │ │
│  │  (Astro+React) │────▶│ (CF Workers)    │───▶│   (D1)     │ │
│  └─────────────────┘     └─────────────────┘    └────────────┘ │
│           │                        │                     │       │
│           │                        │                     │       │
│           ▼                        ▼                     ▼       │
│  ┌─────────────────┐     ┌─────────────────┐    ┌────────────┐ │
│  │  Static Assets  │     │ Payment Handler │    │  Storage   │ │
│  │  (CF Pages)     │     │ (Stripe Connect)│    │   (R2)     │ │
│  └─────────────────┘     └─────────────────┘    └────────────┘ │
│                                    │                             │
│                                    ▼                             │
│                          ┌─────────────────┐                    │
│                          │   Deployment    │                    │
│                          │    Manager      │                    │
│                          └─────────────────┘                    │
│                                    │                             │
└────────────────────────────────────┼─────────────────────────────┘
                                     │
                                     ▼
                          ┌─────────────────┐
                          │  Buyer's        │
                          │  Cloudflare     │
                          │  Account        │
                          └─────────────────┘
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

### 2. API Gateway (Cloudflare Workers)

All API requests are handled by edge Workers for minimal latency.

**Endpoints:**
- `POST /api/checkout/create-session` - Create Stripe checkout
- `POST /api/checkout/webhook` - Handle Stripe webhooks
- `POST /api/deploy` - Deploy package to buyer's account
- `GET /api/deploy?deploymentId=X` - Check deployment status
- `POST /api/seller/create-account` - Create seller account

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

### API Token Handling
- Tokens are never stored
- Used only during deployment
- Scoped to minimum permissions
- Transmitted over HTTPS only

### Isolation
- Each deployment is isolated
- No cross-account access
- Separate namespaces per business
- Independent DNS configuration

### Data Protection
- All data encrypted at rest
- TLS 1.3 for all connections
- No sensitive data in logs
- GDPR compliant

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
