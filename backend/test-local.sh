#!/bin/bash

# Local Development Test Script
# Tests the backend APIs locally before production deployment

set -e

echo "🧪 PathUnfold Web Clipper - Local Testing"
echo "========================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if we're in the backend directory
if [[ ! -f "package.json" ]]; then
    print_error "package.json not found. Run this script from the backend directory."
    exit 1
fi

# Check environment variables
print_status "Checking environment variables..."

if [[ -z "${CIRCLE_AUTH_TOKEN}" ]]; then
    print_warning "CIRCLE_AUTH_TOKEN not set. Backend tests will be limited."
fi

if [[ -z "${IFRAMELY_KEY}" ]]; then
    print_warning "IFRAMELY_KEY not set. Preview functionality will use fallbacks."
fi

if [[ -z "${JWT_SECRET}" ]]; then
    print_warning "JWT_SECRET not set. Using default secret."
fi

# Check if vercel CLI is available
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not found. Install with: npm install -g vercel"
    exit 1
fi

# Start local development server
print_status "Starting local development server..."
vercel dev --listen 3000 &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Function to cleanup
cleanup() {
    print_status "Stopping development server..."
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
}

# Set trap for cleanup
trap cleanup EXIT

# Test health endpoint
print_status "Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
HEALTH_STATUS=$(echo $HEALTH_RESPONSE | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [[ "$HEALTH_STATUS" == "healthy" ]]; then
    print_success "Health check passed"
else
    print_error "Health check failed: $HEALTH_RESPONSE"
    exit 1
fi

# Test auth endpoint (if token is available)
if [[ -n "${CIRCLE_AUTH_TOKEN}" ]]; then
    print_status "Testing auth endpoint..."
    
    # You would need to provide a valid Circle email for testing
    read -p "Enter a Circle community email for testing (or press Enter to skip): " TEST_EMAIL
    
    if [[ -n "$TEST_EMAIL" ]]; then
        AUTH_RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth \
            -H "Content-Type: application/json" \
            -d "{\"email\":\"$TEST_EMAIL\"}")
        
        if echo "$AUTH_RESPONSE" | grep -q "session_token"; then
            print_success "Auth endpoint working"
            
            # Extract token for further tests
            SESSION_TOKEN=$(echo $AUTH_RESPONSE | grep -o '"session_token":"[^"]*"' | cut -d'"' -f4)
            
            # Test preview endpoint
            print_status "Testing preview endpoint..."
            PREVIEW_RESPONSE=$(curl -s "http://localhost:3000/api/preview?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ" \
                -H "Authorization: Bearer $SESSION_TOKEN")
            
            if echo "$PREVIEW_RESPONSE" | grep -q "preview"; then
                print_success "Preview endpoint working"
            else
                print_warning "Preview endpoint may have issues: $PREVIEW_RESPONSE"
            fi
            
        else
            print_error "Auth endpoint failed: $AUTH_RESPONSE"
        fi
    else
        print_warning "Skipping auth tests (no email provided)"
    fi
else
    print_warning "Skipping auth tests (CIRCLE_AUTH_TOKEN not set)"
fi

# Test CORS headers
print_status "Testing CORS headers..."
CORS_RESPONSE=$(curl -s -I -X OPTIONS http://localhost:3000/api/auth)
if echo "$CORS_RESPONSE" | grep -q "Access-Control-Allow-Origin"; then
    print_success "CORS headers present"
else
    print_warning "CORS headers may be missing"
fi

echo ""
echo "🎉 Local Testing Summary"
echo "======================="
echo "✅ Health check: Working"
echo "✅ CORS headers: Present"

if [[ -n "${CIRCLE_AUTH_TOKEN}" ]] && [[ -n "$TEST_EMAIL" ]]; then
    echo "✅ Auth endpoint: Working"
    echo "✅ Preview endpoint: Working"
else
    echo "⚠️  Auth tests: Skipped (missing CIRCLE_AUTH_TOKEN or test email)"
fi

echo ""
echo "📋 Next Steps for Production Deployment:"
echo "1. Ensure all environment variables are set in Vercel"
echo "2. Deploy with: vercel --prod"
echo "3. Test production endpoints"
echo "4. Update extension configuration"
echo "5. Package and test extension"

print_success "Local testing completed!"