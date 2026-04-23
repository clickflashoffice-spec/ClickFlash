# ClickFlash Deployment Guide

> Step-by-step guide for deploying the ClickFlash Photography Ecosystem

---

## 🚀 Deployment Overview

### Deployment Matrix

| App        | Type             | Platform       | Deploy Method |
| :--------- | :--------------- | :------------- | :------------ |
| Master     | Electron Desktop | Windows        | Auto-updater  |
| Touch      | Electron Kiosk   | Windows        | Manual/Auto   |
| MoneyTrash | Next.js          | Vercel/Railway | Git Push      |
| Management | React + Vite     | Netlify/Vercel | Git Push      |
| Gallery    | React + Vite     | Netlify/Vercel | Git Push      |
| Website    | Next.js          | Vercel/Railway | Git Push      |

---

## 📋 Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing
- [ ] No critical security vulnerabilities
- [ ] Code reviewed and approved
- [ ] Version bumped in package.json
- [ ] CHANGELOG.md updated

### Environment Configuration

- [ ] Environment variables set
- [ ] Database migrations prepared
- [ ] SSL certificates ready (if needed)
- [ ] Domain/DNS configured

### Resources

- [ ] Server capacity verified
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Monitoring configured

---

## 🖥️ Desktop Apps (Master & Touch)

### Build Process

```bash
# Master App
cd apps/master
npm ci
npm run build
npm run dist

# Touch App
cd apps/touch
npm ci
npm run build
npm run dist
```

### Auto-Updater Setup

```json
// package.json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-org",
      "repo": "clickflash",
      "releaseType": "release"
    }
  }
}
```

### Release Process

1. **Create Git Tag**

   ```bash
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```

2. **GitHub Actions Builds**
   - CI/CD automatically builds installers
   - Assets uploaded to GitHub Releases

3. **Distribute**
   - Users receive auto-update notification
   - Or download from releases page

---

## 🌐 Web Apps Deployment

### 1. MoneyTrash (Next.js)

#### Vercel Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd apps/moneytrash
vercel --prod
```

#### Environment Variables (Vercel)

```env
NEXT_PUBLIC_API_URL=https://api.clickflash.app
NEXT_PUBLIC_STRIPE_KEY=pk_live_...
DATABASE_URL=postgresql://...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Railway Deployment

```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
cd apps/moneytrash
railway login
railway link
railway up
```

### 2. Management Hub (React + Vite)

#### Netlify Deployment

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd apps/management
npm run build
netlify deploy --prod --dir=dist
```

#### Environment Variables (Netlify)

```env
VITE_API_URL=https://api.clickflash.app
VITE_WS_URL=wss://ws.clickflash.app
VITE_STORAGE_URL=https://storage.clickflash.app
```

### 3. Gallery (React + Vite)

Same process as Management Hub:

```bash
cd apps/gallery
npm run build
netlify deploy --prod --dir=dist
```

### 4. Website (Next.js)

Same process as MoneyTrash:

```bash
cd apps/website
vercel --prod
```

---

## 🗄️ Database Deployment

### SQLite Deployment

```bash
# Backup current database
cp data/clickflash.db data/clickflash-backup-$(date +%Y%m%d).db

# Deploy with WAL mode enabled
sqlite3 data/clickflash.db "PRAGMA journal_mode=WAL;"
```

### Database Migrations

```bash
# Run migrations
cd apps/master/backend
node scripts/migrate.js
```

### Backup Strategy

```bash
#!/bin/bash
# backup-db.sh
BACKUP_DIR="/backups/clickflash"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup
sqlite3 data/clickflash.db ".backup '${BACKUP_DIR}/backup_${DATE}.db'"

# Keep only last 30 backups
ls -t ${BACKUP_DIR}/backup_*.db | tail -n +31 | xargs rm -f
```

---

## 🔐 SSL/TLS Setup

### Let's Encrypt (Web Apps)

```bash
# Install Certbot
sudo apt install certbot

# Obtain certificate
sudo certbot certonly --standalone -d clickflash.app -d www.clickflash.app

# Auto-renewal
sudo certbot renew --dry-run
```

### Self-Signed (Local/Electron)

```bash
# Generate certificates
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

---

## 📊 Monitoring Setup

### Application Monitoring (Sentry)

```bash
# Install Sentry SDK
npm install @sentry/react @sentry/electron

# Initialize in main process (Electron)
import * as Sentry from '@sentry/electron/main';

Sentry.init({
  dsn: 'YOUR_SENTRY_DSN',
  environment: 'production',
  release: process.env.npm_package_version,
});
```

### Server Monitoring (UptimeRobot)

- Monitor API endpoints
- Alert on downtime
- Check every 5 minutes

### Performance Monitoring

```javascript
// Web Vitals tracking
import { getCLS, getFID, getFCP, getLCP, getTTFB } from "web-vitals";

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
  fetch("/api/analytics/web-vitals", {
    method: "POST",
    body: JSON.stringify(metric),
  });
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

Already configured in `.github/workflows/`:

- `ci.yml` - Runs on PR/push
- `cd.yml` - Runs on tag/release
- `e2e.yml` - Runs E2E tests

### Deployment Triggers

```yaml
# Release triggers
on:
  push:
    tags:
      - "v*" # Triggers on v1.0.0, v1.2.3, etc.
```

---

## 🛡️ Security Checklist

### Pre-Deployment

- [ ] Run `npm audit` - fix critical issues
- [ ] Enable CSP headers
- [ ] Configure CORS properly
- [ ] Set secure cookies
- [ ] Enable HSTS
- [ ] Remove debug logging
- [ ] Rotate API keys

### Headers Configuration

```nginx
# nginx.conf
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
```

---

## 📱 Post-Deployment Verification

### Health Checks

```bash
# API Health
curl https://api.clickflash.app/health

# Web Apps
curl -I https://app.clickflash.app
curl -I https://gallery.clickflash.app
```

### Smoke Tests

- [ ] User can log in
- [ ] Photos can be uploaded
- [ ] Orders can be created
- [ ] Payments process correctly
- [ ] Emails are sent
- [ ] Auto-updater works

---

## 🚨 Rollback Procedure

### Desktop Apps

1. Revert to previous release tag
2. Users will auto-update on next check

### Web Apps

```bash
# Vercel
vercel --prod --version PREVIOUS_VERSION

# Netlify
netlify deploy --prod --dir=dist --alias=rollback
```

### Database

```bash
# Restore from backup
sqlite3 data/clickflash.db ".restore 'backup_20260131.db'"
```

---

## 📚 Deployment Commands Reference

### Quick Deploy All

```bash
# Desktop apps
cd apps/master && npm run dist
cd apps/touch && npm run dist

# Web apps
cd apps/moneytrash && vercel --prod
cd apps/management && npm run build && netlify deploy --prod
cd apps/gallery && npm run build && netlify deploy --prod
cd apps/website && vercel --prod
```

### Using Batch Files

```bash
# Use the provided batch files
cd E:\ClickFlash

# Build all
build-all.bat

# Deploy all
deploy-all.bat
```

---

## 🆘 Troubleshooting

### Common Issues

#### Build Fails

```bash
# Clear caches
npm run clean-all

# Reinstall dependencies
npm run install-all

# Try again
npm run build-all
```

#### Auto-Updater Not Working

- Check GitHub token permissions
- Verify release assets exist
- Check update server URL

#### Database Locked

```bash
# Check locks
lsof data/clickflash.db

# Kill processes if needed
kill -9 <PID>

# Repair database
sqlite3 data/clickflash.db ".recover" | sqlite3 data/clickflash-recovered.db
```

---

## 📞 Support

### Deployment Issues

- Check GitHub Actions logs
- Review application logs
- Contact: <devops@clickflash.app>

### Emergency Contacts

- Primary: +1 (555) 0100
- Secondary: +1 (555) 0101

---

### Additional Resources

- [Architecture Reference](./ARCHITECTURE.md)
- [API Documentation](./API.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

---

**Version:** 2.1.0
**Last Updated:** March 2026
