# ClickFlash Agent Documentation

## Quick Navigation

| Document                                 | Purpose                               |
| :--------------------------------------- | :------------------------------------ |
| [ARCHITECTURE.md](./ARCHITECTURE.md)     | System architecture & 5-app ecosystem |
| [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) | Complete file structure               |
| [TECH_STACK.md](./TECH_STACK.md)         | Technology stack reference            |
| [INDEX.md](./INDEX.md)                   | This file - quick reference           |

---

## Quick Start

### Master Portal

```bash
cd master-app/react-new-backup
npm install
npm run dev:full    # Starts backend (8090) + frontend (5173)
```

### Touch Kiosk

```bash
cd touch-app/react
npm install
npm run dev:full    # Starts backend (8091) + frontend (5174)
```

---

## Project Status

| App              | Status      | Completion                |
| :--------------- | :---------- | :------------------------ |
| Master Portal    | ✅ Complete | Production-Ready          |
| Touch Kiosk      | ✅ Complete | Refactored + E2E          |
| Management Hub   | ✅ Complete | Cloudflare Worker (D1/R2) |
| Customer Gallery | ✅ Complete | Cloudflare Worker (D1/R2) |
| Money Trash      | ✅ Complete | Next.js 15 PWA            |

---

## Key Metrics

- **Total Lines Reduced:** 1,701 (-67%)
- **New Modules Created:** 28
- **E2E Tests Created:** 34
- **Documentation Files:** 9
- **Security Issues Fixed:** 3

---

## Common Tasks

### Run Tests

```bash
# Master
npm run test

# Touch
npx playwright test
```

### Build for Production

```bash
# Master
npm run build
npm run build:backend

# Touch
npm run build
npm run build:backend
npm run package    # Creates Electron app
```

### Database Migrations

```bash
# Auto-runs on server start
# Manual check:
sqlite3 pb_data/master.db ".tables"
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find and kill process
netstat -ano | findstr :8090
taskkill /PID <PID> /F
```

### Database Locked

```bash
# Delete WAL files
del pb_data\master.db-shm
del pb_data\master.db-wal
```

### Sync Not Working

1. Check Master is running (8090)
2. Check Touch is running (8091)
3. Verify network connection
4. Check browser console for errors

---

## Production Endpoints

| Service          | URL                                                                                                  |
| :--------------- | :--------------------------------------------------------------------------------------------------- |
| Management Hub   | [management-hub.clickflash-office.workers.dev](https://management-hub.clickflash-office.workers.dev) |
| Customer Gallery | [gallery.clickandflash.com](https://gallery.clickandflash.com)                                       |
| Marketing Site   | [www.clickandflash.com](https://www.clickandflash.com)                                               |

---

## Maintenance Info

_Last Updated: 2026-02-23_
