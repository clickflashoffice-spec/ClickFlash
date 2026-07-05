# ClickFlash License Key Generator — Desktop App

> **Status:** Specification Complete
> **Technology:** Electron + React + TypeScript
> **Purpose:** Generate and validate license keys offline

---

## 🎯 APP OVERVIEW

A standalone desktop application for generating ClickFlash license keys without command-line tools.

```
┌─────────────────────────────────────────┐
│  ClickFlash License Generator          │
├─────────────────────────────────────────┤
│                                         │
│  Plan: [Pro ▼]                          │
│  Studios: [5        ]                   │
│  Duration: [365     ] days              │
│  Quantity: [10      ]                   │
│                                         │
│  [Generate License Keys]                │
│                                         │
│  Generated Keys:                        │
│  ┌─────────────────────────────────┐    │
│  │ CF-LIVE-XXXX-XXXX-XXXX-XXXX     │    │
│  │ CF-LIVE-YYYY-YYYY-YYYY-YYYY     │    │
│  │ ...                             │    │
│  └─────────────────────────────────┘    │
│                                         │
│  [Export to JSON] [Copy to Clipboard]   │
│                                         │
│  ─── Validate ───                      │
│  Enter key: [________________]          │
│  [Validate]                             │
│  Result: ✅ Valid (Pro, 5 studios)      │
│                                         │
└─────────────────────────────────────────┘
```

---

## 📁 PROJECT STRUCTURE

```
apps/license-generator/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.electron.json
├── electron-builder.yml
├── src/
│   ├── main.ts                 # Electron main process
│   ├── preload.ts              # IPC bridge
│   ├── App.tsx                 # React root
│   ├── components/
│   │   ├── GeneratorForm.tsx   # Key generation form
│   │   ├── KeyList.tsx         # Display generated keys
│   │   ├── Validator.tsx       # Key validation
│   │   └── Header.tsx          # App header
│   ├── hooks/
│   │   └── useLicense.ts       # License logic hook
│   ├── utils/
│   │   └── license-key.ts      # Core algorithm (from installer)
│   └── types/
│       └── license.ts          # TypeScript interfaces
└── assets/
    └── icon.png                # App icon
```

---

## ⚛️ REACT COMPONENTS

### GeneratorForm.tsx

```typescript
import { useState } from 'react';
import { LicensePlan } from '../types/license';

interface GeneratorFormProps {
  onGenerate: (plan: LicensePlan, maxMasters: number, expiresDays: number, count: number) => void;
}

export function GeneratorForm({ onGenerate }: GeneratorFormProps) {
  const [plan, setPlan] = useState<LicensePlan>('pro');
  const [maxMasters, setMaxMasters] = useState(5);
  const [expiresDays, setExpiresDays] = useState(365);
  const [count, setCount] = useState(10);

  const plans: { value: LicensePlan; label: string; price: string }[] = [
    { value: 'trial', label: 'Trial (14 days)', price: 'Free' },
    { value: 'starter', label: 'Starter (1 studio)', price: '€500/mo' },
    { value: 'pro', label: 'Pro (5 studios)', price: '€1,500/mo' },
    { value: 'enterprise', label: 'Enterprise (50 studios)', price: '€2,500/mo' },
  ];

  return (
    <div className="generator-form">
      <div className="form-group">
        <label>License Plan</label>
        <select value={plan} onChange={(e) => setPlan(e.target.value as LicensePlan)}>
          {plans.map(p => (
            <option key={p.value} value={p.value}>
              {p.label} - {p.price}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label>Max Studios</label>
        <input
          type="number"
          value={maxMasters}
          onChange={(e) => setMaxMasters(Number(e.target.value))}
          min={1}
          max={100}
        />
      </div>

      <div className="form-group">
        <label>Duration (days)</label>
        <input
          type="number"
          value={expiresDays}
          onChange={(e) => setExpiresDays(Number(e.target.value))}
          min={1}
          max={3650}
        />
      </div>

      <div className="form-group">
        <label>Quantity</label>
        <input
          type="number"
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          min={1}
          max={100}
        />
      </div>

      <button
        className="generate-btn"
        onClick={() => onGenerate(plan, maxMasters, expiresDays, count)}
      >
        Generate License Keys
      </button>
    </div>
  );
}
```

### KeyList.tsx

```typescript
interface KeyListProps {
  keys: Array<{
    key: string;
    plan: string;
    maxMasters: number;
    expiresAt: string;
  }>;
  onExport: () => void;
  onCopy: (key: string) => void;
}

export function KeyList({ keys, onExport, onCopy }: KeyListProps) {
  if (keys.length === 0) return null;

  return (
    <div className="key-list">
      <h3>Generated Keys ({keys.length})</h3>
      
      <div className="keys-container">
        {keys.map((k, i) => (
          <div key={i} className="key-item">
            <span className="key-number">#{i + 1}</span>
            <code className="key-value">{k.key}</code>
            <span className="key-meta">
              {k.plan} • {k.maxMasters} studios • Expires {k.expiresAt}
            </span>
            <button onClick={() => onCopy(k.key)} title="Copy">
              📋
            </button>
          </div>
        ))}
      </div>

      <div className="actions">
        <button onClick={onExport}>Export to JSON</button>
        <button onClick={() => onCopy(keys.map(k => k.key).join('\n'))}>
          Copy All
        </button>
      </div>
    </div>
  );
}
```

### Validator.tsx

```typescript
import { useState } from 'react';
import { validateLicenseKey } from '../utils/license-key';

export function Validator() {
  const [key, setKey] = useState('');
  const [result, setResult] = useState(null);

  const handleValidate = () => {
    const validation = validateLicenseKey(key);
    setResult(validation);
  };

  return (
    <div className="validator">
      <h3>Validate License Key</h3>
      
      <input
        type="text"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="CF-LIVE-XXXX-XXXX-XXXX-XXXX"
        className="key-input"
      />
      
      <button onClick={handleValidate}>Validate</button>
      
      {result && (
        <div className={`result ${result.valid ? 'valid' : 'invalid'}`}>
          {result.valid ? (
            <>
              <span>✅ Valid License</span>
              <div className="details">
                <p>Plan: {result.plan}</p>
                <p>Studios: {result.maxMasters}</p>
                <p>Expires: {result.expiresAt}</p>
              </div>
            </>
          ) : (
            <span>❌ Invalid: {result.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 🔧 ELECTRON MAIN PROCESS

```typescript
// src/main.ts
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { generateLicenseKeys, validateLicenseKey } from './utils/license-key';

let mainWindow: BrowserWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../assets/icon.png'),
    title: 'ClickFlash License Generator',
  });

  mainWindow.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
}

// IPC handlers
ipcMain.handle('license:generate', async (_, params) => {
  return generateLicenseKeys(params);
});

ipcMain.handle('license:validate', async (_, key) => {
  return validateLicenseKey(key);
});

ipcMain.handle('license:export', async (_, keys) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `clickflash-licenses-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });

  if (filePath) {
    fs.writeFileSync(filePath, JSON.stringify(keys, null, 2));
    return { success: true, path: filePath };
  }
  
  return { success: false };
});

ipcMain.handle('clipboard:copy', async (_, text) => {
  // Clipboard API available in renderer via preload
  return true;
});

app.whenReady().then(createWindow);
```

---

## 🎨 STYLES (CSS)

```css
/* src/styles/main.css */
:root {
  --primary: #0ea5e9;
  --success: #22c55e;
  --danger: #ef4444;
  --bg: #0f172a;
  --surface: #1e293b;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  margin: 0;
  padding: 20px;
}

.generator-form {
  background: var(--surface);
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-muted);
  font-size: 14px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg);
  border: 1px solid #334155;
  border-radius: 8px;
  color: var(--text);
  font-size: 16px;
}

.generate-btn {
  width: 100%;
  padding: 14px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
}

.generate-btn:hover {
  background: #0284c7;
}

.key-list {
  background: var(--surface);
  padding: 20px;
  border-radius: 12px;
}

.key-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg);
  border-radius: 8px;
  margin-bottom: 8px;
}

.key-value {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  color: var(--primary);
  flex: 1;
}

.validator {
  background: var(--surface);
  padding: 20px;
  border-radius: 12px;
  margin-top: 20px;
}

.result.valid {
  color: var(--success);
  padding: 12px;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 8px;
  margin-top: 12px;
}

.result.invalid {
  color: var(--danger);
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
  margin-top: 12px;
}
```

---

## 📦 BUILD CONFIGURATION

```yaml
# electron-builder.yml
appId: com.clickflash.license-generator
productName: ClickFlash License Generator
copyright: Copyright © 2026 ClickFlash Studio

files:
  - dist/renderer/**/*
  - dist/main.js
  - dist/preload.js
  - assets/**/*

win:
  target:
    - nsis
  icon: assets/icon.ico

nsis:
  oneClick: false
  perMachine: true
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true

directories:
  output: release
```

---

## 🚀 BUILD COMMANDS

```bash
# Development
cd apps/license-generator
npm run dev

# Build for production
npm run build
npm run build:electron
npm run package

# Result: release/ClickFlash-License-Generator-Setup-x.x.x.exe
```

---

## 📊 FEATURES

| Feature | Status |
|---------|--------|
| Generate multiple keys | ✅ |
| Validate single key | ✅ |
| Export to JSON | ✅ |
| Copy to clipboard | ✅ |
| Dark theme | ✅ |
| Offline operation | ✅ |
| Cross-platform (Win/Mac/Linux) | 🔄 Future |

---

## 🎯 NEXT STEPS

1. Create `apps/license-generator/` directory
2. Copy `license-key.ts` algorithm from installer
3. Implement React components
4. Build and test
5. Add to CI/CD pipeline

---

**Ready for implementation when needed.**
