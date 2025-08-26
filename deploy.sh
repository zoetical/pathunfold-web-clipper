#!/bin/bash

# PathUnfold Web Clipper - Production Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 PathUnfold Web Clipper v2 - Production Deployment"
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check prerequisites
print_status "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi

if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI is not installed. Installing globally..."
    npm install -g vercel
fi

print_success "Prerequisites check completed"

# Navigate to backend directory
cd backend

# Install dependencies
print_status "Installing backend dependencies..."
npm install --production
print_success "Backend dependencies installed"

# Environment variables check
print_status "Checking environment variables..."

if [[ -z "${CIRCLE_AUTH_TOKEN}" ]]; then
    print_error "CIRCLE_AUTH_TOKEN environment variable is required"
    print_status "Please set it in your Vercel project settings"
    exit 1
fi

print_success "Environment variables validated"

# Deploy to Vercel
print_status "Deploying backend to Vercel..."

# Deploy to production
vercel --prod --confirm --token="${VERCEL_TOKEN:-}"

# Get the deployment URL
BACKEND_URL=$(vercel ls --token="${VERCEL_TOKEN:-}" | grep pathunfold-web-clipper-backend | head -1 | awk '{print "https://" $2}')

if [[ -z "${BACKEND_URL}" ]]; then
    print_error "Failed to get backend URL from Vercel"
    exit 1
fi

print_success "Backend deployed to: ${BACKEND_URL}"

# Test health endpoint
print_status "Testing backend health..."
sleep 10  # Wait for deployment to be ready

HEALTH_URL="${BACKEND_URL}/health"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${HEALTH_URL}" || echo "000")

if [[ "${HTTP_STATUS}" == "200" ]]; then
    print_success "Backend health check passed"
else
    print_error "Backend health check failed (HTTP ${HTTP_STATUS})"
    print_status "Please check Vercel logs for details"
    exit 1
fi

# Navigate back to extension directory
cd ..

# Update extension configuration
print_status "Updating extension configuration for production..."

# Update default backend URL in options.html
sed -i.bak "s|https://pathunfold-web-clipper\.vercel\.app/api|${BACKEND_URL}/api|g" options.html
sed -i.bak "s|https://pathunfold-web-clipper\.vercel\.app/api|${BACKEND_URL}/api|g" options.js

# Update manifest version
CURRENT_VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
NEW_VERSION=$(echo "${CURRENT_VERSION}" | awk -F. '{$NF = $NF + 1;} 1' | sed 's/ /./g')

sed -i.bak "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" manifest.json

print_success "Extension updated to version ${NEW_VERSION}"
print_success "Backend URL updated to: ${BACKEND_URL}/api"

# Create production package
print_status "Creating production extension package..."

# Create temporary directory for packaging
TEMP_DIR=$(mktemp -d)
PACKAGE_NAME="pathunfold-web-clipper-v${NEW_VERSION}.zip"

# Copy extension files (exclude development files)
cp manifest.json "${TEMP_DIR}/"
cp *.js "${TEMP_DIR}/"
cp *.html "${TEMP_DIR}/"
cp -r icons "${TEMP_DIR}/"

# Create ZIP package
cd "${TEMP_DIR}"
zip -r "../${PACKAGE_NAME}" *
cd - > /dev/null

# Move package to project directory
mv "${TEMP_DIR}/../${PACKAGE_NAME}" .

# Cleanup
rm -rf "${TEMP_DIR}"
rm -f *.bak  # Remove backup files created by sed

print_success "Extension package created: ${PACKAGE_NAME}"

# Final summary
echo ""
echo "🎉 Deployment Summary"
echo "===================="
echo "Backend URL: ${BACKEND_URL}"
echo "Extension Version: ${NEW_VERSION}"
echo "Package: ${PACKAGE_NAME}"
echo ""
echo "📋 Next Steps:"
echo "1. Test the extension by loading it in Chrome"
echo "2. Upload ${PACKAGE_NAME} to Chrome Web Store"
echo "3. Update documentation with new backend URL"
echo "4. Monitor backend logs for any issues"
echo ""
echo "🔍 Testing URLs:"
echo "Health Check: ${BACKEND_URL}/health"
echo "Auth Test: ${BACKEND_URL}/api/auth"
echo ""

print_success "Deployment completed successfully!"