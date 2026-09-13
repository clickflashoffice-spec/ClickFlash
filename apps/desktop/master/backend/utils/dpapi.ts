import { execFileSync } from 'child_process';
import os from 'os';

export class DPAPI {
  /**
   * Encrypts a string using Windows DPAPI (CurrentUser scope).
   * @param plaintext The plaintext string to encrypt.
   * @returns Base64 encoded encrypted string.
   */
  static protect(plaintext: string): string {
    if (os.platform() !== 'win32') {
      throw new Error('DPAPI is only supported on Windows.');
    }
    const script = `
      Add-Type -AssemblyName System.Security
      try {
          $bytes = [System.Text.Encoding]::UTF8.GetBytes('${plaintext}')
          $encrypted = [System.Security.Cryptography.ProtectedData]::Protect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
          [Convert]::ToBase64String($encrypted)
      } catch {
          Write-Error $_
          exit 1
      }
    `;
    return execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf-8' }).trim();
  }

  /**
   * Decrypts a Base64 DPAPI encrypted string.
   * @param base64Encrypted The encrypted Base64 string.
   * @returns Decrypted plaintext string.
   */
  static unprotect(base64Encrypted: string): string {
    if (os.platform() !== 'win32') {
      throw new Error('DPAPI is only supported on Windows.');
    }
    const script = `
      Add-Type -AssemblyName System.Security
      try {
          $bytes = [Convert]::FromBase64String('${base64Encrypted}')
          $decryptedBytes = [System.Security.Cryptography.ProtectedData]::Unprotect($bytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
          $decryptedText = [System.Text.Encoding]::UTF8.GetString($decryptedBytes)
          Write-Output $decryptedText
      } catch {
          Write-Error $_
          exit 1
      }
    `;
    return execFileSync('powershell.exe', ['-NoProfile', '-Command', script], { encoding: 'utf-8' }).trim();
  }
}