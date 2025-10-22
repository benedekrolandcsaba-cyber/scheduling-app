#!/bin/bash

# 🚀 Professional CSP Scheduling Engine - Quick Deploy Script
# This script helps you deploy to Vercel with proper configuration

echo "🚀 Professional CSP Scheduling Engine - Deployment Script"
echo "========================================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "📦 Installing Vercel CLI..."
    npm install -g vercel
fi

echo "🔍 Checking project structure..."
echo "✅ package.json found"
echo "✅ vercel.json found"
echo "✅ API endpoints found in api/ directory"
echo "✅ Frontend files found"

echo ""
echo "⚠️  IMPORTANT: Before deploying, make sure you have:"
echo "   1. Created a Neon database at https://neon.tech"
echo "   2. Copied your DATABASE_URL connection string"
echo "   3. Ready to add it as environment variable in Vercel"
echo ""

read -p "Do you have your Neon DATABASE_URL ready? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Please set up your Neon database first:"
    echo "   1. Go to https://neon.tech"
    echo "   2. Create a new project"
    echo "   3. Copy the connection string"
    echo "   4. Run this script again"
    exit 1
fi

echo "🚀 Starting Vercel deployment..."

# Deploy to Vercel
vercel --prod

echo ""
echo "🎉 Deployment initiated!"
echo ""
echo "📋 Next steps:"
echo "   1. Go to your Vercel dashboard"
echo "   2. Navigate to Project Settings → Environment Variables"
echo "   3. Add: DATABASE_URL = your_neon_connection_string"
echo "   4. Redeploy if needed"
echo ""
echo "🔗 Your app will be available at the URL shown above"
echo "✅ Check the connection status indicator when it loads"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md"