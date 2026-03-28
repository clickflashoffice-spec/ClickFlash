import fs from "fs";

/**
 * Validates the true file type of a given file by reading its "magic numbers" (file signature).
 * This prevents malicious files (like executables renamed to .jpg) from being processed.
 *
 * @param filepath The absolute path to the file to validate
 * @returns A promise that resolves to true if the file is a valid image (JPEG, PNG, WEBP, GIF), false otherwise.
 */
export async function validateImageMagicNumber(
  filepath: string,
): Promise<boolean> {
  try {
    const fileHandle = await fs.promises.open(filepath, "r");
    try {
      // Read the first 12 bytes which is enough for our supported formats
      const buffer = Buffer.alloc(12);
      const { bytesRead } = await fileHandle.read(buffer, 0, 12, 0);

      if (bytesRead < 4) {
        return false; // File too small to be a valid image
      }

      // JPEG: FF D8 FF
      if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return true;
      }

      // PNG: 89 50 4E 47 0D 0A 1A 0A
      if (
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
        return true;
      }

      // WEBP: RIFF .... WEBP
      if (
        bytesRead >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 && // RIFF
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50 // WEBP
      ) {
        return true;
      }

      // GIF: GIF87a or GIF89a
      if (
        bytesRead >= 6 &&
        buffer[0] === 0x47 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x38 && // GIF8
        (buffer[4] === 0x37 || buffer[4] === 0x39) &&
        buffer[5] === 0x61 // 7a / 9a
      ) {
        return true;
      }

      return false;
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
}
