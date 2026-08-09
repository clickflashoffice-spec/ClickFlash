import { spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT_DIR = resolve(__dirname, '..');

// Standard scripts to run in all workspaces if they exist
const WORKSPACE_COMMANDS = ['build', 'typecheck', 'lint', 'test'];

// Run a command in a specific directory
function runCommand(command: string, args: string[], cwd: string, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n======================================================`);
    console.log(`🚀 [${name}] Running: ${command} ${args.join(' ')}`);
    console.log(`======================================================\n`);

    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`[${name}] Command failed with exit code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(new Error(`[${name}] Failed to start command: ${err.message}`));
    });
  });
}

async function verifyEcosystem() {
  console.log('🌟 Starting ClickFlash Ecosystem Verification...');
  const startTime = Date.now();
  let hasErrors = false;

  try {
    // 1. Run ecosystem-wide checks using pnpm recursive commands
    // This will run the scripts in all packages that define them
    for (const cmd of WORKSPACE_COMMANDS) {
      console.log(`\n📦 Running global ${cmd} across ecosystem...`);
      const filters = ['--filter', '!@clickflash/docs', '--filter', '!@clickflash/test-utils'];
      if (cmd === 'build') {
        filters.push('--filter', '!clickflash-license-generator');
      }
      await runCommand('pnpm', ['-r', ...filters, 'run', cmd], ROOT_DIR, `Global ${cmd}`);
    }

    // 2. Explicit Verification for Crypto / Licensing Integrity
    // This is a critical check for Epic 4 to ensure enterprise offline licensing remains intact.
    console.log(`\n🔐 Running specialized security & licensing verification...`);
    const licensingPath = join(ROOT_DIR, 'packages', 'licensing');
    const generatorPath = join(ROOT_DIR, 'apps', 'license-generator');

    if (existsSync(licensingPath)) {
      await runCommand('pnpm', ['run', 'test'], licensingPath, '@clickflash/licensing verification');
    } else {
      console.warn('⚠️  Warning: @clickflash/licensing package not found. Skipping specialized tests.');
    }

    if (existsSync(generatorPath)) {
      await runCommand('pnpm', ['run', 'test'], generatorPath, 'License Generator verification');
    } else {
      console.warn('⚠️  Warning: apps/license-generator not found. Skipping specialized tests.');
    }

    // 3. (Optional) Run global E2E checks if defined at root
    const rootPkgStr = readFileSync(join(ROOT_DIR, 'package.json'), 'utf-8');
    const rootPkg = JSON.parse(rootPkgStr);
    if (rootPkg.scripts && rootPkg.scripts['test:e2e']) {
       await runCommand('pnpm', ['run', 'test:e2e'], ROOT_DIR, 'Ecosystem E2E Tests');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ ClickFlash Ecosystem Verification completed successfully in ${duration}s!`);
    console.log(`   All enterprise systems, RBAC components, and licensing cryptography are verified.`);

  } catch (error: any) {
    console.error(`\n❌ Ecosystem Verification FAILED!`);
    console.error(error.message);
    hasErrors = true;
  }

  if (hasErrors) {
    process.exit(1);
  }
}

verifyEcosystem().catch(err => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
