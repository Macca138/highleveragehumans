# Firebase Deployment Guide - High Leverage Humans

<div align="center">
  <h2>🚀 Professional Firebase Deployment</h2>
  <p>Step-by-step guide for deploying the High Leverage Humans premium website to Firebase Hosting</p>
  
  [![Firebase](https://img.shields.io/badge/Firebase-Hosting-orange)](https://firebase.google.com/products/hosting)
  [![Performance](https://img.shields.io/badge/Performance-95%2B-brightgreen)](https://web.dev/measure/)
  [![Security](https://img.shields.io/badge/Security-A%2B-green)](https://securityheaders.com/)
</div>

## 📋 Prerequisites

### Required Software
- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 9.0.0 or higher  
- **Firebase CLI**: Latest version
- **Git**: For version control

### Firebase Account Setup
1. **Google Account**: Required for Firebase access
2. **Firebase Project**: Create a new project or use existing
3. **Billing**: Spark (free) or Blaze (pay-as-you-go) plan
4. **Domain**: Custom domain ready for configuration

### Verify Prerequisites

```bash
# Check Node.js version
node --version  # Should be 18.0.0+

# Check npm version
npm --version   # Should be 9.0.0+

# Check Firebase CLI
firebase --version

# Install Firebase CLI if needed
npm install -g firebase-tools
```

## 🔧 Initial Setup

### 1. Project Clone & Dependencies

```bash
# Clone the repository
git clone https://github.com/yourusername/highleveragehumans.git
cd highleveragehumans

# Install root dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 2. Firebase Authentication

```bash
# Login to Firebase
firebase login

# Verify authentication
firebase projects:list
```

### 3. Firebase Project Configuration

```bash
# Initialize Firebase in project (if not already done)
firebase init

# Select features:
# ✅ Firestore: Configure security rules and indexes
# ✅ Functions: Configure Cloud Functions
# ✅ Hosting: Configure files for Firebase Hosting
# ✅ Storage: Configure security rules for Cloud Storage

# Or use existing configuration
firebase use --add
# Select your Firebase project ID
```

## 🏗 Build Process

### 1. Environment Configuration

Create `.env` file in project root:
```env
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_API_KEY=your-api-key
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef

# Production URLs
VITE_API_URL=https://your-project.web.app
VITE_DOMAIN=highleveragehumans.com
```

### 2. Pre-deployment Checks

```bash
# Lint code for quality
npm run lint

# Fix any linting issues
npm run lint:fix

# Format code
npm run format

# Type checking (if using TypeScript)
npm run type-check

# Run tests
npm run test
```

### 3. Production Build

```bash
# Clean previous builds
npm run build:clean

# Create production build
npm run build

# Verify build output
ls -la dist/
```

## 🚀 Deployment Steps

### 1. Deploy Cloud Functions First

```bash
# Deploy only Cloud Functions
firebase deploy --only functions

# Verify function deployment
firebase functions:list
```

**Expected Cloud Functions:**
- `emailCapture`: Email lead capture with validation
- `cleanupAnalytics`: Scheduled cleanup of old analytics data
- `exportLeads`: Admin function for lead data export

### 2. Deploy Firestore Rules & Indexes

```bash
# Deploy database rules and indexes
firebase deploy --only firestore

# Verify Firestore deployment
firebase firestore:indexes
```

### 3. Deploy Storage Rules

```bash
# Deploy storage security rules
firebase deploy --only storage
```

### 4. Deploy Hosting

```bash
# Deploy website to Firebase Hosting
firebase deploy --only hosting

# Or deploy everything at once
firebase deploy
```

### 5. Deployment Verification

```bash
# Check deployment status
firebase hosting:sites:list

# View deployment URLs
firebase hosting:sites:get your-site-id
```

## 🌐 Custom Domain Setup

### 1. Domain Configuration

```bash
# Add custom domain to Firebase
firebase hosting:sites:create highleveragehumans

# Connect custom domain
firebase hosting:sites:get highleveragehumans
```

### 2. DNS Configuration

Add these DNS records to your domain registrar:

```dns
# A Records for root domain
@    A    151.101.1.195
@    A    151.101.65.195

# CNAME for www subdomain  
www  CNAME  highleveragehumans.web.app

# TXT record for domain verification
@    TXT   "firebase-hosting-site=your-site-id"
```

### 3. SSL Certificate Setup

Firebase automatically provisions SSL certificates. Verify:

```bash
# Check SSL status
firebase hosting:sites:get highleveragehumans

# Force HTTPS (already configured in firebase.json)
# "redirects": [{"source": "**", "destination": "https://highleveragehumans.com/**", "type": 301}]
```

## ⚡ Performance Optimization

### 1. Caching Configuration

The `firebase.json` includes optimized caching:

```json
{
  "headers": [
    {
      "source": "**/*.@(js|css)",
      "headers": [{"key": "Cache-Control", "value": "max-age=31536000, immutable"}]
    },
    {
      "source": "**/*.@(jpg|jpeg|gif|png|webp|avif|svg|ico)",
      "headers": [{"key": "Cache-Control", "value": "max-age=2592000"}]
    }
  ]
}
```

### 2. Compression & Security Headers

Pre-configured security headers:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)  
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### 3. Performance Monitoring

```bash
# Install Lighthouse CI for automated testing
npm install -g @lhci/cli

# Run performance audit
lhci autorun --upload.target=temporary-public-storage

# Target metrics:
# Performance: 95+
# Accessibility: 100
# Best Practices: 100
# SEO: 100
```

## 📊 Post-Deployment Verification

### 1. Functionality Testing

Visit your deployed site and verify:

- ✅ **Page Load**: <2s load time
- ✅ **Email Form**: Submission and validation
- ✅ **Mobile Responsive**: All breakpoints
- ✅ **PWA**: Install prompt and offline functionality
- ✅ **Social Media**: Open Graph previews
- ✅ **Analytics**: Event tracking

### 2. Performance Testing Tools

```bash
# Lighthouse CLI
lighthouse https://highleveragehumans.com --view

# Web.dev Measure
# Visit: https://web.dev/measure/

# GTmetrix
# Visit: https://gtmetrix.com/

# PageSpeed Insights  
# Visit: https://pagespeed.web.dev/
```

### 3. Security Testing

```bash
# SSL Labs SSL Test
# Visit: https://www.ssllabs.com/ssltest/

# Security Headers
# Visit: https://securityheaders.com/

# Mozilla Observatory
# Visit: https://observatory.mozilla.org/
```

## 🔄 Deployment Automation

### 1. GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

### 2. Staging Environment

```bash
# Create staging site
firebase hosting:sites:create highleveragehumans-staging

# Deploy to staging
firebase hosting:channel:deploy staging --only hosting

# Test staging URL
# https://highleveragehumans-staging--your-project.web.app
```

## 🚨 Troubleshooting

### Common Issues & Solutions

**1. Build Failures**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version compatibility
nvm use 18
```

**2. Function Deploy Errors**
```bash
# Check function logs
firebase functions:log

# Deploy with debug
firebase deploy --only functions --debug

# Verify function dependencies
cd functions && npm audit fix
```

**3. Domain Connection Issues**
```bash
# Verify DNS propagation
nslookup highleveragehumans.com

# Check domain status
firebase hosting:sites:get highleveragehumans

# Re-verify domain ownership
firebase hosting:sites:verify highleveragehumans
```

**4. Performance Issues**
```bash
# Analyze bundle size
npm run build -- --analyze

# Check for large assets
find dist/ -type f -size +500k

# Optimize images
npm install -g imagemin-cli
imagemin dist/assets/images/* --out-dir=dist/assets/images/
```

## 📈 Monitoring & Analytics

### 1. Firebase Performance Monitoring

```javascript
// Already integrated in main.js
import { getPerformance } from 'firebase/performance';
const perf = getPerformance(app);
```

### 2. Real User Monitoring

```javascript
// Performance metrics tracking
if ('performance' in window) {
  window.addEventListener('load', function() {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart);
  });
}
```

### 3. Error Monitoring

```javascript
// Global error handling (already implemented)
window.addEventListener('error', handleError);
window.addEventListener('unhandledrejection', handleError);
```

## 🔧 Maintenance & Updates

### Regular Maintenance Tasks

```bash
# Update dependencies (monthly)
npm update
cd functions && npm update && cd ..

# Security audit (weekly)
npm audit fix

# Performance check (weekly)
lighthouse https://highleveragehumans.com

# Backup Firestore data (daily)
firebase firestore:export gs://your-bucket/backups/$(date +%Y%m%d)
```

### Rollback Procedure

```bash
# View deployment history
firebase hosting:releases

# Rollback to previous version
firebase hosting:rollback

# Or rollback to specific release
firebase hosting:rollback --site highleveragehumans --release RELEASE_ID
```

## 💡 Advanced Configuration

### 1. Multiple Environments

```bash
# Production
firebase use production
firebase deploy

# Staging  
firebase use staging
firebase deploy --project staging

# Development
firebase use development
firebase emulators:start
```

### 2. Preview Channels

```bash
# Create preview channel
firebase hosting:channel:deploy feature-branch

# Get preview URL
firebase hosting:channel:list
```

### 3. A/B Testing Setup

```javascript
// Firebase Remote Config for A/B testing
import { getRemoteConfig, fetchAndActivate } from 'firebase/remote-config';

const remoteConfig = getRemoteConfig(app);
remoteConfig.settings.minimumFetchIntervalMillis = 3600000;

await fetchAndActivate(remoteConfig);
const newFeatureEnabled = remoteConfig.getBoolean('new_feature_enabled');
```

## 📞 Support & Resources

### Firebase Resources
- **Documentation**: https://firebase.google.com/docs/hosting
- **Console**: https://console.firebase.google.com/
- **Status**: https://status.firebase.google.com/
- **Support**: https://firebase.google.com/support/

### Performance Resources  
- **Web.dev**: https://web.dev/
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse
- **Core Web Vitals**: https://web.dev/vitals/

### Security Resources
- **OWASP**: https://owasp.org/www-project-top-ten/
- **Security Headers**: https://securityheaders.com/
- **SSL Labs**: https://www.ssllabs.com/

---

<div align="center">
  <p><strong>Deployment Complete! 🎉</strong></p>
  <p>Your High Leverage Humans website is now live with enterprise-grade performance and security.</p>
  <p>
    <a href="https://highleveragehumans.com">Visit Site</a> •
    <a href="https://console.firebase.google.com/">Firebase Console</a> •
    <a href="mailto:hello@highleveragehumans.com">Get Support</a>
  </p>
</div>