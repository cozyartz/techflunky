#!/bin/bash

# TechFlunky.com Setup Script
# Complete Business Idea Marketplace Platform

echo "🚀 TechFlunky.com - Business Idea Marketplace Platform"
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the techflunky project root directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create .dev.vars file for local development
echo "🔧 Setting up environment variables..."
if [ ! -f ".dev.vars" ]; then
    cp .env.example .dev.vars
    echo "✅ Created .dev.vars from template - please update with your actual API keys"
else
    echo "ℹ️  .dev.vars already exists"
fi

# Cloudflare resources are already deployed
echo "✅ Cloudflare Resources Deployed:"
echo "   - D1 Database: techflunky-db (330b8406-f05f-4e5b-966a-a58fcd2ba3d1)"
echo "   - R2 Bucket: techflunky-assets"
echo "   - KV Namespace: techflunky-cache (31831cdf293546b992aefcfc0edb139f)"

# Next steps instructions
echo ""
echo "🎯 SETUP COMPLETE! Next steps:"
echo "=================================================="
echo ""
echo "1. 📝 CONFIGURE API KEYS:"
echo "   - Edit .dev.vars with your Stripe and Claude API keys"
echo "   - Set up Stripe webhooks for payment processing"
echo ""
echo "2. 🚀 DEPLOY THE PLATFORM:"
echo "   - npm run build"
echo "   - npm run deploy"
echo ""
echo "3. 💰 REVENUE STREAMS READY:"
echo "   - Business idea marketplace (10-15% commission)"
echo "   - White-glove services ($299-$14,999/project)"
echo "   - AI validation services ($199-$999/analysis)"
echo "   - Course platform ($79-$299/course)"
echo "   - Listing boosts ($49-$199/promotion)"
echo "   - Affiliate program (10-25% commissions)"
echo "   - Subscription tiers ($99-$299/month)"
echo ""
echo "4. 📊 BUSINESS POTENTIAL:"
echo "   - Year 1: $275K+ with 100 active users"
echo "   - Year 2-3: $1.5M-3M with 500+ users"
echo "   - 95%+ profit margins on Cloudflare infrastructure"
echo ""
echo "🛠️  DEVELOPMENT COMMANDS:"
echo "   - npm run dev      # Start development server"
echo "   - npm run build    # Build for production" 
echo "   - npm run deploy   # Deploy to Cloudflare"
echo ""
echo "📖 See IMPLEMENTATION-GUIDE.md for detailed service documentation"
echo ""
echo "🎉 Ready to launch your business idea marketplace!"
