# Touch App Quick Start Guide

## 🚀 Quick Deployment

### 1. Web Deployment (5 minutes)
```bash
# Build
npm run build

# Deploy locally
npm run preview

# Or copy to web server
cp -r dist/touch/* /var/www/html/touch/
```

### 2. Desktop App (10 minutes)
```bash
# Install dependencies
npm install electron electron-builder --save-dev

# Build for Windows
npm run electron:build -- --win
```

### 3. Using Deployment Scripts
```bash
# Windows
.\scripts\deploy.ps1 -DeployTarget local

# Linux/Mac
./scripts/deploy.sh local
```

---

## ⚙️ Configuration

### Quick Setup
1. Copy `.env.example` to `.env.local`
2. Update `VITE_API_URL` with your backend URL
3. Rebuild: `npm run build`

### Example Configuration
```env
VITE_API_URL=http://192.168.1.100:8090
VITE_WS_URL=ws://192.168.1.100:8090
VITE_ENABLE_OFFLINE_MODE=true
```

---

## 🔧 Common Commands

```bash
# Development
npm run dev              # Start dev server

# Production
npm run build            # Build for production
npm run preview          # Preview production build

# Electron
npm run electron:dev     # Run in Electron (dev)
npm run electron:build   # Build desktop app

# Deployment
npm run deploy:local     # Deploy locally
npm run deploy:remote    # Deploy to remote server
```

---

## 📁 File Structure
```
touch/
├── dist/touch/          # Production build
├── electron/            # Electron app files
├── scripts/             # Deployment scripts
├── src/                 # Source code
├── .env.example         # Environment template
├── .env.production      # Production config
└── DEPLOYMENT.md        # Full documentation
```

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't connect to API | Check `VITE_API_URL` in `.env.local` |
| White screen | Check browser console (F12) |
| Build fails | Run `npm install` and try again |
| Slow performance | Enable gzip on web server |

---

## 📞 Need Help?
See full documentation in `DEPLOYMENT.md`
