#!/bin/bash

# PathUnfold Auth Backend Deployment Script
echo "🚀 PathUnfold Auth Backend Deployment Script"
echo "============================================"

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI is not installed. Installing..."
    npm install -g vercel
fi

# Check if user is logged in
echo "🔍 Checking Vercel login status..."
vercel whoami || {
    echo "📝 Please login to Vercel:"
    vercel login
}

# Navigate to backend directory
cd "$(dirname "$0")"

# Deploy to Vercel
echo "📦 Deploying to Vercel with updated CORS configuration..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Next steps:"
echo "1. Go to your Vercel dashboard"
echo "2. Add the CIRCLE_AUTH_TOKEN environment variable"
echo "3. Get your API URL and update your Chrome extension settings"
echo ""
echo "🔗 Your API endpoint will be: https://your-project-name.vercel.app/api/auth"