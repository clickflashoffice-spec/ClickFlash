# ============================================================================
# ClickFlash — Credential Generation Script
# ============================================================================
# PURPOSE: Generate new credentials for the credential rotation (Prompt A1)
# USAGE:   pwsh scripts/generate-credentials.ps1 [-OutputDir <path>] [-DryRun]
#
# GENERATES:
#   1. JWT_SECRET  — 64 random bytes as hex (128 chars)
#   2. MASTER_API_KEY — 32 random bytes as hex (64 chars)
#   3. WEBHOOK_SECRET — 32 random bytes as hex (64 chars)
#   4. Ed25519 license-signing keypair (via Node.js helper)
#
# DOES NOT GENERATE:
#   - STRIPE_SECRET_KEY (obtain from Stripe Dashboard)
#   - STRIPE_WEBHOOK_SECRET (obtain from Stripe Dashboard after webhook registration)
#   - Google API key (create new restricted key in GCP Console)
# ============================================================================

param(
    [string]$OutputDir = "",
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ── Helpers ──────────────────────────────────────────────────────────────────
function Write-Header { param([string]$msg); Write-Host "`n═══ $msg ═══" -ForegroundColor Cyan }
function Write-Secret { param([string]$name, [string]$value); Write-Host "  $name = " -NoNewline -ForegroundColor Yellow; Write-Host $value -ForegroundColor Green }
function Write-Warn   { param([string]$msg); Write-Host "  ⚠ $msg" -ForegroundColor DarkYellow }
function Get-RandomHex { param([int]$bytes); $buf = [byte[]]::new($bytes); [System.Security.Cryptography.RandomNumberGenerator]::Fill($buf); return ($buf | ForEach-Object { $_.ToString("x2") }) -join "" }

# ── 1. JWT_SECRET (64 random bytes → 128 hex chars) ─────────────────────────
Write-Header "Generating JWT_SECRET (64 random bytes, hex)"
$jwtSecret = Get-RandomHex -bytes 64
Write-Secret "JWT_SECRET" $jwtSecret

# ── 2. MASTER_API_KEY (32 random bytes → 64 hex chars) ──────────────────────
Write-Header "Generating MASTER_API_KEY (32 random bytes, hex)"
$masterApiKey = Get-RandomHex -bytes 32
Write-Secret "MASTER_API_KEY" $masterApiKey

# ── 3. WEBHOOK_SECRET (32 random bytes → 64 hex chars) ──────────────────────
Write-Header "Generating WEBHOOK_SECRET (32 random bytes, hex)"
$webhookSecret = Get-RandomHex -bytes 32
Write-Secret "WEBHOOK_SECRET" $webhookSecret

# ── 4. Ed25519 License-Signing Keypair ───────────────────────────────────────
Write-Header "Generating Ed25519 License-Signing Keypair"

$nodeScript = @"
const crypto = require('node:crypto');
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const pubB64 = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64');
const privB64 = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32).toString('base64');
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
console.log(JSON.stringify({
  publicKeyRaw: pubB64,
  privateKeyRaw: privB64,
  publicKeyPem: pubPem.trim(),
  privateKeyPem: privPem.trim()
}));
"@

$keyJson = node -e $nodeScript | ConvertFrom-Json
if (-not $keyJson) {
    Write-Error "Failed to generate Ed25519 keypair. Ensure Node.js is installed."
    exit 1
}

Write-Host "  Public Key (base64, 32 bytes):  " -NoNewline -ForegroundColor Yellow
Write-Host $keyJson.publicKeyRaw -ForegroundColor Green
Write-Host "  Private Key (base64, 32 bytes): " -NoNewline -ForegroundColor Yellow
Write-Host "[GENERATED — see output file]" -ForegroundColor Red

# ── Output ───────────────────────────────────────────────────────────────────
if ($DryRun) {
    Write-Header "DRY RUN — No files written"
    Write-Host "  Would write credentials to: $OutputDir" -ForegroundColor DarkGray
    exit 0
}

if (-not $OutputDir) {
    # Default to a temporary directory OUTSIDE the repo
    $OutputDir = Join-Path $env:USERPROFILE ".clickflash-credentials-$(Get-Date -Format yyyyMMdd-HHmmss)"
}

# Ensure output is NOT inside the repo
$repoRoot = git rev-parse --show-toplevel 2>$null
if ($repoRoot -and $OutputDir.StartsWith($repoRoot.Replace("/", "\"))) {
    Write-Error "SECURITY: Output directory must be OUTSIDE the Git repository. Got: $OutputDir"
    exit 1
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# Write secrets file (for wrangler secret put commands)
$secretsFile = Join-Path $OutputDir "cloudflare-secrets.env"
@"
# ClickFlash Cloudflare Worker Secrets
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss K")
# ⚠ TREAT THIS FILE AS HIGHLY SENSITIVE — delete after configuring Cloudflare

# Cloud Backend Worker
JWT_SECRET=$jwtSecret

# MoneyTrash Worker
MONEYTRASH_JWT_SECRET=$jwtSecret
MASTER_API_KEY=$masterApiKey
WEBHOOK_SECRET=$webhookSecret

# Stripe keys — obtain from https://dashboard.stripe.com/apikeys
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...
"@ | Set-Content $secretsFile -Encoding UTF8

# Write Ed25519 private key PEM (NEVER commit this)
$privKeyFile = Join-Path $OutputDir "license-signing-private.pem"
$keyJson.privateKeyPem | Set-Content $privKeyFile -Encoding UTF8 -NoNewline

# Write Ed25519 public key for embedding
$pubKeyFile = Join-Path $OutputDir "license-signing-public.pem"
$keyJson.publicKeyPem | Set-Content $pubKeyFile -Encoding UTF8 -NoNewline

# Write raw base64 keys for the licensing package
$rawKeysFile = Join-Path $OutputDir "license-keys-raw-b64.txt"
@"
# Ed25519 License-Signing Keys (raw 32-byte base64)
# Public key — embed in apps/license-generator and packages/licensing
PUBLIC_KEY_B64=$($keyJson.publicKeyRaw)
# Private key — operator custody only, NEVER in Git
PRIVATE_KEY_B64=$($keyJson.privateKeyRaw)
"@ | Set-Content $rawKeysFile -Encoding UTF8

Write-Header "Credentials Written"
Write-Host "  Directory:    $OutputDir" -ForegroundColor Green
Write-Host "  Secrets:      $secretsFile" -ForegroundColor Green
Write-Host "  Private PEM:  $privKeyFile" -ForegroundColor Green
Write-Host "  Public PEM:   $pubKeyFile" -ForegroundColor Green
Write-Host "  Raw B64 keys: $rawKeysFile" -ForegroundColor Green
Write-Host ""
Write-Warn "DELETE $OutputDir after configuring Cloudflare and securing the private key offline."
Write-Warn "The private key file should be moved to an offline USB drive for custody."
Write-Host ""

# ── Summary ──────────────────────────────────────────────────────────────────
Write-Header "Next Steps"
Write-Host @"
  1. Run the wrangler secret put commands from docs/CREDENTIAL_ROTATION_RUNBOOK.md
     using the values in $secretsFile
  2. Rotate STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET from Stripe Dashboard
  3. Move $privKeyFile to offline custody (USB drive)
  4. Embed the public key ($($keyJson.publicKeyRaw)) in the licensing package
  5. Revoke the old Google API key in GCP Console
  6. DELETE this directory: $OutputDir
"@
