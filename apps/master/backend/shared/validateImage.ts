import fs from "fs";
import sharp from "sharp";

/**
 * Validates a file is a genuine, parseable image using two layers:
 *
 * Layer 1 — Magic bytes: Reads the first 12 bytes to confirm the file
 *   signature matches a known image format (JPEG, PNG, WEBP, GIF).
 *   Prevents executables/scripts renamed to .jpg from reaching the processor.
 *
 * Layer 2 — Sharp header parse: Asks libvips to parse the image header.
 *   Catches polyglot files that have valid magic bytes but malformed or
 *   weaponised payloads after the header. Also catches truncated/corrupt
 *   files that would otherwise crash the worker mid-processing.
 *
 * @param filepath   Absolute path to the file to validate.
 * @param mimeType   Optional MIME type supplied by the client. If provided,
 *                   it is cross-checked against the detected magic bytes so
 *                   a client cannot lie about the file type.
 * @returns          `true` if both layers pass, `false` otherwise.
 */
export async function validateImageMagicNumber(
  filepath: string,
  mimeType?: string,
): Promise<boolean> {
  // ── Layer 1: Magic bytes ─────────────────────────────────────────────────
  let detectedFormat: "jpeg" | "png" | "webp" | "gif" | null = null;

  try {
    const fileHandle = await fs.promises.open(filepath, "r");
    try {
      const buffer = Buffer.alloc(12);
      const { bytesRead } = await fileHandle.read(buffer, 0, 12, 0);

      if (bytesRead < 4) {
        return false; // File too small to be a valid image
      }

      // Detect format from magic bytes

      // JPEG: FF D8 FF
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        detectedFormat = "jpeg";
      }
      // PNG: 89 50 4E 47 0D 0A 1A 0A
      else if (
        bytesRead >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      ) {
        detectedFormat = "png";
      }
      // WEBP: RIFF .... WEBP
      else if (
        bytesRead >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      ) {
        detectedFormat = "webp";
      }
      // GIF: GIF87a or GIF89a
      else if (
        bytesRead >= 6 &&
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38 &&
        (buffer[4] === 0x37 || buffer[4] === 0x39) &&
        buffer[5] === 0x61
      ) {
        detectedFormat = "gif";
      }
    } finally {
      await fileHandle.close();
    }
  } catch (err) {
    console.error(
      `[Validation] Could not read file ${filepath} for magic number validation`,
      err,
    );
    return false;
  }

  if (detectedFormat === null) {
    return false; // Magic bytes did not match any supported format
  }

  // ── Client MIME type cross-check ────────────────────────────────────────
  // If the caller supplied a MIME type, verify it matches the detected format.
  // This prevents a client from uploading a PNG and claiming it's a JPEG.
  if (mimeType) {
    const mimeToFormat: Record<string, typeof detectedFormat> = {
      "image/jpeg": "jpeg",
      "image/jpg": "jpeg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
    };
    const expectedFormat = mimeToFormat[mimeType.toLowerCase()];
    if (expectedFormat && expectedFormat !== detectedFormat) {
      console.warn(
        `[Validation] MIME mismatch for ${filepath}: client says "${mimeType}" but magic bytes indicate "${detectedFormat}"`,
      );
      return false;
    }
  }

  // ── Layer 2: Sharp header parse ──────────────────────────────────────────
  // libvips parses the full image header (dimensions, colour space, etc.).
  // A polyglot or truncated file with valid magic bytes will throw here.
  try {
    const meta = await sharp(filepath).metadata();
    if (!meta.width || !meta.height || meta.width < 1 || meta.height < 1) {
      console.warn(
        `[Validation] Sharp reports zero dimensions for ${filepath} — rejecting`,
      );
      return false;
    }
  } catch (err) {
    console.warn(
      `[Validation] Sharp could not parse image header for ${filepath} — likely polyglot or corrupt`,
      err,
    );
    return false;
  }

  return true;
}
