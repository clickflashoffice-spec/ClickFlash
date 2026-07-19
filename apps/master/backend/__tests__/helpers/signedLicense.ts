import {
    generateKeyPairSync,
    sign,
} from "crypto";

interface SignedLicensePayload {
    plan: "starter" | "pro" | "enterprise" | "trial";
    maxMasters: number;
    expiresAt: string | null;
    createdAt: string;
    machineId?: string;
    nonce?: string;
}

export function createTestLicenseSigner(machineId = "test-machine-id") {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const publicDer = publicKey.export({ format: "der", type: "spki" }) as Buffer;
    const publicKeyB64 = publicDer.subarray(-32).toString("base64");

    return {
        publicKeyB64,
        signLicense(overrides: Partial<SignedLicensePayload> = {}): string {
            const payload: SignedLicensePayload = {
                plan: "pro",
                maxMasters: 5,
                expiresAt: "2099-01-01",
                createdAt: "2026-07-18T00:00:00.000Z",
                machineId,
                nonce: "test-nonce",
                ...overrides,
            };
            const payloadBytes = Buffer.from(JSON.stringify(payload), "utf8");
            const signature = sign(null, payloadBytes, privateKey);
            return `CF-LIVE-${payloadBytes.toString("base64url")}.${signature.toString("base64url")}`;
        },
    };
}
