#!/bin/bash

# PathUnfold Web Clipper - Auto Backend URL Update Script
# This script automatically updates the frontend backend URL after deployment

set -e

echo "🔄 Auto-updating backend URL in frontend..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [[ ! -f "backend/package.json" ]]; then
    print_error "Must run from project root directory (should contain backend/ folder)"
    exit 1
fi

# Deploy backend and capture the new URL
print_status "Deploying backend to Vercel..."
cd backend
DEPLOY_OUTPUT=$(vercel --prod --yes 2>&1)
NEW_BACKEND_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[a-zA-Z0-9-]*\.vercel\.app' | head -1)

if [[ -z "$NEW_BACKEND_URL" ]]; then
    print_error "Failed to extract backend URL from deployment output"
    echo "Deployment output:"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

print_success "Backend deployed to: $NEW_BACKEND_URL"

# Add /api suffix for the frontend
FRONTEND_BACKEND_URL="${NEW_BACKEND_URL}/api"

# Go back to project root
cd ..

# Find the current backend URL in the codebase
CURRENT_URL=$(grep -o 'https://pathunfold-web-clipper-backend-[a-z0-9]*-mins-projects-ac9e45c3\.vercel\.app/api' options.html | head -1)

if [[ -z "$CURRENT_URL" ]]; then
    print_error "Could not find current backend URL in options.html"
    exit 1
fi

print_status "Current backend URL: $CURRENT_URL"
print_status "New backend URL: $FRONTEND_BACKEND_URL"

# Update all frontend files
print_status "Updating frontend files..."

# Update options.html
sed -i.bak "s|${CURRENT_URL}|${FRONTEND_BACKEND_URL}|g" options.html
print_success "Updated options.html"

# Update options.js
sed -i.bak "s|${CURRENT_URL}|${FRONTEND_BACKEND_URL}|g" options.js
print_success "Updated options.js"

# Update popup.js
sed -i.bak "s|${CURRENT_URL}|${FRONTEND_BACKEND_URL}|g" popup.js
print_success "Updated popup.js"

# Clean up backup files
rm -f *.bak

# Create updated extension package
PACKAGE_NAME="pathunfold-web-clipper-v2.0.0-$(date +%Y%m%d-%H%M%S).zip"
print_status "Creating updated extension package: $PACKAGE_NAME"

# Remove old packages
rm -f pathunfold-web-clipper-v2.0.0-*.zip

# Create new package
zip -r "$PACKAGE_NAME" manifest.json background.js content.js popup.html popup.js options.html options.js icons/ > /dev/null

print_success "Extension package created: $PACKAGE_NAME"

echo ""
echo "🎉 Auto-update completed successfully!"
echo "=================================="
echo "📦 New backend URL: $FRONTEND_BACKEND_URL"
echo "📱 Extension package: $PACKAGE_NAME"
echo ""
echo "📋 Next steps:"
echo "1. Load the new extension package in Chrome"
echo "2. The backend URL will be automatically set to the latest deployment"
echo "3. Re-authenticate if needed"
echo "4. Test the functionality"

print_success "No manual URL input required! 🚀"