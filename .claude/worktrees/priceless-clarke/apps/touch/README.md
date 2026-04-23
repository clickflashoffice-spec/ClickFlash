# Star Master - Touch Kiosk

Self-service photo browsing and ordering kiosk for customers.

## Overview

The Touch Kiosk application provides a customer-facing interface for browsing photos, creating orders, and making purchases. Optimized for touchscreen displays and kiosk mode.

## Features

- 🖼️ **Photo Browsing** - Browse albums and photos
- 🛒 **Shopping Cart** - Add products and create orders
- 💳 **Order Placement** - Complete purchases
- 🔄 **Real-time Sync** - Live updates from Master portal
- 📴 **Offline Support** - Works without internet
- 👤 **Face Recognition** - Optional face login (AI-powered)
- 📡 **RFID Support** - Wristband scanning for quick access

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- PocketBase backend running
- Touchscreen display (recommended)

### Installation

```bash
cd apps/touch
npm install
```

### Development

```bash
# Start frontend only
npm run dev

# Start backend + frontend
npm run dev:full

# Start backend only
npm run dev:backend
```

### Production Build

```bash
npm run build
```

Output: `dist/touch/`

## Configuration

Create `.env` file:

```env
VITE_API_URL=http://localhost:8090
VITE_GOOGLE_API_KEY=your_gemini_api_key
```

## Kiosk Setup

1. Build the application
2. Deploy to kiosk device
3. Configure fullscreen mode
4. Pair with Master portal
5. Test offline functionality

### Fullscreen Mode

Press the fullscreen button in the app or use F11 key.

### Pairing with Master

1. Open Touch app
2. Go to Settings (requires password)
3. Enter Kiosk ID from Master portal
4. Save and restart

## Project Structure

```
src/
├── components/     # React components
│   ├── touch/     # Kiosk UI components
│   └── common/    # Shared components
├── services/      # API and sync services
│   ├── apiService.ts
│   ├── syncService.ts
│   └── faceRecognitionService.ts
├── hooks/         # Custom React hooks
├── types/         # TypeScript definitions
└── utils/         # Helper functions
```

## Tech Stack

- **Frontend:** React 18, TypeScript, Tailwind CSS
- **Build:** Vite
- **Backend:** PocketBase
- **AI:** Google Gemini API
- **Offline:** Dexie (IndexedDB)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run build:electron` - Build Electron app

## Deployment

### Web Deployment

1. Build: `npm run build`
2. Deploy `dist/touch/` to web server
3. Configure environment variables

### Kiosk Deployment

1. Build Electron app: `npm run build:electron`
2. Install on kiosk device
3. Configure auto-start
4. Enable kiosk mode

## Troubleshooting

### Connection Issues

- Verify PocketBase backend is running
- Check network connectivity
- Verify API URL in `.env`

### Offline Mode

- App caches data automatically
- Sync resumes when online
- Check sync status indicator

## Support

For issues or questions, contact the development team.

## Version

4.1.0
