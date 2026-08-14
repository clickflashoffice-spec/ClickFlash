import { Logger } from "../utils/logger";
import { DatabaseManager } from "../database/db";
import {
    getLicenseMachineId,
    verifySignedDesktopLicense,
} from "../shared/desktopLicenseContract";

export interface LicenseStatus {
    isValid: boolean;
    licenseKey: string | null;
    status: 'active' | 'grace_period' | 'expired' | 'invalid' | 'unlicensed';
    gracePeriodEndsAt: number | null;
    lastChecked: number | null;
}

interface LicenseServiceOptions {
    publicKeyB64?: string;
    getMachineId?: () => Promise<string>;
}

export class LicenseService {
    private readonly GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
    private readonly publicKeyB64: string;
    private readonly getMachineId: () => Promise<string>;

    constructor(
        private readonly db: DatabaseManager,
        private readonly logger: Logger,
        private readonly hubUrl: string,
        options: LicenseServiceOptions = {},
    ) {
        this.publicKeyB64 = options.publicKeyB64
            ?? process.env.CLICKFLASH_LICENSE_PUBLIC_KEY?.trim()
            ?? "";
        this.getMachineId = options.getMachineId ?? getLicenseMachineId;
    }

    /**
     * Set a new license key in the system
     */
    public async setLicenseKey(key: string): Promise<boolean> {
        if (!await this.verifyLicenseKey(key)) {
            this.logger.warn("[LicenseService] Rejected invalid or unbound signed license.");
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

        // Re-verify the same signature and machine binding enforced at startup.
        if (!await this.verifyLicenseKey(licenseKey)) {
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

    private async verifyLicenseKey(key: string): Promise<boolean> {
        try {
            const machineId = await this.getMachineId();
            const result = verifySignedDesktopLicense(key, this.publicKeyB64);
            return Boolean(
                result.valid
                && result.license
                && result.license.machineId === machineId,
            );
        } catch {
            return false;
        }
    }
}
