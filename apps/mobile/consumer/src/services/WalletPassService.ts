import { logger } from '@clickflash/logger';

export interface ResortPhotoPass {
  passId: string;
  guestName: string;
  resortName: string;
  roomNumber?: string;
  wristbandUid?: string;
  validUntil: string;
  downloadUrl: string;
  qrPayload: string;
}

export class WalletPassService {
  private readonly masterApiUrl: string;

  constructor() {
    this.masterApiUrl = process.env.EXPO_PUBLIC_MASTER_API_URL || 'http://localhost:8090';
  }

  /**
   * Fetches an Apple Wallet (.pkpass) bundle for a guest photo pass.
   */
  async generateAppleWalletPass(pass: ResortPhotoPass): Promise<string> {
    logger.info(`[WalletPass] Requesting Apple Wallet pass for ${pass.guestName} (${pass.passId})`);
    return `${this.masterApiUrl}/api/wallet/pass/${pass.passId}.pkpass`;
  }

  /**
   * Generates a dynamic QR payload string for Touch Kiosk scanning and BLE unlocking.
   */
  generateKioskUnlockQr(pass: ResortPhotoPass): string {
    return JSON.stringify({
      t: 'PASS_UNLOCK',
      id: pass.passId,
      wb: pass.wristbandUid || '',
      exp: pass.validUntil,
    });
  }
}

export const walletPassService = new WalletPassService();
