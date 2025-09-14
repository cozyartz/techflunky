# Deployment Guide

## Overview

TechFlunky's deployment system automates the process of deploying complete business solutions to a buyer's Cloudflare account. This guide covers both deploying the TechFlunky platform itself and how businesses are deployed for buyers.

## Deploying TechFlunky Platform

### Prerequisites

- Cloudflare account with Workers Paid plan
- Custom domain for the platform
- Stripe account for payments
- Node.js 18+ installed locally

### Step 1: Clone and Configure

```bash
# Clone the repository
git clone https://github.com/cozyartz/techflunky.git
cd techflunky

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local
```

### Step 2: Set Environment Variables

Edit `.env.local` with your credentials:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_YOUR_KEY
STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET

# Cloudflare Platform Configuration
PLATFORM_ZONE_ID=your_zone_id
PLATFORM_API_TOKEN=your_api_token

# Claude AI (optional)
CLAUDE_API_KEY=sk-ant-YOUR_KEY

# Platform Settings
PLATFORM_NAME=TechFlunky
PLATFORM_COMPANY=Autimind, Inc.
PLATFORM_FEE_PERCENT=0.15
REVIEW_PERIOD_DAYS=3
```

### Step 3: Deploy to Cloudflare

```bash
# Build the project
npm run build

# Deploy to Cloudflare
npm run deploy
```

### Step 4: Configure Cloudflare for SaaS

1. Go to Cloudflare Dashboard → Your Zone → SSL/TLS → Custom Hostnames
2. Enable Cloudflare for SaaS
3. Set fallback origin to your platform domain
4. Configure SSL settings

### Step 5: Set Up Stripe Webhooks

1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-domain.com/api/checkout/webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `charge.dispute.created`
   - `account.updated`

## How Business Deployment Works

### Buyer's Perspective

1. **Purchase Package**
   - Browse marketplace
   - Select business package
   - Complete Stripe checkout

2. **Access Deployment Dashboard**
   - Receive email with deployment link
   - Go to `/dashboard/deploy`
   - Enter Cloudflare API token

3. **Configure Deployment**
   - Choose subdomain or custom domain
   - Review what will be deployed
   - Accept terms and deploy

4. **Monitor Progress**
   - Real-time deployment status
   - See each resource being created
   - Get access URLs when complete

### Technical Deployment Process

#### 1. Authentication & Validation

```javascript
// Verify buyer's Cloudflare account
const account = await verifyBuyerAccount(apiToken);

// Load purchased package
const package = await loadPackage(packageId);

// Validate purchase
const purchase = await verifyPurchase(buyerId, packageId);
```

#### 2. Create Infrastructure

```javascript
// Create Workers
for (const worker of package.workers) {
  await deployWorker(account.id, worker);
}

// Create Databases
for (const db of package.databases) {
  await createD1Database(account.id, db);
  await runMigrations(db.schema);
}

// Create Storage
for (const bucket of package.buckets) {
  await createR2Bucket(account.id, bucket);
}
```

#### 3. Configure Domain

```javascript
// For custom domain
if (customDomain) {
  await setupCustomHostname(customDomain);
  await configureDNS(customDomain);
}

// For subdomain
else {
  const subdomain = generateSubdomain(package.slug);
  await createSubdomain(subdomain);
}
```

#### 4. Post-Deployment

```javascript
// Set environment variables
await configureEnvironment(workers, databases, buckets);

// Run initialization scripts
await runPostDeploymentScripts(package.scripts);

// Send confirmation
await sendDeploymentEmail(buyer.email, deploymentResult);
```

## Creating Deployable Packages

### Package Structure

```
my-business-package/
├── techflunky.json         # Package manifest
├── workers/                # Cloudflare Workers
│   ├── api-gateway.js      # Main API
│   ├── auth.js             # Authentication
│   └── cron-jobs.js        # Scheduled tasks
├── database/               # D1 Schemas
│   ├── schema.sql          # Database structure
│   └── seed.sql            # Initial data
├── frontend/               # Optional UI
│   └── dist/               # Built static files
├── assets/                 # Business documents
│   ├── market-research.pdf
│   ├── business-plan.pdf
│   └── pitch-deck.pptx
└── README.md               # Setup instructions
```

### Package Manifest (techflunky.json)

```json
{
  "id": "pkg_unique_id",
  "name": "Business Name",
  "slug": "business-slug",
  "version": "1.0.0",
  "price": 25000,
  "tier": "launch_ready",
  "cloudflare": {
    "workers": [
      {
        "name": "api-gateway",
        "code": "workers/api-gateway.js",
        "routes": ["api.${domain}/*"],
        "environment": {
          "APP_NAME": "My Business"
        }
      }
    ],
    "d1_databases": [
      {
        "name": "main-db",
        "schema": "database/schema.sql",
        "seedData": "database/seed.sql"
      }
    ],
    "r2_buckets": [
      {
        "name": "uploads",
        "corsEnabled": true
      }
    ]
  }
}
```

### Testing Package Deployment

```bash
# Use CLI to test locally
techflunky test-deploy --local

# Deploy to test account
techflunky deploy --test --token YOUR_TEST_TOKEN
```

## Troubleshooting

### Common Issues

#### 1. Deployment Fails at Worker Creation
- Check API token has Workers edit permissions
- Ensure worker code is valid JavaScript
- Verify routes don't conflict

#### 2. Database Creation Errors
- Confirm D1 is enabled on account
- Check SQL syntax is valid
- Ensure migrations run in order

#### 3. Domain Configuration Issues
- Verify domain ownership
- Check DNS propagation
- Ensure SSL certificates are active

### Debug Mode

Enable detailed logging:

```javascript
const deployment = new BusinessDeploymentManager(token, package);
deployment.enableDebugMode();
await deployment.deploy();
```

### Rollback Procedure

If deployment fails:

1. Check deployment logs
2. Identify failed component
3. Use rollback command:
   ```bash
   techflunky rollback --deployment-id XXX
   ```

## Security Best Practices

### For Platform Operators

1. **API Token Handling**
   - Never log tokens
   - Use environment variables
   - Implement rate limiting
   - Monitor suspicious activity

2. **Package Validation**
   - Scan packages for malicious code
   - Verify package signatures
   - Test in sandbox first
   - Review seller credentials

3. **Infrastructure Security**
   - Enable 2FA on all accounts
   - Use least-privilege API tokens
   - Monitor deployment patterns
   - Regular security audits

### For Package Creators

1. **Code Security**
   - No hardcoded secrets
   - Input validation
   - SQL injection prevention
   - XSS protection

2. **Data Handling**
   - Encrypt sensitive data
   - GDPR compliance
   - Secure API endpoints
   - Proper authentication

## Monitoring Deployments

### Platform Metrics

Track key metrics:
- Deployment success rate
- Average deployment time
- Resource creation failures
- API rate limit hits

### Cloudflare Analytics

Monitor deployed businesses:
- Worker invocations
- Database queries
- Storage usage
- Bandwidth consumption

### Alerts

Set up alerts for:
- Failed deployments
- High error rates
- Suspicious activity
- Resource limits

## Advanced Topics

### Multi-Region Deployment

Deploy to specific regions:

```javascript
const deployment = new BusinessDeploymentManager(token, package);
deployment.setRegions(['wnam', 'eeur']);
await deployment.deploy();
```

### Custom Deployment Scripts

Add custom logic:

```javascript
package.postDeploymentScripts = [
  {
    name: "Initialize Admin",
    type: "function",
    code: async (context) => {
      // Custom initialization
    }
  }
];
```

### Batch Deployments

Deploy multiple businesses:

```javascript
const batchDeployment = new BatchDeploymentManager();
batchDeployment.addDeployment(token1, package1);
batchDeployment.addDeployment(token2, package2);
await batchDeployment.deployAll();
```

## Support

### Getting Help

- Documentation: [docs.techflunky.com](https://docs.techflunky.com)
- Community: [community.techflunky.com](https://community.techflunky.com)
- Support: support@techflunky.com

### Reporting Issues

When reporting deployment issues, include:
- Deployment ID
- Error messages
- Package ID
- Cloudflare account ID (not token)
- Timestamp of attempt
