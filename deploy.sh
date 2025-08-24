#!/bin/bash

echo "🚀 Setting up FlipCheck API-only deployment..."

# Create directory structure
mkdir -p src/app/api/ebay/search
mkdir -p src/lib

# Copy API files from main project
echo "📁 Copying API files..."
cp ../../flipcheck-web/src/app/api/ebay/search/route.ts src/app/api/ebay/search/
cp ../../flipcheck-web/src/lib/supabase.ts src/lib/

# Copy environment file
echo "🔑 Copying environment variables..."
cp ../../flipcheck-web/.env.local ./

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create git repo
echo "🔧 Setting up git repository..."
git init
git add .
git commit -m "Initial API-only deployment"

echo "✅ API-only project ready!"
echo ""
echo "🎯 Next steps:"
echo "1. Push to GitHub: git remote add origin <your-repo-url> && git push -u origin main"
echo "2. Deploy to Vercel: Import your GitHub repo"
echo "3. Update Figma to use: https://your-vercel-url.vercel.app/api/ebay/search"
echo ""
echo "🌐 Your API will be accessible at:"
echo "   https://your-vercel-url.vercel.app/api/ebay/search?q=iphone&limit=5"
