# Hardcoded Secrets in Source Code

> **Finding**: 228 potential hardcoded secrets in source files (excluding .env)

> **Action Required**: Review each file and move secrets to environment variables


## `apps/management/backend/worker-configuration.d.ts` (25 matches)

- Line 29: `PASSWORD_IN_URL` — ` the License at http://www.apache.org/licenses/LICENSE-2.0 T`
- Line 63: `PASSWORD_IN_URL` — `MDN Reference](https://developer.mozilla.org/docs/Web/API/DO`
- Line 647: `PASSWORD_IN_URL` — `MDN Reference](https://developer.mozilla.org/docs/Web/API/Ev`
- Line 666: `PASSWORD_IN_URL` — `MDN Reference](https://developer.mozilla.org/docs/Web/API/Ev`
- Line 685: `PASSWORD_IN_URL` — `MDN Reference](https://developer.mozilla.org/docs/Web/API/Ev`

## `apps/website/src/components/seo/JsonLd.tsx` (15 matches)

- Line 12: `PASSWORD_IN_URL` — `  "@context": "https://schema.org";   "@type": string; }  //`
- Line 170: `PASSWORD_IN_URL` — `  "@context": "https://schema.org",   "@type": "Organization`
- Line 195: `PASSWORD_IN_URL` — `  "@context": "https://schema.org",   "@type": "Professional`
- Line 197: `PASSWORD_IN_URL` — `ce",   "@id": "https://clickflash.com",   name: "ClickFlash `
- Line 217: `PASSWORD_IN_URL` — `  "@context": "https://schema.org",   "@type": "Service",   `

## `apps/website/public/manage/assets/index-CulmLkEM.js` (8 matches)

- Line 1: `PASSWORD_IN_URL` — `fferent prop. (https://react.dev/link/special-props)",se))}N`
- Line 38: `PASSWORD_IN_URL` — `eact DevTools. https://react.dev/link/react-devtools"),!0;tr`
- Line 235: `PASSWORD_IN_URL` — `V("svg",{xmlns:"http://www.w3.org/2000/svg",className:"h-4 w`
- Line 238: `PASSWORD_IN_URL` — `js:data"))},bN="http://www.w3.org/2000/svg",V0="http://www.w`
- Line 269: `PASSWORD_IN_URL` — `,total:0,SVGNS:"http://www.w3.org/2000/svg",svgWidth:0,svgHe`

## `apps/gallery/src/constants.ts` (5 matches)

- Line 11: `PASSWORD_IN_URL` — `_URLS = [     'https://images.unsplash.com/photo-15075254280`
- Line 71: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=alaeddine', role:`
- Line 72: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=jane', role: 'Tea`
- Line 73: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=carlos', role: 'A`
- Line 74: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=emily', role: 'Ph`

## `apps/master/src/constants.ts` (5 matches)

- Line 12: `PASSWORD_IN_URL` — `TER_BASE_URL = `http://${DEFAULT_MASTER_HOST}:${DEFAULT_MAST`
- Line 77: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=alaeddine', role:`
- Line 78: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=jane', role: 'Tea`
- Line 79: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=carlos', role: 'A`
- Line 80: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=emily', role: 'Ph`

## `apps/touch/src/constants.ts` (5 matches)

- Line 12: `PASSWORD_IN_URL` — `TER_BASE_URL = `http://${DEFAULT_MASTER_HOST}:${DEFAULT_MAST`
- Line 81: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=alaeddine', role:`
- Line 82: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=jane', role: 'Tea`
- Line 83: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=carlos', role: 'A`
- Line 84: `PASSWORD_IN_URL` — `', avatarUrl: 'https://i.pravatar.cc/150?u=emily', role: 'Ph`

## `apps/management/backend/master/server.js` (4 matches)

- Line 133: `PASSWORD_IN_URL` — `   : [         'http://localhost:5173',         'http://loca`
- Line 990: `PASSWORD_IN_URL` — `w URL(req.url, `http://${req.headers.host}`);     const path`
- Line 1139: `PASSWORD_IN_URL` — `w URL(req.url, `http://${req.headers.host}`);               `
- Line 1913: `PASSWORD_IN_URL` — `w URL(req.url, `http://${req.headers.host}`);               `

## `apps/management/backend/src/__tests__/server.test.ts` (4 matches)

- Line 44: `PASSWORD_IN_URL` — ` = new Request('http://localhost:8787/api/health');         `
- Line 94: `PASSWORD_IN_URL` — ` = new Request('http://localhost:8787/api/auth/login', {    `
- Line 117: `PASSWORD_IN_URL` — ` = new Request('http://localhost:8787/api/auth/login', {    `
- Line 149: `PASSWORD_IN_URL` — `               'http://localhost:8787/api/orders/by-credenti`

## `apps/master/electron-main.js` (4 matches)

- Line 7: `PASSWORD_IN_URL` — `ds via loadURL("http://localhost:8090").  *                A`
- Line 45: `PASSWORD_IN_URL` — `ution via clickflash:// URIs     },   }, ]);  // ─── Config `
- Line 335: `PASSWORD_IN_URL` — `url.startsWith("file://") || url.startsWith("data:") || url.`
- Line 668: `PASSWORD_IN_URL` — `"blob:", "clickflash://"],       fontSrc: ["'self'", "data:"`

## `apps/gallery/service-worker.js` (3 matches)

- Line 11: `PASSWORD_IN_URL` — `fest.json',   'https://i.imgur.com/3Y2j2s2.png',   // Note: `
- Line 16: `PASSWORD_IN_URL` — `m importmap   'https://unpkg.com/pocketbase/dist/pocketbase.`
- Line 18: `PASSWORD_IN_URL` — `t@^19.2.0',   'https://aistudiocdn.com/react-dom@^19.2.0',  `

## `apps/management/service-worker.js` (3 matches)

- Line 11: `PASSWORD_IN_URL` — `fest.json',   'https://i.imgur.com/3Y2j2s2.png',   // Note: `
- Line 16: `PASSWORD_IN_URL` — `m importmap   'https://unpkg.com/pocketbase/dist/pocketbase.`
- Line 18: `PASSWORD_IN_URL` — `t@^19.2.0',   'https://aistudiocdn.com/react-dom@^19.2.0',  `

## `apps/master/electron-main.ts` (3 matches)

- Line 8: `PASSWORD_IN_URL` — `ds via loadURL("http://localhost:8090").  *                A`
- Line 66: `PASSWORD_IN_URL` — `ALTH_URL     = `http://localhost:${BACKEND_PORT}/api/health``
- Line 319: `PASSWORD_IN_URL` — `url.startsWith("file://") || url.startsWith("data:") || url.`

## `apps/master/electron-new/tests/e2e/auth.spec.ts` (3 matches)

- Line 5: `PASSWORD_IN_URL` — `ctronPage.goto('http://localhost:5173/login');          cons`
- Line 22: `PASSWORD_IN_URL` — `ctronPage.goto('http://localhost:5173/login');          awai`
- Line 35: `PASSWORD_IN_URL` — `ctronPage.goto('http://localhost:5173/login');     await ele`

## `apps/master/electron-new/tests/e2e/visual.spec.ts` (3 matches)

- Line 11: `PASSWORD_IN_URL` — `ctronPage.goto('http://localhost:5173/login');     await ele`
- Line 40: `PASSWORD_IN_URL` — `ctronPage.goto('http://localhost:5173/login');     await ele`
- Line 46: `PASSWORD_IN_URL` — `ctronPage.goto('http://localhost:5173/albums');     await el`

## `apps/touch/public/service-worker.js` (3 matches)

- Line 11: `PASSWORD_IN_URL` — `fest.json',   'https://i.imgur.com/3Y2j2s2.png',   // Note: `
- Line 16: `PASSWORD_IN_URL` — `m importmap   'https://unpkg.com/pocketbase/dist/pocketbase.`
- Line 18: `PASSWORD_IN_URL` — `t@^19.2.0',   'https://aistudiocdn.com/react-dom@^19.2.0',  `

## `apps/website/public/gallery/service-worker.js` (3 matches)

- Line 11: `PASSWORD_IN_URL` — `fest.json',   'https://i.imgur.com/3Y2j2s2.png',   // Note: `
- Line 16: `PASSWORD_IN_URL` — `m importmap   'https://unpkg.com/pocketbase/dist/pocketbase.`
- Line 18: `PASSWORD_IN_URL` — `t@^19.2.0',   'https://aistudiocdn.com/react-dom@^19.2.0',  `

## `apps/website/public/gallery/assets/index-C9hhMWVa.js` (3 matches)

- Line 2: `PASSWORD_IN_URL` — `fferent prop. (https://react.dev/link/special-props)",ae))}x`
- Line 23: `PASSWORD_IN_URL` — `eact DevTools. https://react.dev/link/react-devtools"),!0;tr`
- Line 220: `PASSWORD_IN_URL` — `.baseUrlValue||"http://127.0.0.1:8090",p=await fetch(`${u}/a`

## `apps/gallery/backend/src/server.ts` (2 matches)

- Line 249: `PASSWORD_IN_URL` — `success_url", `https://gallery.clickflash.com/success?sessio`
- Line 1230: `PASSWORD_IN_URL` — `_id         ? `https://gallery.clickflash.com/album/${cart.a`

## `apps/gallery/src/services/syncService.ts` (2 matches)

- Line 33: `PASSWORD_IN_URL` — `is.masterUrl = `http://${savedIp}:8090`;         }     }    `
- Line 43: `PASSWORD_IN_URL` — `is.masterUrl = `http://${ip}:8090`;         localStorage.set`

## `apps/management/backend/src/server.ts` (2 matches)

- Line 603: `PASSWORD_IN_URL` — `              `https://generativelanguage.googleapis.com/v1b`
- Line 2398: `PASSWORD_IN_URL` — ` galleryUrl = `https://gallery.clicketflash.com/${cart.galle`

## `apps/management/src/services/syncService.ts` (2 matches)

- Line 40: `PASSWORD_IN_URL` — `is.masterUrl = `http://${savedIp}:8090`;         }     }    `
- Line 50: `PASSWORD_IN_URL` — `is.masterUrl = `http://${ip}:8090`;         localStorage.set`

## `apps/master/electron-new/tests/e2e/features.spec.ts` (2 matches)

- Line 5: `PASSWORD_IN_URL` — `ctronPage.goto('http://localhost:5173/login');     await ele`
- Line 11: `PASSWORD_IN_URL` — `ctronPage.goto('http://localhost:5173/albums');     await el`

## `apps/master/scripts/install-cli.ts` (2 matches)

- Line 19: `PASSWORD_IN_URL` — `RE_API_URL || 'https://api.cloudflare.com/client/v4'; const `
- Line 425: `PASSWORD_IN_URL` — `  const url = `https://github.com/cloudflare/cloudflared/rel`

## `apps/master/scripts/setup-kiosk.ps1` (2 matches)

- Line 106: `PASSWORD_IN_URL` — `tion     xmlns="http://schemas.microsoft.com/AssignedAccess/`
- Line 140: `PASSWORD_IN_URL` — `tion     xmlns="http://schemas.microsoft.com/ShellLauncher/2`

## `apps/touch/scripts/setup-kiosk.ps1` (2 matches)

- Line 107: `PASSWORD_IN_URL` — `tion     xmlns="http://schemas.microsoft.com/AssignedAccess/`
- Line 154: `PASSWORD_IN_URL` — `tion     xmlns="http://schemas.microsoft.com/ShellLauncher/2`

## `apps/touch/src/services/__tests__/syncService.test.ts` (2 matches)

- Line 43: `PASSWORD_IN_URL` — ` baseUrlValue: 'http://localhost:8091',             collecti`
- Line 130: `PASSWORD_IN_URL` — `h(             'http://192.168.1.100:8090/api/orders/kiosk/o`

## `apps/website/public/gallery/assets/index-BKjQkWmz.js` (2 matches)

- Line 63: `PASSWORD_IN_URL` — `React loaded.  https://react.dev/link/hydration-mismatch`+a)`
- Line 103: `PASSWORD_IN_URL` — `.baseUrlValue||"http://127.0.0.1:8090",p=await fetch(`${u}/a`

## `apps/website/public/manage/assets/index-jN4d3Fsi.js` (2 matches)

- Line 63: `PASSWORD_IN_URL` — `React loaded.  https://react.dev/link/hydration-mismatch`+a)`
- Line 103: `PASSWORD_IN_URL` — `V("svg",{xmlns:"http://www.w3.org/2000/svg",className:"h-4 w`

## `apps/website/src/app/metadata.ts` (2 matches)

- Line 16: `PASSWORD_IN_URL` — `ash.",   url: "https://clickflash.com",   logo: "/logo.png",`
- Line 23: `PASSWORD_IN_URL` — `    facebook: "https://www.facebook.com/profile.php?id=10008`

## `apps/gallery/vite.config.ts` (1 matches)

- Line 5: `PASSWORD_IN_URL` — `om "path";  // https://vitejs.dev/config/ export default def`
