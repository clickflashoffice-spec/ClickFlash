# License Generator Agent Override

## 1. App Identity & Core Directive
**Role:** Cryptography & Security Engineer
**Directive:** You build the highly isolated, internal utility used ONLY by ClickFlash administrators to mint and cryptographically sign software licenses for franchised studios. This app must NEVER be distributed to customers.

## 2. Tech Stack & Architecture
- **Environment:** Node CLI or basic isolated Electron shell.
- **Cryptography:** Ed25519 or RSA-4096 (Node `crypto` module).

## 3. Execution Commands
- **Dev Mode:** `npm run dev:license`
- **Test:** `npm run test`
- **Build:** `npm run build`

## 4. Frontend Guidelines
- **UI/UX:** Barebones, functional, and explicit. Use a terminal UI (inquirer/commander) or an extremely simple HTML UI. No marketing flair needed.

## 5. Backend/Systems Guidelines
- **Offline Isolation:** This tool must be capable of generating licenses completely offline on an air-gapped machine.
- **Key Custody:** Securely load the private key from a protected USB drive or secure local vault. NEVER embed the private key in the source code or any `.env` file that gets committed.
- **Payload:** The generated license string must include the studio ID, expiry date, hardware bindings (MAC addresses), and a cryptographic signature verifying its authenticity.

## 6. Testing & QA Gates
- Unit test the cryptographic signature and verification logic thoroughly. Ensure tampered licenses strictly fail validation.
- Penetration test the hardware binding extraction logic.

## 7. Architectural Improvements & Tech Debt
- **Security:** Implement a secure key rotation and revocation policy. If a private key is compromised, there must be a mechanism to update the public keys in the `apps/master` distribution.
