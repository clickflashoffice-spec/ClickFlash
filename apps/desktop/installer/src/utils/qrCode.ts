/**
 * ClickFlash Installer — QR Code Utility
 * Generates QR data URLs for pairing codes.
 */

import QRCode from "qrcode";

export async function generateQrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 256,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}
