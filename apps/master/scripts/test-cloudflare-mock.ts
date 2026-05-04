/**
 * Cloudflare Provisioning Mock Test
 * 
 * Tests the Cloudflare provisioning flow with mocked API responses.
 * Run with: npx tsx scripts/test-cloudflare-mock.ts
 */

import { CloudflareAppsProvisioningService } from '../backend/services/cloudflare/CloudflareAppsProvisioningService';
import { CloudflareEmailRoutingService } from '../backend/services/cloudflare/CloudflareEmailRoutingService';
import { Logger } from '../backend/shared/logger';

// Mock logger
const logger: Logger = {
  info: (message: string, ...args: unknown[]) => console.log(`[INFO] ${message}`, ...args),
  warn: (message: string, ...args: unknown[]) => console.log(`[WARN] ${message}`, ...args),
  error: (message: string, error?: Error, ...args: unknown[]) => console.error(`[ERROR] ${message}`, error, ...args),
  debug: (message: string, ...args: unknown[]) => console.log(`[DEBUG] ${message}`, ...args),
} as unknown as Logger;

// Mock fetch with Cloudflare API response format
function createMockFetch() {
  const originalFetch = global.fetch;
  
  (global as any).fetch = async (url: string, options?: RequestInit): Promise<Response> => {
    const opts = options || {};
    
    // Account verification
    if (url.includes('/accounts/test-account') && !url.includes('/tunnels') && !url.includes('/pages') && !url.includes('/workers') && !url.includes('/notifications') && !url.includes('/dns')) {
      return new Response(JSON.stringify({ 
        success: true, 
        result: { id: 'test-account', name: 'Test Account' } 
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Tunnel creation
    if (url.includes('/accounts/test-account/tunnels') && opts.method === 'POST') {
      return new Response(JSON.stringify({
        success: true,
        result: { id: 'tunnel-123', name: 'clickflash-master-test', tunnel_token: 'token-abc123' }
      }), { status: 200 });
    }
    
    // DNS records
    if (url.includes('/zones/test-zone/dns_records') && opts.method === 'POST') {
      const body = JSON.parse(opts.body as string);
      return new Response(JSON.stringify({
        success: true,
        result: { id: `dns-${Date.now()}`, ...body }
      }), { status: 200 });
    }
    
    // Pages projects
    if (url.includes('/accounts/test-account/pages/projects') && opts.method === 'POST') {
      const body = JSON.parse(opts.body as string);
      return new Response(JSON.stringify({
        success: true,
        result: { uuid: `proj-${Date.now()}`, name: body.name, subdomain: body.subdomain || 'test.com' }
      }), { status: 200 });
    }
    
    // Workers scripts (POST to /accounts/{id}/workers/scripts)
    if (url.includes('/accounts/test-account/workers/scripts') && opts.method === 'POST') {
      return new Response(JSON.stringify({
        success: true,
        result: { id: `worker-${Date.now()}`, script: 'uploaded' }
      }), { status: 200 });
    }
    
    // Notifications
    if (url.includes('/notifications/rules') && opts.method === 'POST') {
      return new Response(JSON.stringify({
        success: true,
        result: { id: `webhook-${Date.now()}`, name: 'ClickFlash Alerts' }
      }), { status: 200 });
    }
    
    // Fallback
    return originalFetch(url, options);
  };
  
  return () => { global.fetch = originalFetch; };
}

async function testCredentialValidation() {
  console.log('\n=== Test: Credential Validation ===');
  
  const service = new CloudflareAppsProvisioningService(null as any, logger);
  const restore = createMockFetch();
  
  const valid = await service.validateCredentials('fake-token', 'test-account');
  console.log(`Credential validation result: ${valid ? '✅ PASS' : '❌ FAIL'}`);
  
  restore();
  return valid;
}

async function testTunnelCreation() {
  console.log('\n=== Test: Tunnel Creation ===');
  
  const service = new CloudflareAppsProvisioningService(null as any, logger);
  const restore = createMockFetch();
  
  const config = {
    apiToken: 'test-token',
    accountId: 'test-account',
    zoneId: 'test-zone',
    domain: 'testclickflash.com',
  };
  
  const result = await service.createTunnel(config, 'Test Location');
  
  restore();
  
  if (result.tunnel && result.tunnel.tunnelId === 'tunnel-123') {
    console.log(`Tunnel creation: ✅ PASS (ID: ${result.tunnel.tunnelId})`);
    return true;
  } else {
    console.log(`Tunnel creation: ❌ FAIL (got: ${JSON.stringify(result.tunnel)})`);
    return false;
  }
}

async function testDNSConfiguration() {
  console.log('\n=== Test: DNS Configuration ===');
  
  const service = new CloudflareAppsProvisioningService(null as any, logger);
  const restore = createMockFetch();
  
  const config = {
    apiToken: 'test-token',
    accountId: 'test-account',
    zoneId: 'test-zone',
    domain: 'testclickflash.com',
  };
  
  const result = await service.configureDNS(config, 'Test Location', 'tunnel-123');
  
  restore();
  
  if (result.dnsRecords && result.dnsRecords.length >= 3) {
    console.log(`DNS configuration: ✅ PASS (${result.dnsRecords.length} records)`);
    return true;
  } else {
    console.log(`DNS configuration: ❌ FAIL (expected 3+ records, got ${result.dnsRecords?.length || 0})`);
    return false;
  }
}

async function testGalleryAppRegistration() {
  console.log('\n=== Test: Gallery App Registration ===');
  
  const service = new CloudflareAppsProvisioningService(null as any, logger);
  const restore = createMockFetch();
  
  const config = {
    apiToken: 'test-token',
    accountId: 'test-account',
    zoneId: 'test-zone',
    domain: 'testclickflash.com',
  };
  
  const result = await service.registerGalleryApp(config, 'Test Location', {
    name: 'Test Gallery',
    tagline: 'Test tagline',
    description: 'Test description',
    category: 'Photography',
    logoUrl: 'https://test.com/logo.png',
  });
  
  restore();
  
  if (result.app && result.app.id && result.app.id.startsWith('proj-')) {
    console.log(`Gallery app registration: ✅ PASS (ID: ${result.app.id})`);
    return true;
  } else {
    console.log(`Gallery app registration: ❌ FAIL (got: ${JSON.stringify(result.app)})`);
    return false;
  }
}

async function testManagementAppRegistration() {
  console.log('\n=== Test: Management App Registration ===');
  
  const service = new CloudflareAppsProvisioningService(null as any, logger);
  const restore = createMockFetch();
  
  const config = {
    apiToken: 'test-token',
    accountId: 'test-account',
    zoneId: 'test-zone',
    domain: 'testclickflash.com',
  };
  
  const result = await service.registerManagementHubApp(config, 'Test Location', {
    name: 'Test Management',
    tagline: 'Test tagline',
    description: 'Test description',
    category: 'Business',
    logoUrl: 'https://test.com/logo.png',
  });
  
  restore();
  
  if (result.app && result.app.id && result.app.id.startsWith('proj-')) {
    console.log(`Management app registration: ✅ PASS (ID: ${result.app.id})`);
    return true;
  } else {
    console.log(`Management app registration: ❌ FAIL (got: ${JSON.stringify(result.app)})`);
    return false;
  }
}

async function testWorkersScriptCreation() {
  console.log('\n=== Test: Workers Script Creation ===');
  
  const service = new CloudflareAppsProvisioningService(null as any, logger);
  const restore = createMockFetch();
  
  const config = {
    apiToken: 'test-token',
    accountId: 'test-account',
    zoneId: 'test-zone',
    domain: 'testclickflash.com',
  };
  
  const result = await service.createWorkersScript(config, 'Test Location');
  
  restore();
  
  if (result.scriptId && result.scriptId.startsWith('worker-')) {
    console.log(`Workers script creation: ✅ PASS (ID: ${result.scriptId})`);
    return true;
  } else {
    console.log(`Workers script creation: ❌ FAIL (got: ${JSON.stringify(result.scriptId)})`);
    return false;
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     ClickFlash Cloudflare Provisioning - Mock Tests        ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const results: Record<string, boolean> = {};
  const tests: [string, () => Promise<boolean>][] = [
    ['Credential Validation', testCredentialValidation],
    ['Tunnel Creation', testTunnelCreation],
    ['DNS Configuration', testDNSConfiguration],
    ['Gallery App Registration', testGalleryAppRegistration],
    ['Management App Registration', testManagementAppRegistration],
    ['Workers Script Creation', testWorkersScriptCreation],
  ];
  
  for (const [name, testFn] of tests) {
    try {
      results[name] = await testFn();
    } catch (e: any) {
      console.log(`  ${name}: ❌ ERROR - ${e.message}`);
      results[name] = false;
    }
  }
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS SUMMARY                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  
  const allPassed = Object.values(results).every(r => r);
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${test}: ${status}`);
  });
  
  console.log('');
  console.log(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('');
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(console.error);
