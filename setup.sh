#!/bin/bash

# TechFlunky Setup Script
echo "Setting up TechFlunky..."

# Install dependencies
echo "Installing dependencies..."
npm install

# Create D1 database
echo "Creating D1 database..."
wrangler d1 create techflunky-db

# Create R2 bucket
echo "Creating R2 bucket..."
wrangler r2 bucket create techflunky-assets

# Create KV namespace
echo "Creating KV namespace for cache..."
wrangler kv:namespace create CACHE

# Run database migrations
echo "Running database migrations..."
wrangler d1 execute techflunky-db --file=./database/schema.sql

# Create .dev.vars file
echo "Creating .dev.vars file..."
cat > .dev.vars << EOL
STRIPE_SECRET_KEY=sk_test_YOUR_STRIPE_KEY
CLAUDE_API_KEY=sk-ant-YOUR_CLAUDE_KEY
JWT_SECRET=your-super-secret-jwt-key
EOL

echo "Setup complete! Update the following:"
echo "1. Replace database ID in astro.config.mjs and wrangler.toml"
echo "2. Add your API keys to .dev.vars"
echo "3. Run 'npm run dev' to start development"
