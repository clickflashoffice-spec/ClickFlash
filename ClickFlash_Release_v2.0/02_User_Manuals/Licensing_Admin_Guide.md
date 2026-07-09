# Licensing Admin Guide (Offline Ed25519)

## Security Architecture
ClickFlash licensing is 100% offline and asymmetric using Ed25519 cryptographic signatures (`tweetnacl`).

## Generating a Studio License
1. Open the License Generator tool (`apps/license-generator`).
2. Input the studio's hardware fingerprint (CPU ID + Motherboard UUID + MAC address).
3. Select enabled features (`master`, `touch`, `cloud-sync`).
4. Click **Generate License Key**.
5. Save `license.key` to the target studio machine.
