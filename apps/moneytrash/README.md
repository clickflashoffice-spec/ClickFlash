# MoneyTrash Uploader Desktop

> **Professional photography upload gateway - Now as a Desktop App!**
>
> Built with Electron (Node.js/TypeScript + React) for native performance and file system access.

## ✨ What's New in Desktop Version

### 🖥️ Native Desktop Features
- **Native File Picker** - Browse files and folders using OS-native dialogs (no browser limitations)
- **System Notifications** - Desktop notifications when uploads complete
- **Single Instance** - Only one app instance runs at a time
- **Native Window** - Proper window management with OS chrome
- **File System Access** - Direct file reading without browser sandbox restrictions

### 📤 Enhanced Upload Features
- **Drag & Drop** - Modern drag-and-drop interface for quick uploads
- **Batch Processing** - Concurrent file uploads with progress tracking
- **Image Previews** - Thumbnail previews before upload
- **Progress Tracking** - Individual file progress + overall progress bar
- **File Queue Management** - Add/remove files before upload
- **Upload History** - Track recent uploads with timestamps

### 🎯 Two Upload Modes
- **New Gallery** - Create client proofing galleries with pricing
- **Order Backup** - Backup sold orders to secure cloud storage

### 🛡️ File Validation
- Supported formats: JPEG, PNG, HEIC, WebP
- Maximum file size: 50MB per file
- Automatic file type detection
- Error handling for invalid files

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Node.js/TypeScript](https://rustup.rs/) (latest stable)
- [Electron Prerequisites](https://electron.app/start/prerequisites/) (Platform-specific dependencies)

### Installation

```bash
# Navigate to the app directory
cd apps/moneytrash

# Install Node dependencies
npm install

# Install Electron CLI (if not already installed)
npm install -D electron
```

### Development

```bash
# Start development mode (hot reload)
npm run electron:dev
```

This will:
1. Start the Vite development server on port 1420
2. Compile and launch the Electron desktop app
3. Enable hot reloading for both frontend and Node.js/TypeScript code

### Build for Production

```bash
# Build for current platform
npm run electron:build
```

Output locations:
- **Windows**: `src-electron/target/release/bundle/msi/`, `src-electron/target/release/bundle/nsis/`
- **macOS**: `src-electron/target/release/bundle/macos/`, `src-electron/target/release/bundle/dmg/`
- **Linux**: `src-electron/target/release/bundle/deb/`, `src-electron/target/release/bundle/appimage/`

### Platform-Specific Builds

```bash
# Windows (.msi installer + .exe)
npm run electron:build -- --target x86_64-pc-windows-msvc

# macOS Intel (.app + .dmg)
npm run electron:build -- --target x86_64-apple-darwin

# macOS Apple Silicon (.app + .dmg)
npm run electron:build -- --target aarch64-apple-darwin

# Linux (.deb package + AppImage)
npm run electron:build -- --target x86_64-unknown-linux-gnu
```

## 📁 Project Structure

```
apps/moneytrash/
├── src/                          # Frontend React code
│   ├── App.tsx                  # Main application component
│   ├── main.tsx                 # Entry point
│   ├── index.css                # Global styles (Tailwind)
│   └── services/
│       └── desktopBatchUploadService.ts  # Upload logic
│
├── src-electron/                    # Node.js/TypeScript backend code
│   ├── src/
│   │   ├── main.rs              # Electron entry point
│   │   └── commands.rs          # Node.js/TypeScript commands (file system, notifications)
│   ├── package.json               # Node.js/TypeScript dependencies
│   ├── build.rs                 # Build script
│   └── electron-builder.yml          # Electron configuration
│
├── index.html                    # HTML entry point
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS v3 configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Node dependencies
```

## 🔧 Configuration

### Application Settings

Access settings via the **Settings** button in the app header:

- **API Endpoint** - Backend API URL (default: `http://localhost:8090`)
- **Save Upload History** - Keep track of recent uploads
- **Use Native File Picker** - Toggle between drag-drop and native file dialogs

### Data Storage

The app stores configuration and upload history in:

- **Windows**: `%APPDATA%/moneytrash-uploader/`
- **macOS**: `~/Library/Application Support/moneytrash-uploader/`
- **Linux**: `~/.config/moneytrash-uploader/`

### Environment Variables

Create a `.env` file in `apps/moneytrash/`:

```env
VITE_API_URL=http://localhost:8090
```

## 🔌 API Integration

The desktop app communicates with your backend API:

### Upload Endpoints

```typescript
// Initialize chunked upload
POST /api/upload/chunk
Body: {
  fileName: string,
  fileSize: number,
  metadata: {
    eventName: string,
    accessCode: string,
    mode: 'moneytrash' | 'sold',
    mime_type?: string
  }
}

// Upload file chunk
PUT /api/upload/chunk
Body: FormData {
  sessionId: string,
  chunkIndex: number,
  chunk: Blob
}

// Finalize upload
PATCH /api/upload/chunk
Body: {
  sessionId: string
}
```

## 🎨 UI Features

### Main Interface
- **Header** - App title with Settings, History buttons, and Mode toggle
- **Left Panel** - Gallery metadata form (event name, access code, pricing)
- **Right Panel** - Dropzone with file grid and preview thumbnails

### Desktop-Specific UI Elements
- **Native File Buttons** - "Browse Files" and "Select Folder" buttons
- **Settings Panel** - Configure API endpoint and preferences
- **System Notifications** - Native OS notifications on completion

## 📋 Gallery Metadata

When creating a new gallery:

- **Event Name** - Descriptive name (e.g., "Summer Wedding 2026")
- **Access Code** - Unique identifier (letters, numbers, hyphens)
- **Single Photo Price** - Price per individual photo
- **Full Gallery Price** - Price for complete gallery access
- **Customer Email** - For sending "Ready to View" notifications
- **Send Notification** - Auto-email customer when upload completes

## 🛠️ Development Commands

```bash
# Frontend development (Vite only)
npm run dev

# Production build (frontend only)
npm run build

# Preview production build
npm run preview

# Electron development (full app)
npm run electron:dev

# Electron production build
npm run electron:build

# Run linter
npm run lint
```

## 🔧 Customization

### Icons

Replace icons in `src-electron/icons/`:
- `icon.icns` - macOS icon (multiple sizes)
- `icon.ico` - Windows icon (multiple sizes)
- `32x32.png`, `128x128.png`, `128x128@2x.png` - Linux and other platforms

Recommended tool: [electron-icon](https://github.com/electron-apps/electron-icon)

```bash
npm install -D electron-icon-maker
electron-icon input-icon.png
```

### Window Settings

Edit `src-electron/electron-builder.yml`:

```json
{
  "app": {
    "windows": [{
      "title": "MoneyTrash Uploader",
      "width": 1400,
      "height": 900,
      "resizable": true,
      "fullscreen": false,
      "center": true,
      "decorations": true
    }]
  }
}
```

### Adding New Node.js/TypeScript Commands

1. **Add command in `src-electron/src/commands.rs`**:
```rust
#[electron::command]
pub async fn your_command(arg: String) -> Result<String, String> {
    // Your logic here
    Ok(format!("Result: {}", arg))
}
```

2. **Register in `src-electron/src/main.rs`**:
```rust
.invoke_handler(electron::generate_handler![
    commands::your_command,
])
```

3. **Call from frontend**:
```typescript
import { invoke } from '@electron-apps/api/core';
const result = await invoke<string>('your_command', { arg: 'value' });
```

## 🐛 Troubleshooting

### Build Errors

**Node.js/TypeScript not found**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

**Electron CLI not found**:
```bash
npm install -D electron
```

**Node modules issues**:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Runtime Issues

**API not reachable**:
- Check API endpoint in Settings
- Verify backend is running
- Check firewall settings

**File access denied**:
- Ensure app has file system permissions
- Check file/folder permissions

**Notifications not showing**:
- Check OS notification settings
- Ensure app is allowed to show notifications

### Platform-Specific

**Windows**:
- Install Visual Studio Build Tools
- Enable Windows Developer Mode (for symlinks)

**macOS**:
- Install Xcode Command Line Tools: `xcode-select --install`
- For Apple Silicon, ensure Rosetta 2 is installed if needed

**Linux**:
- Install platform dependencies (varies by distro)
- See [Electron Linux prerequisites](https://electron.app/start/prerequisites/#linux)

## 📊 Performance

- **Bundle Size**: ~3-5MB (much smaller than Electron!)
- **Memory Usage**: ~50-100MB RAM
- **Startup Time**: <1 second
- **File Reading**: Native performance via Node.js/TypeScript

## 🔒 Security

- Sandboxed file system access (scoped to app directories)
- No web server required in production
- Native OS security model
- Signed executables (when configured)

## 📄 Migration from Web Version

The desktop app replaces the Next.js web version. Key differences:

| Feature | Web (Old) | Desktop (New) |
|---------|-----------|---------------|
| File Access | Browser File API | Native file system |
| File Picker | HTML input | OS-native dialogs |
| Notifications | Browser API | System notifications |
| Storage | Browser storage | Native app data directory |
| Distribution | Web server | Installable executable |
| Size | Requires browser | Self-contained |

## 📝 License

Private - ClickFlash Photography Solutions

---

Built with ❤️ using [Electron](https://electron.app/), [React](https://react.dev/), and [Node.js/TypeScript](https://www.rust-lang.org/)
