/**
 * Cloudflare Provisioning Mock Test
 * 
 * Tests the Cloudflare provisioning flow with mocked API responses.
 * Run with: npx tsx scripts/test-cloudflare-mock.ts
 */

import { CloudflareAppsProvisioningService } from '../backend/services/cloudflare/CloudflareAppsProvisioningService';

import { Logger } from '../backend/utils/logger';

// Mock logger
const logger: Logger = {
  info: (message: string, ...args: unknown[]) => process.stdout.write(`[INFO] ${message} ${args.join(' ')}\n`),
  warn: (message: string, ...args: unknown[]) => process.stdout.write(`[WARN] ${message} ${args.join(' ')}\n`),
  error: (message: string, errorOrMeta?: unknown, meta?: unknown) => process.stderr.write(`[ERROR] ${message} ${errorOrMeta || ''} ${meta || ''}\n`),
  debug: (message: string, ...args: unknown[]) => process.stdout.write(`[DEBUG] ${message} ${args.join(' ')}\n`),
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
  logger.info('\n=== Test: Credential Validation ===');
  
  const service = new CloudflareAppsProvisioningService(null as any, logger);
  const restore = createMockFetch();
  
  const valid = await service.validateCredentials('fake-token', 'test-account');
  logger.info(`Credential validation result: ${valid ? '✅ PASS' : '❌ FAIL'}`);
  
  restore();
  return valid;
}

async function testTunnelCreation() {
  logger.info('\n=== Test: Tunnel Creation ===');
  
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
    logger.info(`Tunnel creation: ✅ PASS (ID: ${result.tunnel.tunnelId})`);
    return true;
  } else {
    logger.info(`Tunnel creation: ❌ FAIL (got: ${JSON.stringify(result.tunnel)})`);
    return false;
  }
}

async function testDNSConfiguration() {
  logger.info('\n=== Test: DNS Configuration ===');
  
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
    logger.info(`DNS configuration: ✅ PASS (${result.dnsRecords.length} records)`);
    return true;
  } else {
    logger.info(`DNS configuration: ❌ FAIL (expected 3+ records, got ${result.dnsRecords?.length || 0})`);
    return false;
  }
}

async function testGalleryAppRegistration() {
  logger.info('\n=== Test: Gallery App Registration ===');
  
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
    logger.info(`Gallery app registration: ✅ PASS (ID: ${result.app.id})`);
    return true;
  } else {
    logger.info(`Gallery app registration: ❌ FAIL (got: ${JSON.stringify(result.app)})`);
    return false;
  }
}

async function testManagementAppRegistration() {
  logger.info('\n=== Test: Management App Registration ===');
  
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
    logger.info(`Management app registration: ✅ PASS (ID: ${result.app.id})`);
    return true;
  } else {
    logger.info(`Management app registration: ❌ FAIL (got: ${JSON.stringify(result.app)})`);
    return false;
  }
}

async function testWorkersScriptCreation() {
  logger.info('\n=== Test: Workers Script Creation ===');
  
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
    logger.info(`Workers script creation: ✅ PASS (ID: ${result.scriptId})`);
    return true;
  } else {
    logger.info(`Workers script creation: ❌ FAIL (got: ${JSON.stringify(result.scriptId)})`);
    return false;
  }
}

async function runAllTests() {
  logger.info('╔════════════════════════════════════════════════════════════╗');
  logger.info('║     ClickFlash Cloudflare Provisioning - Mock Tests        ║');
  logger.info('╚════════════════════════════════════════════════════════════╝');
  
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
      logger.info(`  ${name}: ❌ ERROR - ${e.message}`);
      results[name] = false;
    }
  }
  
  logger.info('\n╔════════════════════════════════════════════════════════════╗');
  logger.info('║                    TEST RESULTS SUMMARY                    ║');
  logger.info('╚════════════════════════════════════════════════════════════╝');
  
  const allPassed = Object.values(results).every(r => r);
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    logger.info(`  ${test}: ${status}`);
  });
  
  logger.info('');
  logger.info(`Overall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  logger.info('');
  
  process.exit(allPassed ? 0 : 1);
}

runAllTests().catch(logger.error);
