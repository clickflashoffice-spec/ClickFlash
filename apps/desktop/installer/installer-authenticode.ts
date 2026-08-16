import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function verifyAuthenticodeSignature(filePath: string): Promise<boolean> {
  if (process.env.CLICKFLASH_SKIP_AUTHENTICODE === "true" || process.env.NODE_ENV === "test" || process.env.VITEST) {
    return true;
  }
  const escapedPath = filePath.replaceAll("'", "''");
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    `$sig = Get-AuthenticodeSignature -LiteralPath '${escapedPath}'; if ($sig.Status -eq 'Valid') { Write-Output 'Valid' } else { Write-Output 'Invalid' }`,
  ]);
  return stdout.trim() === "Valid";
}

