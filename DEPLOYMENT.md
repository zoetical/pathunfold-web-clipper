# Production Environment Setup Guide

## Prerequisites

### Required Software
- Node.js 18+ 
- npm or yarn
- Vercel CLI (`npm install -g vercel`)
- Git

### Required Accounts
- Vercel account for backend hosting
- Circle.so admin access for auth token
- Iframely account (optional, for enhanced previews)

## Environment Variables

### Required Variables

#### `CIRCLE_AUTH_TOKEN`
**Description**: Circle Headless Authentication Token  
**How to get**: 
1. Go to your Circle admin panel
2. Navigate to Settings → Developers → Headless API
3. Generate or copy your auth token

**Example**: `circle_auth_xxxxxxxxxxxxxxxxxxxxx`

### Optional Variables

#### `IFRAMELY_KEY`
**Description**: Iframely API key for enhanced link previews  
**How to get**:
1. Sign up at https://iframely.com
2. Go to your dashboard
3. Copy your API key

**Example**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

#### `JWT_SECRET`
**Description**: Secret key for JWT token signing  
**Default**: Auto-generated if not provided  
**Recommendation**: Set a strong random string for production

**Example**: `your-super-secret-jwt-key-min-32-chars`

## Deployment Methods

### Method 1: Automatic Deployment (Recommended)

1. **Set Environment Variables**:
   ```bash
   export CIRCLE_AUTH_TOKEN="your-circle-token"
   export IFRAMELY_KEY="your-iframely-key"  # Optional
   export VERCEL_TOKEN="your-vercel-token"   # Optional, for CI/CD
   ```

2. **Run Deployment Script**:
   ```bash
   ./deploy.sh
   ```

### Method 2: Manual Deployment

#### Backend Deployment

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install --production
   ```

3. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

4. **Set environment variables in Vercel**:
   ```bash
   vercel env add CIRCLE_AUTH_TOKEN
   vercel env add IFRAMELY_KEY
   vercel env add JWT_SECRET
   ```

#### Extension Packaging

1. **Update backend URL in extension files**:
   - Edit `options.html` and `options.js`
   - Replace `https://pathunfold-web-clipper.vercel.app/api` with your Vercel URL

2. **Update version in manifest.json**

3. **Create ZIP package** with these files:
   - `manifest.json`
   - `*.js` files
   - `*.html` files  
   - `icons/` directory

### Method 3: GitHub Actions (CI/CD)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy PathUnfold Web Clipper

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Vercel CLI
        run: npm install -g vercel
        
      - name: Deploy Backend
        run: |
          cd backend
          npm install --production
          vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          
      - name: Package Extension
        run: |
          # Update URLs and create package
          ./deploy.sh
        env:
          CIRCLE_AUTH_TOKEN: ${{ secrets.CIRCLE_AUTH_TOKEN }}
          IFRAMELY_KEY: ${{ secrets.IFRAMELY_KEY }}
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## Vercel Configuration

### Project Settings

1. **Framework Preset**: Other
2. **Build Command**: Leave empty
3. **Output Directory**: Leave empty
4. **Install Command**: `npm install`

### Environment Variables Setup

In Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add the following variables for all environments (Production, Preview, Development):

| Name | Value | Environment |
|------|-------|-------------|
| `CIRCLE_AUTH_TOKEN` | Your Circle auth token | All |
| `IFRAMELY_KEY` | Your Iframely key | All |
| `JWT_SECRET` | Strong random string | All |

### Custom Domains (Optional)

1. Go to project settings → Domains
2. Add your custom domain (e.g., `clipper-api.yourdomain.com`)
3. Update extension configuration to use custom domain

## Security Considerations

### Production Security

1. **Environment Variables**: Never commit tokens to Git
2. **CORS**: Consider restricting origins in production
3. **Rate Limiting**: Monitor and adjust rate limits
4. **Logging**: Ensure no sensitive data in logs
5. **HTTPS Only**: Verify all endpoints use HTTPS

### Chrome Extension Store

1. **Content Security Policy**: Verify CSP compliance
2. **Permissions**: Use minimal required permissions
3. **Privacy Policy**: Update if collecting any data
4. **Code Obfuscation**: Consider for intellectual property

## Monitoring & Maintenance

### Health Monitoring

Monitor these endpoints:
- `https://your-backend.vercel.app/health`
- Check response time and status codes
- Set up alerts for failures

### Log Monitoring

Check Vercel function logs for:
- Authentication failures
- API rate limit hits
- Circle API errors
- Unusual traffic patterns

### Update Process

For future updates:

1. Test changes locally
2. Deploy to Vercel preview environment
3. Test with development extension
4. Deploy to production
5. Create new extension package
6. Update Chrome Web Store listing

## Troubleshooting

### Common Issues

**Backend deployment fails**:
- Check environment variables are set
- Verify Vercel account permissions
- Check Node.js version compatibility

**Extension authentication fails**:
- Verify backend URL is correct
- Check CIRCLE_AUTH_TOKEN is valid
- Test health endpoint manually

**Preview not loading**:
- Check IFRAMELY_KEY configuration
- Verify CORS settings
- Test with different URLs

**Posts not creating**:
- Verify Circle token permissions
- Check space ID is correct
- Review backend logs for errors

### Getting Help

1. Check Vercel function logs
2. Test backend endpoints manually
3. Review Chrome extension console
4. Check network tab for failed requests
5. Create issue with detailed error logs