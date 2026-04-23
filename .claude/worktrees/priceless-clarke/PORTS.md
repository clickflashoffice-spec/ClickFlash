# ClickFlash Unified Port Configuration

> All applications use standardized ports for consistent development and deployment

---

## 📊 Port Assignment Table

### Desktop Apps (Electron)

| Application | Backend Port | Vite Dev Port | Production Port |
|-------------|--------------|---------------|-----------------|
| **Master** | 8090 | 5173 | 8090 |
| **Touch** | 8091 | 5175 | 8091 |

### Web Apps

| Application | Port | Type | Stack |
|-------------|------|------|-------|
| **MoneyTrash** | 3000 | Next.js | Full-stack |
| **Management** | 5173 | React + Vite | Frontend-only |
| **Gallery** | 5174 | React + Vite | Frontend-only |
| **Website** | 3001 | Next.js | Full-stack |

---

## 🔗 Port Explanation

### Electron Apps (Master & Touch)

**Development Mode:**
- **Backend (Express)**: Runs on unified port (8090/8091)
- **Frontend (Vite)**: Runs on separate dev port (5173/5175)
- Vite proxies API requests to the backend

**Production Mode:**
- **Backend (Express)**: Serves static files on unified port (8090/8091)
- **Frontend**: Built as static files, served by Express

### Web Apps (Management, Gallery, MoneyTrash, Website)

These apps run on a single port:
- **Management**: Port 5173 (Vite dev server)
- **Gallery**: Port 5174 (Vite dev server)
- **MoneyTrash**: Port 3000 (Next.js)
- **Website**: Port 3001 (Next.js)

---

## 🚀 Quick Start Commands

```bash
# Desktop Apps (runs both backend + frontend)
cd apps/master && npm run dev:full      # Backend: 8090, Vite: 5173
cd apps/touch && npm run dev:full       # Backend: 8091, Vite: 5175

# Web Apps
cd apps/moneytrash && npm run dev       # Port 3000
cd apps/management && npm run dev       # Port 5173
cd apps/gallery && npm run dev          # Port 5174
cd apps/website && npm run dev          # Port 3001
```

---

## 🌐 Access URLs

### Master App (Development)
- Vite Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8090/api`
- WebSocket: `ws://localhost:8090`

### Touch App (Development)
- Vite Frontend: `http://localhost:5175`
- Backend API: `http://localhost:8091/api`
- WebSocket: `ws://localhost:8091`

### Web Apps
- MoneyTrash: `http://localhost:3000`
- Management: `http://localhost:5173`
- Gallery: `http://localhost:5174`
- Website: `http://localhost:3001`

---

## ⚙️ Configuration Files

| App | Backend Port | Vite Port |
|-----|--------------|-----------|
| Master | `apps/master/.env` (PORT=8090) | `apps/master/vite.config.ts` (5173) |
| Touch | `apps/touch/.env` (PORT=8091) | `apps/touch/vite.config.ts` (5175) |
| MoneyTrash | `apps/moneytrash/.env` (PORT=3000) | N/A |
| Management | N/A | `apps/management/vite.config.ts` (5173) |
| Gallery | N/A | `apps/gallery/vite.config.ts` (5174) |
| Website | `apps/website/.env` (PORT=3001) | N/A |

---

## 🔥 Port Conflicts

If a port is already in use:

```bash
# Kill all Node processes
taskkill /F /IM node.exe

# Or use the batch file
cd E:\ClickFlash
kill-all.bat
```

---

## 📝 Environment Variables

### Master App (.env)
```env
# Backend port (Express server)
PORT=8090

# Vite dev server port (configured in vite.config.ts)
# server: { port: 5173 }
```

### Touch App (.env)
```env
# Backend port (Express server)
PORT=8091

# Vite dev server port (configured in vite.config.ts)
# server: { port: 5175 }
```

---

*Last Updated: 2026-01-31*
