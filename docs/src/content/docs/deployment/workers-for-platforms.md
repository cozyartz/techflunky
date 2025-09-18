---
title: Workers for Platforms Deployment
description: Complete guide to deploying TechFlunky's multi-tenant SaaS architecture
---

# Workers for Platforms Deployment

This guide covers deploying TechFlunky's **Workers for Platforms** architecture for true multi-tenant SaaS with complete tenant isolation.

## Prerequisites

### Required Accounts & Plans
- **Cloudflare Workers Paid Plan** ($5/month minimum)
- **Workers for Platforms** ($25/month for dispatch namespaces)
- **Cloudflare D1** (included with Workers Paid)
- **Cloudflare R2** (pay-as-you-go storage)

### Development Environment
```bash
# Required tools
Node.js 18+
Wrangler CLI 3.x+
Git
npm or yarn

# Verify installations
node --version
wrangler --version
git --version
```

## Step 1: Clone and Setup

### Repository Setup
```bash
# Clone the repository
git clone https://github.com/cozyartz/techflunky.git
cd techflunky

# Install dependencies
npm install

# Authenticate with Cloudflare
wrangler login
```

### Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your configuration
nano .env.local
```

Required environment variables:
```env
# Core Platform
SITE_URL=https://techflunky.com
ENVIRONMENT=production

# JWT & Security (use in Cloudflare secret store)
JWT_SECRET=your-super-secure-jwt-secret-min-32-chars
ENCRYPTION_KEY=another-32-character-encryption-key

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Email Service
MAILERSEND_API_KEY=your_mailersend_api_key
FROM_EMAIL=noreply@techflunky.com
ADMIN_EMAIL=admin@techflunky.com

# Feature Flags
ENABLE_AI_VALIDATION=true
ENABLE_WHITE_GLOVE_SERVICES=true
PLATFORM_COMMISSION_RATE=0.08
```

## Step 2: Create Dispatch Namespace

### Create the Namespace
```bash
# Create dispatch namespace for tenant isolation
wrangler dispatch-namespace create techflunky-tenants

# Output example:
# Created dispatch namespace: techflunky-tenants
# Namespace ID: d8b3a365-023e-4b01-8a26-3035aae4b14f
```

### Verify Namespace
```bash
# List all dispatch namespaces
wrangler dispatch-namespace list

# Should show:
# Name: techflunky-tenants
# ID: d8b3a365-023e-4b01-8a26-3035aae4b14f
```

## Step 3: Deploy Dispatch Worker

### Configure Dispatch Worker
```bash
cd workers/dispatch

# Verify wrangler.toml configuration
cat wrangler.toml
```

Ensure your `workers/dispatch/wrangler.toml` includes:
```toml
name = "techflunky-dispatch"
main = "index.ts"
compatibility_date = "2024-01-01"

# Workers for Platforms configuration
[[dispatch_namespaces]]
binding = "USER_WORKER"
namespace = "techflunky-tenants"

# Environment variables
[vars]
ENVIRONMENT = "production"
SITE_URL = "https://techflunky.com"

# Shared resource bindings
[[d1_databases]]
binding = "DB"
database_name = "techflunky-db"
database_id = "330b8406-f05f-4e5b-966a-a58fcd2ba3d1"

[[r2_buckets]]
binding = "BUCKET"
bucket_name = "techflunky-assets"

[[analytics_engine_datasets]]
binding = "ANALYTICS"

[ai]
binding = "AI"

# Route configuration
[[routes]]
pattern = "techflunky.com/*"
zone_name = "techflunky.com"

[[routes]]
pattern = "*.techflunky.com/*"
zone_name = "techflunky.com"
```

### Deploy Dispatch Worker
```bash
# Deploy to production
wrangler deploy

# Output example:
# Total Upload: 15.23 KiB / gzip: 3.45 KiB
# Your Worker has access to the following bindings:
# - D1 Databases: DB (techflunky-db)
# - R2 Buckets: BUCKET (techflunky-assets)
# - Dispatch Namespaces: USER_WORKER (techflunky-tenants)
# Published techflunky-dispatch (1.23 sec)
```

## Step 4: Deploy User Worker

### Configure User Worker
```bash
cd ../user

# Verify configuration
cat wrangler.toml
```

User Worker configuration:
```toml
name = "techflunky-user-worker"
main = "index.ts"
compatibility_date = "2024-01-01"

[vars]
ENVIRONMENT = "production"
SITE_URL = "https://techflunky.com"
```

### Deploy to Dispatch Namespace
```bash
# Deploy user Worker to dispatch namespace
wrangler deploy --dispatch-namespace techflunky-tenants

# Output example:
# Total Upload: 11.90 KiB / gzip: 2.89 KiB
# Uploaded techflunky-user (1.77 sec)
# Dispatch Namespace: techflunky-tenants
# Current Version ID: f1bad42a-3ec5-48f2-8bfd-ed4a6870a94b
```

## Step 5: Configure Production Secrets

### JWT and Security Secrets
```bash
# Return to dispatch worker directory
cd ../dispatch

# Set production secrets
wrangler secret put JWT_SECRET
# Enter: your-super-secure-jwt-secret-min-32-chars

wrangler secret put ENCRYPTION_KEY
# Enter: another-32-character-encryption-key

wrangler secret put STRIPE_SECRET_KEY
# Enter: sk_live_your_stripe_secret

wrangler secret put MAILERSEND_API_KEY
# Enter: your_mailersend_api_key
```

### Verify Secrets
```bash
# List configured secrets (names only)
wrangler secret list

# Output:
# - JWT_SECRET
# - ENCRYPTION_KEY
# - STRIPE_SECRET_KEY
# - MAILERSEND_API_KEY
```

## Step 6: Database Setup

### Create D1 Database
```bash
# Create production database
wrangler d1 create techflunky-db

# Output includes database ID - update wrangler.toml if needed
```

### Run Database Migrations
```bash
# Run schema creation
wrangler d1 execute techflunky-db --file ../../database/schema.sql

# Run seed data (optional)
wrangler d1 execute techflunky-db --file ../../database/seed.sql
```

### Verify Database
```bash
# Test database connection
wrangler d1 execute techflunky-db --command "SELECT name FROM sqlite_master WHERE type='table';"

# Should show your table structure
```

## Step 7: Storage Configuration

### Create R2 Bucket
```bash
# Create storage bucket
wrangler r2 bucket create techflunky-assets

# Configure CORS for web access
wrangler r2 bucket cors put techflunky-assets --file ../../config/cors.json
```

CORS configuration (`config/cors.json`):
```json
[
  {
    "AllowedOrigins": ["https://techflunky.com", "https://*.techflunky.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Step 8: Domain Configuration

### DNS Setup
Configure your DNS records:

```dns
# A Records
techflunky.com → Cloudflare proxy (orange cloud)
*.techflunky.com → Cloudflare proxy (orange cloud)

# CNAME Records
docs.techflunky.com → docs-techflunky-com.pages.dev
```

### SSL Configuration
1. Go to Cloudflare Dashboard → SSL/TLS
2. Set SSL mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Configure HSTS (optional but recommended)

## Step 9: Deploy Main Application

### Build and Deploy
```bash
# Return to project root
cd ../../

# Build the main application
npm run build

# Deploy to Cloudflare Pages
npm run deploy

# Or deploy manually
wrangler pages deploy dist --project-name techflunky
```

### Deploy Documentation
```bash
# Deploy docs to separate Pages project
cd docs
npm run build
wrangler pages deploy dist --project-name techflunky-docs
```

## Step 10: Testing and Verification

### Test Dispatch Routing
```bash
# Test main domain
curl -I https://techflunky.com

# Test subdomain routing
curl -I https://seller.techflunky.com

# Test API endpoints
curl https://techflunky.com/api/listings
```

### Test Tenant Isolation
```bash
# Test with tenant headers
curl -H "X-Tenant-ID: seller_123" -H "X-Tenant-Type: seller" \
     https://techflunky.com/api/listings

# Test without tenant headers (should work for public routes)
curl https://techflunky.com/api/listings
```

### Verify Security
```bash
# Test JWT endpoint (should require auth)
curl -I https://techflunky.com/api/platform/create

# Test rate limiting
for i in {1..10}; do curl -s https://techflunky.com/api/listings > /dev/null; done
```

## Step 11: Monitoring Setup

### Configure Analytics
```bash
# Set up custom analytics
wrangler analytics-engine dataset create techflunky-analytics

# Update binding in wrangler.toml
[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "techflunky-analytics"
```

### Set Up Alerts
1. Go to Cloudflare Dashboard → Analytics → Notifications
2. Create alerts for:
   - High error rates (>1%)
   - High response times (>500ms)
   - Traffic spikes
   - Security incidents

## Production Checklist

### Pre-Launch Verification
- [ ] Dispatch Worker deployed and routing correctly
- [ ] User Worker deployed to dispatch namespace
- [ ] All secrets configured in Cloudflare secret store
- [ ] Database schema and seed data loaded
- [ ] R2 bucket created with proper CORS
- [ ] DNS records pointing to Cloudflare
- [ ] SSL certificates active and valid
- [ ] Main application deployed to Pages
- [ ] Documentation deployed to docs subdomain

### Security Checklist
- [ ] JWT secrets in secret store (not environment variables)
- [ ] All API endpoints use tenant isolation middleware
- [ ] Rate limiting configured for all user types
- [ ] CSRF protection enabled
- [ ] Input validation and sanitization active
- [ ] Security event logging configured

### Performance Checklist
- [ ] Global routing active (200+ edge locations)
- [ ] Database queries optimized with indexes
- [ ] Static assets on CDN
- [ ] Caching headers configured
- [ ] Monitoring and alerts set up

## Maintenance Operations

### Updating Workers
```bash
# Update dispatch Worker
cd workers/dispatch
wrangler deploy

# Update user Worker in namespace
cd ../user
wrangler deploy --dispatch-namespace techflunky-tenants
```

### Database Migrations
```bash
# Run new migrations
wrangler d1 execute techflunky-db --file migrations/new-migration.sql

# Backup before major changes
wrangler d1 backup create techflunky-db
```

### Secret Rotation
```bash
# Rotate JWT secret
wrangler secret put JWT_SECRET
# Enter new secret

# Rotate API keys
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put MAILERSEND_API_KEY
```

## Troubleshooting

### Common Issues

**Dispatch namespace not found:**
```bash
# Verify namespace exists
wrangler dispatch-namespace list

# Recreate if missing
wrangler dispatch-namespace create techflunky-tenants
```

**User Worker not routing:**
```bash
# Check deployment status
wrangler deployments list --project techflunky-user-worker

# Redeploy to namespace
wrangler deploy --dispatch-namespace techflunky-tenants
```

**Database connection errors:**
```bash
# Test database connection
wrangler d1 execute techflunky-db --command "SELECT 1;"

# Verify binding in wrangler.toml
[[d1_databases]]
binding = "DB"
database_id = "your-database-id"
```

**Secret access errors:**
```bash
# Verify secrets are set
wrangler secret list

# Reset if corrupted
wrangler secret delete JWT_SECRET
wrangler secret put JWT_SECRET
```

### Getting Help

**Resources:**
- [Cloudflare Workers for Platforms Docs](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/)
- [TechFlunky Community Discord](https://discord.gg/techflunky)
- [GitHub Issues](https://github.com/cozyartz/techflunky/issues)
- Email: support@techflunky.com

**Support Information to Include:**
- Deployment logs
- Wrangler version
- Error messages with timestamps
- Steps to reproduce
- Account ID (not API tokens)

---

**Congratulations!** You now have a fully deployed Workers for Platforms multi-tenant SaaS architecture delivering sub-100ms global response times with complete tenant isolation and the industry's lowest marketplace fee at 8%.