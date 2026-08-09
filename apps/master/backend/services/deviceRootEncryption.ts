import crypto from "crypto";
import { HardwareService } from "./SystemHardwareService";

const GCM_IV_BYTES = 12;
const GCM_TAG_BYTES = 16;

export class DeviceRootEncryption {
  private static async getKek(): Promise<Buffer> {
    const machineId = await HardwareService.getMachineId(); // 64 char hex string
    return Buffer.from(machineId, "hex").subarray(0, 32); // AES-256 requires 32 bytes
  }

  static async encrypt(secretBase64: string): Promise<string> {
    const kek = await this.getKek();
    const iv = crypto.randomBytes(GCM_IV_BYTES);
    const cipher = crypto.createCipheriv("aes-256-gcm", kek, iv, {
      authTagLength: GCM_TAG_BYTES,
    });
    
    const ciphertext = Buffer.concat([
      cipher.update(secretBase64, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // Format: v1:{iv_base64}:{tag_base64}:{ciphertext_base64}
    return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
  }

  static async decrypt(wrappedSecret: string): Promise<string> {
    if (!wrappedSecret.startsWith("v1:")) {
      // Legacy plaintext support for seamless migration
      return wrappedSecret;
    }

    const parts = wrappedSecret.split(":");
    if (parts.length !== 4) {
      throw new Error("Invalid wrapped secret format");
    }

    const [, ivB64, tagB64, cipherB64] = parts;
    const kek = await this.getKek();
    
    const decipher = crypto.createDecipheriv("aes-256-gcm", kek, Buffer.from(ivB64, "base64"), {
      authTagLength: GCM_TAG_BYTES,
    });
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(cipherB64, "base64")),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  }
}
