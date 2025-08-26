#!/bin/bash

# PathUnfold Web Clipper - Extension Packaging Script
# Run this script after updating the backend URL

set -e

echo "📦 PathUnfold Web Clipper - Extension Packaging"
echo "==============================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
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

# Check if we're in the right directory
if [[ ! -f "manifest.json" ]]; then
    echo "❌ Error: manifest.json not found. Run this script from the extension root directory."
    exit 1
fi

# Get current version from manifest
CURRENT_VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\([^"]*\)".*/\1/')
print_status "Current version: ${CURRENT_VERSION}"

# Ask for backend URL if not provided
if [[ -z "$1" ]]; then
    echo "Please provide your backend URL:"
    echo "Example: https://your-backend.vercel.app/api"
    read -p "Backend URL: " BACKEND_URL
else
    BACKEND_URL="$1"
fi

# Validate URL format
if [[ ! "$BACKEND_URL" =~ ^https?:// ]]; then
    echo "❌ Error: Backend URL must start with http:// or https://"
    exit 1
fi

print_status "Using backend URL: ${BACKEND_URL}"

# Create backup of original files
print_status "Creating backups..."
cp options.html options.html.bak
cp options.js options.js.bak

# Update backend URLs in files
print_status "Updating backend URLs..."

# Update options.html
sed -i "s|https://pathunfold-web-clipper\.vercel\.app/api|${BACKEND_URL}|g" options.html

# Update options.js  
sed -i "s|https://pathunfold-web-clipper\.vercel\.app/api|${BACKEND_URL}|g" options.js

print_success "Backend URLs updated"

# Create package directory
PACKAGE_DIR="pathunfold-web-clipper-package"
PACKAGE_NAME="pathunfold-web-clipper-v${CURRENT_VERSION}.zip"

print_status "Creating package directory..."
rm -rf "${PACKAGE_DIR}" 2>/dev/null || true
mkdir "${PACKAGE_DIR}"

# Copy extension files
print_status "Copying extension files..."
cp manifest.json "${PACKAGE_DIR}/"
cp background.js "${PACKAGE_DIR}/"
cp content.js "${PACKAGE_DIR}/"
cp popup.html "${PACKAGE_DIR}/"
cp popup.js "${PACKAGE_DIR}/"
cp options.html "${PACKAGE_DIR}/"
cp options.js "${PACKAGE_DIR}/"

# Copy icons directory
if [[ -d "icons" ]]; then
    cp -r icons "${PACKAGE_DIR}/"
    print_success "Icons copied"
else
    print_warning "Icons directory not found"
fi

# Create ZIP package
print_status "Creating ZIP package..."
cd "${PACKAGE_DIR}"
zip -r "../${PACKAGE_NAME}" * > /dev/null
cd ..

# Cleanup
rm -rf "${PACKAGE_DIR}"

# Restore original files
print_status "Restoring original files..."
mv options.html.bak options.html
mv options.js.bak options.js

print_success "Package created: ${PACKAGE_NAME}"

# Show package contents
print_status "Package contents:"
unzip -l "${PACKAGE_NAME}"

echo ""
echo "🎉 Packaging Complete!"
echo "======================"
echo "Package: ${PACKAGE_NAME}"
echo "Backend URL: ${BACKEND_URL}"
echo ""
echo "📋 Next Steps:"
echo "1. Test the packaged extension by loading it in Chrome"
echo "2. Upload to Chrome Web Store Developer Dashboard"
echo "3. Fill out store listing information"
echo "4. Submit for review"
echo ""
echo "🔍 Testing Instructions:"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked' and select the extracted package"
echo "4. Test authentication and clipping functionality"

print_success "Extension packaging completed successfully!"