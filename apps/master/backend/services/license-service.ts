import crypto from "crypto";
import { Logger } from "../utils/logger";
import { DatabaseManager } from "../database/db";
import { verifyEd25519License } from "@clickflash/licensing";
import si from "systeminformation";

export interface LicenseStatus {
    isValid: boolean;
    licenseKey: string | null;
    status: 'active' | 'grace_period' | 'expired' | 'invalid' | 'unlicensed';
    gracePeriodEndsAt: number | null;
    lastChecked: number | null;
}

export class LicenseService {
    private readonly SECRET_SALT = "clickflash-secret-salt-2026";
    private readonly GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

    constructor(
        private readonly db: DatabaseManager,
        private readonly logger: Logger,
        private readonly hubUrl: string
    ) {}

    /**
     * Set a new license key in the system
     */
    public async setLicenseKey(key: string): Promise<boolean> {
        if (!await this.verifyChecksum(key)) {
            this.logger.warn(`[LicenseService] Invalid checksum for key: ${key}`);
            return false;
        }

        // Store the key
        this.db.run(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            ['license_key', JSON.stringify(key)]
        );
        
        // Reset check state
        this.db.run(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            ['license_last_checked', JSON.stringify(Date.now())]
        );
        this.db.run(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            ['license_status', JSON.stringify('active')]
        );

        this.logger.info(`[LicenseService] Successfully installed license key.`);
        return true;
    }

    /**
     * Validates the license locally (offline) and calculates grace period
     */
    public async getLocalLicenseStatus(): Promise<LicenseStatus> {
        const keyRecord = this.db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'license_key'");
        const lastCheckedRecord = this.db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'license_last_checked'");
        const statusRecord = this.db.get<{ value: string }>("SELECT value FROM settings WHERE key = 'license_status'");

        if (!keyRecord || !keyRecord.value) {
            return {
                isValid: false,
                licenseKey: null,
                status: 'unlicensed',
                gracePeriodEndsAt: null,
                lastChecked: null
            };
        }

        const licenseKey = JSON.parse(keyRecord.value);
        let lastChecked = lastCheckedRecord ? JSON.parse(lastCheckedRecord.value) : null;
        const recordedStatus = statusRecord ? JSON.parse(statusRecord.value) : 'active';

        // Check format and checksum
        if (!await this.verifyChecksum(licenseKey)) {
            return {
                isValid: false,
                licenseKey,
                status: 'invalid',
                gracePeriodEndsAt: null,
                lastChecked
            };
        }

        // If the license is explicitly marked invalid by the hub
        if (recordedStatus === 'invalid' || recordedStatus === 'revoked') {
            return {
                isValid: false,
                licenseKey,
                status: 'invalid',
                gracePeriodEndsAt: null,
                lastChecked
            };
        }

        // Calculate grace period
        if (!lastChecked) {
            // If we've never checked but have a valid checksum, start the clock now
            lastChecked = Date.now();
            this.db.run(
                "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                ['license_last_checked', JSON.stringify(lastChecked)]
            );
        }

        const now = Date.now();
        const timeSinceLastCheck = now - lastChecked;
        const gracePeriodEndsAt = lastChecked + this.GRACE_PERIOD_MS;

        if (timeSinceLastCheck > this.GRACE_PERIOD_MS) {
            return {
                isValid: false,
                licenseKey,
                status: 'expired', // Passed grace period
                gracePeriodEndsAt,
                lastChecked
            };
        }

        if (timeSinceLastCheck > this.GRACE_PERIOD_MS * 0.8) {
            return {
                isValid: true,
                licenseKey,
                status: 'grace_period', // Approaching expiration
                gracePeriodEndsAt,
                lastChecked
            };
        }

        return {
            isValid: true,
            licenseKey,
            status: 'active',
            gracePeriodEndsAt,
            lastChecked
        };
    }

    /**
     * Performs an online check with the Management Hub
     */
    public async verifyWithHub(stationId: string): Promise<boolean> {
        const status = await this.getLocalLicenseStatus();
        if (!status.licenseKey) {
            return false;
        }

        if (!this.hubUrl || this.hubUrl === 'http://localhost:8080') {
            this.logger.warn("[LicenseService] Hub URL not configured, skipping online validation.");
            return status.isValid;
        }

        try {
            const response = await fetch(`${this.hubUrl}/api/license/validate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    licenseKey: status.licenseKey,
                    masterId: stationId
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                if (data.valid) {
                    // Update last checked time
                    this.db.run(
                        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                        ['license_last_checked', JSON.stringify(Date.now())]
                    );
                    this.db.run(
                        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                        ['license_status', JSON.stringify('active')]
                    );
                    this.logger.info(`[LicenseService] Hub verified license successfully.`);
                    return true;
                } else {
                    // Hub rejected the license
                    this.db.run(
                        "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
                        ['license_status', JSON.stringify('invalid')]
                    );
                    this.logger.warn(`[LicenseService] Hub rejected license: ${data.reason}`);
                    return false;
                }
            } else {
                // Network error, rely on local grace period
                this.logger.warn(`[LicenseService] Hub unreachable for license check (${response.status}). Relying on local grace period.`);
                return status.isValid;
            }
        } catch (error: any) {
            this.logger.error(`[LicenseService] Error checking license with hub`, { error: error.message });
            return status.isValid;
        }
    }

    private async verifyChecksum(key: string): Promise<boolean> {
        // Try Ed25519 verification first
        // The public key must match the one used by the Management Worker & License Generator
        const PUBLIC_KEY_B64 = "PU5chItRojuz3HpsB/H0LbVh/+BYeBFM4s8gvxmEvqU=";
        
        try {
            // Get local machine ID to enforce hardware binding
            const uuidInfo = await si.uuid();
            const machineId = uuidInfo.os || uuidInfo.hardware || "UNKNOWN_MACHINE";

            const result = verifyEd25519License(key, PUBLIC_KEY_B64, { expectedMachineId: machineId });
            if (result.valid) {
                return true;
            } else if (result.error && result.error.includes('Machine ID mismatch')) {
                this.logger.warn(`[LicenseService] Hardware binding failed: License bound to different hardware.`);
                return false;
            }
        } catch (e) {
            // Ignore error, fallback to legacy
        }

        // Legacy SHA-256 fallback format: CF-LIVE-XXXX-XXXX-XXXX-XXXX-XXXX
        if (!key.startsWith('CF-LIVE-') && !key.startsWith('CF-TEST-')) {
            return false;
        }

        const parts = key.split('-');
        if (parts.length !== 7 || parts[0] !== 'CF' || (parts[1] !== 'LIVE' && parts[1] !== 'TEST')) {
            return false;
        }

        const providedChecksum = parts.pop(); // Remove and return the last segment
        if (!providedChecksum || providedChecksum.length !== 4) {
            return false;
        }

        const baseKey = parts.join('-'); // Reconstruct without checksum
        const dataToHash = baseKey + this.SECRET_SALT;

        const hash = crypto.createHash('sha256').update(dataToHash).digest('hex');
        const expectedChecksum = hash.substring(0, 4).toUpperCase();

        return providedChecksum.toUpperCase() === expectedChecksum;
    }
}
