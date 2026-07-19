# 🔐 The Infrastructure & Security Orchestrator Prompt

**Copy and paste this prompt when you want the AI to deeply audit, secure, test, and finalize your two most critical deployment tools: the License Generator and the Custom Installer.**

***

```markdown
<USER_REQUEST>
**Goal:** You are a Principal Security Engineer, Cryptographer, and Release Architect. Your objective is to perform a 100% comprehensive audit, security hardening, UI polish, and rigorous testing cycle specifically for two critical infrastructure applications:
1. `C:\Users\alamo\Desktop\apps\license-generator`
2. `C:\Users\alamo\Desktop\apps\installer`

**CRITICAL MANDATE - 100% CUSTOM / MAXIMUM SECURITY:** 
You must ensure these tools are built fully custom. **DO NOT** use paid third-party licensing APIs (like Keygen.sh or Cryptlex) or paid installation wrappers (like Advanced Installer). 
- The licensing must use custom offline cryptography (e.g., RSA/AES, machine fingerprinting).
- The installer must be a custom, robust packaging solution that handles all dependencies silently.

**Required Skills:** Load and apply the following skills:
- `@security-auditor` (For cryptographic audits, reverse-engineering resistance)
- `@devops-deploy` (For binary packaging, payload compression, and silent installs)
- `@performance-engineer` (For fast extraction times and lightweight binaries)
- `@wcag-audit-patterns` (For Installer UI/UX)

---

### 📋 The Execution Pipeline

Create a `task.md` to track this specialized audit. Do not stop until both apps are perfectly secure, tested, and compiling pristine production binaries.

#### **Phase 1: `license-generator` (Deep Security & Crypto Audit)**
*Context: This tool generates the offline activation keys that unlock the ClickFlash ecosystem.*
1. **Cryptographic Hardening:** Audit the key generation algorithm. Ensure we are using strong, modern encryption (e.g., Ed25519 or RSA-4096) for signing licenses, not just simple hashes.
2. **Machine Fingerprinting:** Audit the hardware-binding logic. Ensure the generated keys lock tightly to the studio's specific MAC address, CPU ID, or motherboard UUID to prevent piracy.
3. **Anti-Tamper & Obfuscation:** Implement code obfuscation and anti-debugging checks on the validation side to make reverse-engineering the license check extremely difficult.
4. **UI/UX Polish:** Polish the internal generator dashboard used by our admins to issue, revoke, and track licenses.

#### **Phase 2: `installer` (DevOps & Bundling Audit)**
*Context: The custom setup wizard that packages Master, Touch, SQLite, and background services into a one-click install for the end-user.*
1. **Payload Optimization:** Audit the bundling logic. Optimize the compression algorithm (e.g., LZMA/7z) to ensure the massive ecosystem `.exe` or `.dmg` is as small and fast to extract as possible.
2. **Prerequisite Automation:** Ensure the installer silently checks for and installs required dependencies (e.g., Node.js, VC++ Redistributables, local SQLite drivers) without throwing errors.
3. **Premium Installer UI:** Polish the setup wizard. Inject our custom branding, dark mode, smooth transitions, and a satisfying progress bar. It must look like an elite enterprise software installer.
4. **Uninstaller & Cleanup:** Audit the uninstallation routine. Ensure it safely leaves user data (photos/DB) intact unless explicitly told to wipe them.

#### **Phase 3: Penetration & Chaos Testing**
*Context: We must try to break our own tools before hackers or clients do.*
1. **License Bypassing (Pen-Test):** Write a script that attempts to brute-force, forge, or transfer a license key to a different machine. The system MUST reject it.
2. **Blank Slate Installer Test:** Run an automated E2E test executing the installer on a simulated "blank" Windows/Mac environment. Assert that the software installs, boots, and requests a license key without a single crash or missing DLL.
3. **Interruption Test:** Simulate a power failure or process kill midway through the installation. Ensure the system rolls back cleanly without corrupting the OS.

#### **Phase 4: Final Binary Generation & Documentation**
1. **Compile & Sign:** Trigger the production build for both apps. Ensure the final installer binary is correctly Code Signed so Windows SmartScreen/macOS Gatekeeper does not flag it as malware.
2. **Write the Docs:** Generate a `Licensing_Admin_Guide.md` and an `Installation_Troubleshooting.md` file.

### 🎯 Directives for the Agent
1. **Fix, Don't Just Report:** When you find a weak encryption vector or a slow install step, write the code to fix it immediately.
2. **Total Independence:** Both tools must work 100% offline. No "calling home" to a cloud server is allowed for the core license validation to work.
3. **Reporting:** Once Phase 4 is green, generate a `walkthrough.md` detailing the exact cryptographic standards used and the size/speed benchmarks of the new installer.

Initiate the infrastructure audit now!
</USER_REQUEST>
```
