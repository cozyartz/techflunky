#!/bin/bash

# TechFlunky Security Center Deployment Script
# Deploys the security center to security.techflunky.com

set -e

echo "🔒 TechFlunky Security Center Deployment"
echo "======================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Please install it first:"
    echo "npm install -g wrangler"
    exit 1
fi

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "❌ Not logged in to Cloudflare. Please run:"
    echo "wrangler login"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

# Deploy to Cloudflare Workers
echo "🚀 Deploying security center..."
wrangler deploy

# Set up custom domain (if not already configured)
echo "🌐 Setting up custom domain..."
echo "Please ensure the following DNS record is configured:"
echo "Type: CNAME"
echo "Name: security"
echo "Content: techflunky-security.your-subdomain.workers.dev"
echo "Proxy status: Proxied (orange cloud)"

# Create KV namespace if it doesn't exist
echo "🗄️  Setting up KV namespace..."
wrangler kv:namespace create "SECURITY_METRICS" || echo "KV namespace may already exist"

# Create D1 database if it doesn't exist
echo "💾 Setting up D1 database..."
wrangler d1 create techflunky-security || echo "D1 database may already exist"

# Create R2 bucket if it doesn't exist
echo "🪣 Setting up R2 bucket..."
wrangler r2 bucket create techflunky-security-reports || echo "R2 bucket may already exist"

echo ""
echo "✅ Security Center deployment complete!"
echo ""
echo "🔗 Your security center should be available at:"
echo "   https://security.techflunky.com"
echo ""
echo "📋 Next steps:"
echo "1. Configure DNS CNAME record for security.techflunky.com"
echo "2. Update wrangler.toml with actual database/bucket IDs"
echo "3. Set up environment variables if needed"
echo "4. Test the deployment"
echo ""
echo "🔧 Useful commands:"
echo "   wrangler tail          # View real-time logs"
echo "   wrangler dev          # Local development"
echo "   wrangler deploy       # Deploy updates"
echo ""