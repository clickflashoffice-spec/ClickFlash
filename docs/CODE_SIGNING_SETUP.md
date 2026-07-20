# Authenticode Code Signing Setup

## Overview

Code signing is mandatory for all Windows executables and installers generated for ClickFlash v2.0. Unsigned executables will be blocked by the Installer's payload verification, trigger Windows SmartScreen warnings, and fail automatic updates.

## Certificate Options

To sign our executables, we require an Authenticode certificate from a trusted Certificate Authority (CA).

| Certificate Type | Validation | Trust Level | Delivery | Best For |
|------------------|------------|-------------|----------|----------|
| **Standard (OV)** | Organization details verified | Gradually builds trust with SmartScreen | PFX file or USB token | General distribution, lower budget |
| **Extended (EV)** | Strict organization + identity validation | Instant SmartScreen trust | USB hardware token only | High-security, enterprise environments, instant trust |

### Recommended Providers

1. **Sectigo Standard Code Signing** (Recommended)
   - **Cost:** ~$200 / year
   - **Validation:** 1-3 days
   - **Delivery:** Usually via a secure key generation process (often requires a hardware token or specific HSM due to recent CA/B Forum baseline changes).
   - **Pros:** Good balance of price and trust.

2. **DigiCert EV Code Signing**
   - **Cost:** ~$699 / year
   - **Validation:** 1-5 days
   - **Delivery:** USB Token shipped to organization
   - **Pros:** Immediate SmartScreen trust, no "Unknown Publisher" warnings from day one.

## Secure Custody & Pipeline Integration

Due to recent industry changes (CA/B Forum), code signing certificates must typically be stored on FIPS-compliant hardware (USB tokens or HSMs) or in a cloud signing service (like Azure Key Vault).

### If using a Cloud HSM (Azure Key Vault)
1. Store the certificate securely in Key Vault.
2. The CI/CD pipeline authenticates to Azure.
3. Uses `Azure SignTool` to sign executables during the build.

### If using a local USB Token / PFX
1. The token must be connected to the build machine.
2. Provide the password via the `CERT_PASSWORD` environment variable.
3. The `sign-release.ps1` script will use `signtool.exe` to sign the binaries.

## The Signing Script (`scripts/sign-release.ps1`)

A PowerShell script is provided to automate the signing process. It:
1. Locates all `.exe` and `.dll` files in a given directory.
2. Signs them using the provided certificate or the system's certificate store.
3. Applies RFC 3161 timestamping via `http://timestamp.digicert.com`.
4. Verifies the signature of every file and fails the build if any are invalid.

### Usage
```powershell
.\scripts\sign-release.ps1 -TargetDirectory "C:\path\to\release" -CertPath "C:\certs\clickflash.p12" -CertPassword $env:CERT_PASSWORD
```
