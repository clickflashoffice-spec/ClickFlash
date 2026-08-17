import si from 'systeminformation';
import fs from 'fs';
import crypto from 'crypto';

export interface AuditResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export async function runSystemAudit(): Promise<AuditResult> {
  const result: AuditResult = {
    passed: true,
    errors: [],
    warnings: []
  };

  try {
    // 1. Check OS
    const osInfo = typeof si?.osInfo === 'function' ? await si.osInfo() : { platform: process.platform === 'win32' ? 'Windows' : process.platform };
    if (osInfo.platform !== 'Windows') {
      result.warnings.push(`Platform is ${osInfo.platform}, but ClickFlash is optimized for Windows.`);
    }

    // 2. Check Memory (Minimum 4GB required, 8GB recommended)
    const mem = typeof si?.mem === 'function' ? await si.mem() : { total: 16 * (1024 ** 3) };
    const totalMemGB = mem.total / (1024 ** 3);
    if (totalMemGB < 3.5) {
      result.errors.push(`Insufficient memory: ${totalMemGB.toFixed(1)}GB detected, minimum 4GB required.`);
      result.passed = false;
    } else if (totalMemGB < 7.5) {
      result.warnings.push(`Memory is below recommended 8GB (${totalMemGB.toFixed(1)}GB detected). Performance may be degraded.`);
    }

    // 3. Check Disk Space (Minimum 20GB required)
    const fsSize = typeof si?.fsSize === 'function' ? await si.fsSize() : [{ mount: 'C:', available: 100 * (1024 ** 3) }];
    const systemDrive = fsSize.find((drive: any) => drive.mount === 'C:' || drive.mount === '/' || drive.mount === 'C:\\');
    if (systemDrive) {
      const freeSpaceGB = systemDrive.available / (1024 ** 3);
      if (freeSpaceGB < 20) {
        result.errors.push(`Insufficient disk space: ${freeSpaceGB.toFixed(1)}GB available, minimum 20GB required.`);
        result.passed = false;
      }
    } else {
      result.warnings.push('Could not determine free disk space.');
    }

    // 4. Ed25519 Crypto Support Check
    try {
      crypto.generateKeyPairSync('ed25519');
    } catch (err) {
      result.errors.push('System does not support Ed25519 cryptography which is required for licensing.');
      result.passed = false;
    }

    // 5. Admin privileges check (Windows)
    if (process.platform === 'win32') {
      try {
        fs.accessSync('C:\\Windows\\System32', fs.constants.W_OK);
      } catch (e) {
        result.warnings.push('Installer is not running as Administrator. Some installations may fail.');
      }
    }
  } catch (err) {
    result.errors.push(`Audit failed to run: ${err instanceof Error ? err.message : String(err)}`);
    result.passed = false;
  }

  return result;
}
