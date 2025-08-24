#!/bin/bash

echo "🚀 FlipCheck API - GitHub Push Script"
echo "====================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -f "src/app/api/ebay/search/route.ts" ]; then
    echo "❌ Error: Please run this script from the api-only-deployment directory"
    exit 1
fi

echo "✅ Project files verified"
echo ""

# Get GitHub username
read -p "Enter your GitHub username: " GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
    echo "❌ GitHub username is required"
    exit 1
fi

echo ""
echo "🔧 Setting up GitHub remote..."

# Remove existing remote if it exists
git remote remove origin 2>/dev/null

# Add new remote
git remote add origin "https://github.com/$GITHUB_USERNAME/flipcheck-api.git"

if [ $? -eq 0 ]; then
    echo "✅ GitHub remote added successfully"
else
    echo "❌ Failed to add GitHub remote"
    exit 1
fi

echo ""
echo "📤 Pushing code to GitHub..."

# Rename branch to main and push
git branch -M main
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Code pushed to GitHub"
    echo ""
    echo "�� Your repository: https://github.com/$GITHUB_USERNAME/flipcheck-api"
    echo ""
    echo "📋 Next steps:"
    echo "1. Go to https://vercel.com"
    echo "2. Click 'New Project'"
    echo "3. Import your flipcheck-api repository"
    echo "4. Add environment variables from .env.local"
    echo "5. Deploy!"
    echo ""
    echo "🔗 API endpoint will be: https://your-project-name.vercel.app/api/ebay/search"
else
    echo ""
    echo "❌ Failed to push to GitHub"
    echo "Please check your GitHub repository exists and you have proper permissions"
fi
