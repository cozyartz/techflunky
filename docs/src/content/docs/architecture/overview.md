---
title: Platform Architecture
description: Technical overview of TechFlunky's Workers for Platforms multi-tenant SaaS architecture
---

# Platform Architecture

TechFlunky is built on **Cloudflare Workers for Platforms**, delivering enterprise-grade multi-tenant SaaS architecture with complete tenant isolation and sub-100ms global response times.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TechFlunky Platform                                 │
│                    (Workers for Platforms Architecture)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐     ┌──────────────────────┐    ┌────────────────┐     │
│  │   Web Frontend  │     │   Dispatch Worker    │    │  Shared Assets │     │
│  │  (Astro+React) │────▶│  (techflunky.com)   │    │ (CDN/R2/Pages) │     │
│  └─────────────────┘     └──────────┬───────────┘    └────────────────┘     │
│           │                         │                          │           │
│           │                         ▼                          │           │
│           │              ┌──────────────────────┐              │           │
│           │              │  Dispatch Namespace  │              │           │
│           │              │ "techflunky-tenants" │              │           │
│           │              └──────────┬───────────┘              │           │
│           │                         │                          │           │
│           ▼                         ▼                          ▼           │
│  ┌─────────────────┐       ┌────────────────┐       ┌────────────────┐     │
│  │   Security &    │       │  Tenant Worker │       │   Shared D1    │     │
│  │  Auth Systems   │       │ (Per Seller/   │       │   Database     │     │
│  │ (JWT/Sessions)  │       │    Buyer)      │       │ (Multi-tenant) │     │
│  └─────────────────┘       └────────────────┘       └────────────────┘     │
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

### 1. Dispatch Worker (techflunky-dispatch)

The dispatch Worker handles all incoming requests and routes them to appropriate tenant Workers.

**Key Features:**
- **Tenant Routing**: Automatically identifies tenants via subdomains or JWT tokens
- **Security Layer**: JWT validation, CSRF protection, rate limiting
- **Request Distribution**: Routes to tenant-specific Workers in the dispatch namespace
- **Performance**: Sub-100ms routing with global edge deployment

**Routing Logic:**
```javascript
// Subdomain routing
seller.techflunky.com → Seller tenant context
buyer.techflunky.com → Buyer tenant context
techflunky.com → Platform routes

// JWT token routing
Authorization: Bearer <jwt> → Extract tenant from token
X-Tenant-ID: seller_123 → Direct tenant specification
```

### 2. Dispatch Namespace (techflunky-tenants)

Workers for Platforms dispatch namespace providing complete tenant isolation.

**Features:**
- **Namespace ID**: `d8b3a365-023e-4b01-8a26-3035aae4b14f`
- **Complete Isolation**: Each tenant runs in isolated execution context
- **Resource Separation**: No cross-tenant access to data or resources
- **Automatic Scaling**: Scales to millions of tenants without configuration

### 3. User Worker (techflunky-user-worker)

Deployed to the dispatch namespace, handles tenant-specific business logic.

**Version**: `f1bad42a-3ec5-48f2-8bfd-ed4a6870a94b`

**Responsibilities:**
- Process tenant-specific API requests
- Enforce tenant data isolation
- Handle seller/buyer specific workflows
- Manage tenant-scoped database queries

### 4. Tenant Isolation Middleware

Comprehensive middleware system ensuring complete data separation.

**Security Features:**
- **Database Query Filtering**: All queries automatically filtered by tenant context
- **Data Sanitization**: Input/output sanitized for tenant context
- **Permission Validation**: Every operation checked against tenant permissions
- **Cross-Tenant Prevention**: Impossible to access other tenant's data

## Multi-Tenant Security

### Authentication & Authorization

**JWT Management:**
- Secrets stored in Cloudflare secret store
- 30-day session expiration
- Role-based access (Admin, Seller, Buyer, Investor)
- MFA support ready

**Session Security:**
```javascript
// Production JWT configuration
JWT_SECRET: Stored in Cloudflare secret store
ENCRYPTION_KEY: AES-256-GCM encryption
SESSION_DURATION: 30 days
SECURITY_LEVEL: Enterprise-grade
```

### Data Isolation

**Database Architecture:**
```sql
-- Automatic tenant filtering on all queries
SELECT * FROM listings WHERE seller_id = ? -- Seller context
SELECT * FROM listings WHERE status = 'active' -- Buyer context
SELECT * FROM offers WHERE seller_id = ? OR buyer_id = ? -- Cross-tenant for offers
```

**Access Control Matrix:**
```
Resource     | Seller | Buyer | Admin | Guest
-------------|--------|-------|-------|-------
Own Data     | RW     | RW    | RW    | -
Others Data  | -      | R*    | RW    | R*
Platform     | R      | R     | RW    | R
Admin        | -      | -     | RW    | -
```
*R = Read, W = Write, * = Public data only

### Rate Limiting

**Per-Tenant Limits:**
- **Sellers**: 1,000 requests/hour, 100 burst
- **Buyers**: 500 requests/hour, 50 burst
- **Platform**: 100 requests/hour, 20 burst
- **Authentication**: Stricter limits on auth endpoints

## Performance Architecture

### Edge Computing Benefits

**Global Distribution:**
- **200+ Locations**: Cloudflare's global network
- **Sub-100ms Response**: Edge computing with automatic routing
- **99.99% Uptime**: Enterprise SLA with automatic failover
- **Automatic Scaling**: No capacity planning required

**Performance Metrics:**
```
Response Time: <100ms (95th percentile)
Availability: 99.99% SLA
Throughput: Millions of requests/day
Cold Starts: None (always warm)
```

### Database Strategy

**Cloudflare D1 (SQLite):**
- Multi-tenant with automatic filtering
- Global replication
- Automatic backups
- ACID compliance

**Storage Architecture:**
```
D1 Database: Core platform data
R2 Storage: Files, assets, media
KV Store: Caching, sessions
Analytics Engine: Metrics, events
```

## Deployment Architecture

### Infrastructure Components

**Production Stack:**
```yaml
Dispatch Worker: techflunky-dispatch
  Routes:
    - techflunky.com/*
    - "*.techflunky.com/*"

User Worker: techflunky-user-worker
  Namespace: techflunky-tenants
  Isolation: Complete tenant separation

Database: Cloudflare D1
  Name: techflunky-db
  ID: 330b8406-f05f-4e5b-966a-a58fcd2ba3d1

Storage: Cloudflare R2
  Bucket: techflunky-assets

Documentation: docs.techflunky.com
  Stack: Astro + Starlight
```

### Security Configuration

**Secret Management:**
```bash
# Production secrets in Cloudflare secret store
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put MAILERSEND_API_KEY
```

**Environment Separation:**
- **Development**: Local environment variables
- **Production**: Cloudflare secret store
- **Testing**: Isolated test environment

## Scalability Design

### Horizontal Scaling

**Auto-Scaling Features:**
- **Worker Scaling**: Automatic based on request volume
- **Database Scaling**: D1 auto-scales with global replication
- **Storage Scaling**: R2 unlimited capacity
- **CDN Scaling**: Global edge network automatically handles traffic

### Cost Efficiency

**Economic Benefits:**
- **60-80% Lower Hosting**: Compared to traditional cloud providers
- **No Infrastructure Management**: Serverless with zero maintenance
- **Pay-per-Request**: Only pay for actual usage
- **Global Distribution**: Included in base pricing

## Monitoring & Observability

### Platform Metrics

**Key Performance Indicators:**
```javascript
// Real-time monitoring
Response Time: Average, P95, P99
Error Rate: 4xx, 5xx by endpoint
Throughput: Requests per second
Tenant Activity: Active tenants, usage patterns
Security Events: Auth failures, suspicious activity
```

**Alerts Configuration:**
- Response time >500ms
- Error rate >1%
- Security incidents
- Resource utilization >80%

### Business Intelligence

**Analytics Tracking:**
- User engagement and retention
- Platform revenue and growth
- Tenant resource usage
- Performance optimization opportunities

## Disaster Recovery

### Backup Strategy

**Automated Backups:**
- **Database**: Daily D1 backups with 30-day retention
- **Code**: Git-based version control with branch protection
- **Secrets**: Cloudflare secret store redundancy
- **Configuration**: Infrastructure as code in repository

### Incident Response

**Recovery Procedures:**
1. **Detection**: Automated monitoring alerts
2. **Assessment**: On-call engineer response within 15 minutes
3. **Mitigation**: Automatic failover and traffic routing
4. **Resolution**: Fix deployment with rollback capability
5. **Post-Mortem**: Root cause analysis and prevention

## Future Architecture

### Planned Enhancements

**Roadmap Items:**
- **Multi-Cloud Support**: AWS, GCP deployment options
- **Advanced Analytics**: Real-time business intelligence
- **API Rate Optimization**: Per-tenant rate limit customization
- **Global Load Balancing**: Advanced traffic management
- **Compliance Certifications**: SOC 2, ISO 27001

### Scaling Strategy

**Growth Preparation:**
- Database sharding for extreme scale
- Multi-region active-active deployment
- Advanced caching strategies
- Performance optimization automation

---

This architecture delivers enterprise-grade performance with the industry's lowest marketplace fee at 8%, compared to 15-20% for competitors, while maintaining complete tenant isolation and sub-100ms global response times.