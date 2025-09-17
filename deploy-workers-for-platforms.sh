#!/bin/bash

# TechFlunky Workers for Platforms Deployment Script

echo "🚀 Deploying TechFlunky to Workers for Platforms..."

# Step 1: Deploy the dispatch Worker
echo "📦 Deploying dispatch Worker..."
cd workers/dispatch
wrangler deploy

# Step 2: Upload user Worker to Workers for Platforms namespace
echo "👥 Uploading user Worker to Workers for Platforms..."
cd ../user
wrangler deploy --name techflunky-user --env production

# Step 3: Create user Worker script in the dispatch namespace
echo "🔧 Creating user Worker in dispatch namespace..."
cd ../..

# Note: This command would typically be run to upload the user Worker to the namespace
# wrangler dispatch-namespace upload techflunky-users techflunky-user --script-name user-worker

echo "✅ Workers for Platforms deployment complete!"

echo "📋 Next steps:"
echo "1. Configure Workers for Platforms namespace binding in Cloudflare dashboard"
echo "2. Set up user Worker in dispatch namespace: techflunky-users"
echo "3. Update DNS to point to dispatch Worker"
echo "4. Test tenant isolation functionality"

echo "🔍 To test the deployment:"
echo "curl -H 'X-Tenant-ID: seller_test123' -H 'X-Tenant-Type: seller' https://techflunky.com/api/listings"