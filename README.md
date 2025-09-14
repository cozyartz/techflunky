# TechFlunky - Business Idea Marketplace

## Overview
TechFlunky is a marketplace for validated business ideas, connecting entrepreneurs who create business concepts with buyers looking for their next venture.

## Tech Stack
- **Frontend**: Astro + React + Tailwind CSS
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1
- **Storage**: Cloudflare R2
- **AI**: Cloudflare Workers AI + Claude API
- **Payments**: Stripe

## Project Structure
```
techflunky/
├── src/
│   ├── components/     # React components
│   ├── layouts/        # Astro layouts
│   ├── pages/          # Astro pages
│   ├── api/            # API routes (Workers)
│   ├── lib/            # Shared utilities
│   └── styles/         # Global styles
├── public/             # Static assets
├── database/           # D1 schema and migrations
└── wrangler.toml       # Cloudflare configuration
```

## Setup Instructions
1. Install dependencies: `npm install`
2. Set up D1 database: `wrangler d1 create techflunky-db`
3. Set up R2 bucket: `wrangler r2 bucket create techflunky-assets`
4. Update `astro.config.mjs` with your D1 database ID
5. Run development server: `npm run dev`

## Features
- Business idea listings with tiered packages
- Seller subscriptions and analytics
- Escrow and secure transactions
- AI-powered validation and scoring
- Buyer-seller messaging
- Document storage and sharing

## Deployment
Deploy to Cloudflare Pages: `npm run deploy`
