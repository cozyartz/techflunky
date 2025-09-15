---
title: Next.js Deployment Guide
description: Complete guide for deploying Next.js platforms on TechFlunky marketplace
---

# Next.js Platform Deployment

Next.js is one of the most popular React frameworks for building full-stack web applications. TechFlunky's deployment system fully supports both App Router and Pages Router architectures with automatic optimization.

## Supported Next.js Versions

- **Next.js 13+**: Full App Router support with automatic optimization
- **Next.js 12**: Pages Router with middleware support
- **Next.js 11+**: Legacy support with manual configuration options

## Framework Detection

TechFlunky automatically detects Next.js projects by analyzing:

```json
// package.json indicators
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```

```javascript
// next.config.js presence
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuration options
}

module.exports = nextConfig
```

## Deployment Configuration

### Automatic Configuration
TechFlunky generates optimized deployment configuration:

```dockerfile
# Auto-generated Dockerfile for Next.js
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Environment Variables
Common Next.js environment variables are automatically configured:

```bash
# Build-time variables
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Runtime variables
DATABASE_URL=postgresql://user:pass@host:5432/db
STRIPE_SECRET_KEY=sk_live_...
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

## Database Integration

### Prisma (Recommended)
Automatic setup for Prisma-based Next.js applications:

```javascript
// prisma/schema.prisma detection
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Deployment includes:
- Database migration execution
- Prisma client generation
- Connection pooling setup

### Other ORMs
Support for popular Next.js database libraries:
- **Drizzle ORM**: Automatic migration detection
- **TypeORM**: Entity and migration setup
- **Sequelize**: Model synchronization
- **MongoDB/Mongoose**: Database connection configuration

## Authentication Integration

### NextAuth.js
Automatic configuration for NextAuth.js setups:

```javascript
// Detection of pages/api/auth/[...nextauth].js or app/api/auth/[...nextauth]/route.js
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export default NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  // Automatic JWT configuration
})
```

### Custom Authentication
Support for custom auth implementations:
- JWT token validation
- Session management
- OAuth provider setup
- Database session storage

## API Routes Optimization

### App Router API Routes
Optimized deployment for modern App Router APIs:

```typescript
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // API logic with automatic optimization
  return NextResponse.json({ users: [] })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // Optimized database operations
  return NextResponse.json({ success: true })
}
```

### Pages Router API Routes
Legacy support for Pages Router APIs:

```typescript
// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Automatic request optimization
  res.status(200).json({ users: [] })
}
```

## Static and Dynamic Optimization

### Static Site Generation (SSG)
Automatic optimization for static pages:

```typescript
// Automatic detection of getStaticProps
export async function getStaticProps() {
  return {
    props: {
      data: await fetchData()
    },
    revalidate: 3600 // ISR configuration
  }
}
```

### Server-Side Rendering (SSR)
Optimized SSR configuration:

```typescript
// getServerSideProps optimization
export async function getServerSideProps(context) {
  return {
    props: {
      data: await fetchDataOnServer()
    }
  }
}
```

### App Router Server Components
Native support for React Server Components:

```typescript
// app/dashboard/page.tsx
async function Dashboard() {
  const data = await fetch('https://api.example.com/data')
  return <DashboardComponent data={data} />
}
```

## Performance Optimizations

### Automatic Optimizations Applied
- **Image optimization** with next/image
- **Font optimization** with next/font
- **Bundle analysis** and splitting
- **Tree shaking** for smaller bundles
- **Compression** (gzip/brotli)
- **Caching** headers optimization

### CDN Configuration
Global content delivery setup:
- Static asset caching
- Edge function deployment
- Regional optimization
- Bandwidth optimization

## Deployment Providers

### Cloudflare (Recommended)
Optimized for Cloudflare Workers and Pages:

```javascript
// Automatic wrangler.toml generation
name = "your-nextjs-app"
compatibility_date = "2024-01-15"

[build]
command = "npm run build"
destination_dir = ".next"

[[pages_build_output.functions]]
name = "[[...route]]"
format = "source"
```

### Vercel
Native Vercel deployment optimization:

```json
// vercel.json generation
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "functions": {
    "app/api/**": {
      "maxDuration": 30
    }
  }
}
```

### AWS Lambda
Serverless deployment on AWS:
- Lambda function optimization
- API Gateway integration
- CloudFront CDN setup
- RDS database connection

### Traditional Hosting
Support for VPS and dedicated servers:
- PM2 process management
- Nginx reverse proxy setup
- SSL certificate automation
- Load balancing configuration

## Middleware Support

### Edge Middleware
Automatic configuration for Next.js middleware:

```typescript
// middleware.ts detection and optimization
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Optimized edge function deployment
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
```

## Monitoring and Analytics

### Automatic Monitoring Setup
- **Web Vitals** tracking integration
- **Error monitoring** with Sentry/Bugsnag
- **Performance monitoring** with real user metrics
- **Uptime monitoring** with health checks

### Business Analytics
- **User behavior** tracking
- **Conversion funnel** analysis
- **Revenue tracking** integration
- **A/B testing** framework setup

## Common Deployment Scenarios

### E-commerce Platform
```typescript
// Automatic detection and optimization for:
// - Product catalog pages
// - Shopping cart functionality
// - Payment processing (Stripe/PayPal)
// - Order management
// - Customer dashboard
```

### SaaS Dashboard
```typescript
// Optimized deployment for:
// - User authentication and roles
// - Multi-tenant architecture
// - Subscription billing
// - Analytics dashboard
// - API rate limiting
```

### Content Management System
```typescript
// Automatic setup for:
// - Dynamic content rendering
// - Admin panel deployment
// - Media file handling
// - SEO optimization
// - Content caching
```

## Troubleshooting

### Common Issues and Solutions

#### Build Failures
```bash
# Automatic detection and fixes for:
# - TypeScript errors
# - Missing dependencies
# - Environment variable issues
# - Memory limitations during build
```

#### Runtime Errors
```bash
# Automatic monitoring and alerts for:
# - Database connection issues
# - API endpoint failures
# - Memory leaks
# - Performance degradation
```

#### Deployment Issues
```bash
# Automated resolution for:
# - Port conflicts
# - SSL certificate issues
# - Domain configuration
# - CDN cache invalidation
```

## Migration Support

### From Pages Router to App Router
Assisted migration with:
- Route conversion guidance
- Component migration tools
- Performance comparison
- Gradual migration support

### From Other Frameworks
Migration assistance from:
- **Create React App**: Component and routing migration
- **Gatsby**: Static generation transition
- **Express.js**: API route conversion
- **Vue/Nuxt**: Cross-framework migration guidance

## Best Practices

### Development Workflow
```bash
# Recommended project structure
my-nextjs-platform/
├── app/                 # App Router (Next.js 13+)
├── pages/              # Pages Router (legacy)
├── components/         # Reusable components
├── lib/               # Utility functions
├── styles/            # CSS/Tailwind styles
├── public/            # Static assets
├── prisma/            # Database schema
└── tests/             # Test files
```

### Security Configuration
- Environment variable validation
- CORS configuration
- CSP header setup
- Authentication middleware
- Rate limiting implementation

### Performance Guidelines
- Code splitting strategies
- Image optimization setup
- Database query optimization
- Caching layer implementation
- Bundle size monitoring

Ready to deploy your Next.js platform? Start with our [Quick Start Guide](/getting-started/quick-start) or explore [deployment options](/deployment/overview).