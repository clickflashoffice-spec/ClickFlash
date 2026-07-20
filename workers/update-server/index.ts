export interface UpdateManifest {
  version: string;
  releaseDate: string;
  url: string;
  signature: string;
  size: number;
  releaseNotes: string;
  minimumVersion?: string;
  forceUpdate?: boolean;
}

interface ReleaseInfo {
  [appName: string]: {
    latest: UpdateManifest;
    versions: UpdateManifest[];
  };
}

// Release database — bump to v2.0.0 (Phase 19: Biometric Security & Workforce Management)
const RELEASES: ReleaseInfo = {
  'clickflash-master': {
    latest: {
      version: '2.0.0',
      releaseDate: '2026-07-19',
      url: 'https://github.com/clickflash/releases/download/v2.0.0/ClickFlash-Master-2.0.0.exe',
      signature: 'sha256:pending-sign...',
      size: 203_000_000,
      releaseNotes: 'Phase 19: Face biometric clock-in, LAN proxy for face enrollment, shift audit logs, workforce health endpoints',
      minimumVersion: '1.0.0',
      forceUpdate: false
    },
    versions: [
      {
        version: '1.0.0',
        releaseDate: '2026-06-13',
        url: 'https://github.com/clickflash/releases/download/v1.0.0/ClickFlash-Master-1.0.0.exe',
        signature: 'sha256:abc123...',
        size: 198_118_215,
        releaseNotes: 'Fixed backend auto-start, port conflicts, and .trie file issues',
        minimumVersion: '1.0.0',
        forceUpdate: false
      }
    ]
  },
  'clickflash-touch': {
    latest: {
      version: '2.0.0',
      releaseDate: '2026-07-19',
      url: 'https://github.com/clickflash/releases/download/v2.0.0/ClickFlash-Touch-2.0.0.exe',
      signature: 'sha256:pending-sign...',
      size: 131_000_000,
      releaseNotes: 'Phase 19: Biometric verification display on kiosk, improved LAN stability',
      minimumVersion: '1.0.0',
      forceUpdate: false
    },
    versions: [
      {
        version: '1.0.0',
        releaseDate: '2026-06-13',
        url: 'https://github.com/clickflash/releases/download/v1.0.0/ClickFlash-Touch-1.0.0.exe',
        signature: 'sha256:def456...',
        size: 127_350_304,
        releaseNotes: 'Kiosk pairing improvements and stability fixes',
        minimumVersion: '1.0.0',
        forceUpdate: false
      }
    ]
  },
  'clickflash-installer': {
    latest: {
      version: '5.0.0',
      releaseDate: '2026-07-19',
      url: 'https://github.com/clickflash/releases/download/v5.0.0/ClickFlash-Studio-Setup-5.0.0-x64.exe',
      signature: 'sha256:pending-sign...',
      size: 102_000_000,
      releaseNotes: 'Phase 19+20: All-in-one installer now includes biometric workforce management integration',
      minimumVersion: '4.0.0',
      forceUpdate: false
    },
    versions: [
      {
        version: '4.0.0',
        releaseDate: '2026-06-13',
        url: 'https://github.com/clickflash/releases/download/v4.0.0/ClickFlash-Studio-4.0.0.exe',
        signature: 'sha256:ghi789...',
        size: 98_413_921,
        releaseNotes: 'All-in-one installer with Master + Touch',
        minimumVersion: '4.0.0',
        forceUpdate: false
      }
    ]
  }
};

function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a !== b) return a - b;
  }
  return 0;
}

function isVersionValid(version: string): boolean {
  return /^\d+\.\d+\.\d+/.test(version);
}

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // Health check endpoint
    if (pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        service: 'clickflash-update-server',
        timestamp: new Date().toISOString()
      }), { headers: corsHeaders });
    }
    
    // Check for updates: /check?app=clickflash-master&version=4.1.0&platform=win32
    if (pathname === '/check') {
      const app = url.searchParams.get('app');
      const currentVersion = url.searchParams.get('version');
      const platform = url.searchParams.get('platform') || 'win32';
      const arch = url.searchParams.get('arch') || 'x64';
      
      if (!app || !currentVersion) {
        return new Response(JSON.stringify({
          error: 'Missing required parameters: app, version'
        }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }
      
      if (!isVersionValid(currentVersion)) {
        return new Response(JSON.stringify({
          error: 'Invalid version format. Expected: x.x.x'
        }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }
      
      const release = RELEASES[app];
      if (!release) {
        return new Response(JSON.stringify({
          error: 'App not found',
          available: Object.keys(RELEASES)
        }), { 
          status: 404, 
          headers: corsHeaders 
        });
      }
      
      const latest = release.latest;
      const hasUpdate = compareVersions(currentVersion, latest.version) < 0;
      const isForced = latest.forceUpdate && 
                       compareVersions(currentVersion, latest.minimumVersion || '0.0.0') < 0;
      
      return new Response(JSON.stringify({
        upToDate: !hasUpdate,
        updateAvailable: hasUpdate,
        forcedUpdate: isForced,
        currentVersion,
        latestVersion: latest.version,
        manifest: hasUpdate ? latest : null,
        releaseNotes: hasUpdate ? latest.releaseNotes : null,
        downloadUrl: hasUpdate ? latest.url : null,
        size: hasUpdate ? latest.size : null,
        releaseDate: hasUpdate ? latest.releaseDate : null
      }), { headers: corsHeaders });
    }
    
    // Get latest release info: /latest?app=clickflash-master
    if (pathname === '/latest') {
      const app = url.searchParams.get('app');
      
      if (!app) {
        return new Response(JSON.stringify({
          error: 'Missing required parameter: app'
        }), { 
          status: 400, 
          headers: corsHeaders 
        });
      }
      
      const release = RELEASES[app];
      if (!release) {
        return new Response(JSON.stringify({
          error: 'App not found'
        }), { 
          status: 404, 
          headers: corsHeaders 
        });
      }
      
      return new Response(JSON.stringify({
        app,
        latest: release.latest,
        allVersions: release.versions
      }), { headers: corsHeaders });
    }
    
    // List all apps
    if (pathname === '/apps') {
      return new Response(JSON.stringify({
        apps: Object.keys(RELEASES).map(key => ({
          name: key,
          latestVersion: RELEASES[key].latest.version,
          releaseDate: RELEASES[key].latest.releaseDate
        }))
      }), { headers: corsHeaders });
    }
    
    // Default: API documentation
    return new Response(JSON.stringify({
      service: 'ClickFlash Update Server',
      version: '1.0.0',
      endpoints: {
        '/health': 'Health check',
        '/check?app=<name>&version=<x.x.x>': 'Check for updates',
        '/latest?app=<name>': 'Get latest release info',
        '/apps': 'List all available apps'
      },
      supportedApps: Object.keys(RELEASES),
      documentation: 'https://docs.clickflash.app/update-api'
    }), { headers: corsHeaders });
  }
};
