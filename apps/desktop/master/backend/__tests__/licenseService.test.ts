import { LicenseService } from "../services/license-service";
import { createTestLicenseSigner } from "./helpers/signedLicense";

describe("LicenseService (Master OS)", () => {
    const machineId = "test-machine-id";
    let mockDb: any;
    let mockLogger: any;
    let licenseService: LicenseService;
    let validKey: string;

    beforeEach(() => {
        const signer = createTestLicenseSigner(machineId);
        validKey = signer.signLicense();
        mockDb = {
            get: jest.fn(),
            run: jest.fn(),
        };
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };
        global.fetch = jest.fn() as any;
        licenseService = new LicenseService(mockDb, mockLogger, "https://hub.example", {
            publicKeyB64: signer.publicKeyB64,
            getMachineId: async () => machineId,
        });
    });

    describe("setLicenseKey", () => {
        it("rejects the legacy checksum format without logging the key", async () => {
            const legacyKey = "CF-LIVE-1234-5678-9012-3456-DEAD";

            await expect(licenseService.setLicenseKey(legacyKey)).resolves.toBe(false);
            expect(mockDb.run).not.toHaveBeenCalled();
            expect(JSON.stringify(mockLogger.warn.mock.calls)).not.toContain(legacyKey);
        });

        it("rejects a valid signature bound to another machine", async () => {
            const signer = createTestLicenseSigner("another-machine");
            const service = new LicenseService(mockDb, mockLogger, "https://hub.example", {
                publicKeyB64: signer.publicKeyB64,
                getMachineId: async () => machineId,
            });

            await expect(service.setLicenseKey(signer.signLicense())).resolves.toBe(false);
            expect(mockDb.run).not.toHaveBeenCalled();
        });

        it("rejects a signed license without hardware binding", async () => {
            const signer = createTestLicenseSigner(machineId);
            const service = new LicenseService(mockDb, mockLogger, "https://hub.example", {
                publicKeyB64: signer.publicKeyB64,
                getMachineId: async () => machineId,
            });

            await expect(service.setLicenseKey(signer.signLicense({ machineId: undefined }))).resolves.toBe(false);
        });

        it("stores a valid hardware-bound Ed25519 license", async () => {
            await expect(licenseService.setLicenseKey(validKey)).resolves.toBe(true);
            expect(mockDb.run).toHaveBeenCalledTimes(3);
        });
    });

    describe("getLocalLicenseStatus", () => {
        it("returns unlicensed when no key is found", async () => {
            mockDb.get.mockReturnValue(null);

            const status = await licenseService.getLocalLicenseStatus();

            expect(status.isValid).toBe(false);
            expect(status.status).toBe("unlicensed");
        });

        it("returns invalid when the stored signature is bad", async () => {
            mockDb.get.mockImplementation((query: string) => (
                query.includes("license_key") ? { value: JSON.stringify(`${validKey}tampered`) } : null
            ));

            const status = await licenseService.getLocalLicenseStatus();

            expect(status.isValid).toBe(false);
            expect(status.status).toBe("invalid");
        });

        it("starts the local grace clock for a verified license", async () => {
            mockDb.get.mockImplementation((query: string) => {
                if (query.includes("license_key")) return { value: JSON.stringify(validKey) };
                if (query.includes("license_status")) return { value: JSON.stringify("active") };
                return null;
            });

            const status = await licenseService.getLocalLicenseStatus();

            expect(status.isValid).toBe(true);
            expect(status.status).toBe("active");
            expect(status.lastChecked).not.toBeNull();
        });

        it("expires the online-verification grace period after seven days", async () => {
            const eightDaysAgo = Date.now() - (8 * 24 * 60 * 60 * 1000);
            mockDb.get.mockImplementation((query: string) => {
                if (query.includes("license_key")) return { value: JSON.stringify(validKey) };
                if (query.includes("license_last_checked")) return { value: JSON.stringify(eightDaysAgo) };
                if (query.includes("license_status")) return { value: JSON.stringify("active") };
                return null;
            });

            const status = await licenseService.getLocalLicenseStatus();

            expect(status.isValid).toBe(false);
            expect(status.status).toBe("expired");
        });

        it("honors an explicit hub invalidation", async () => {
            mockDb.get.mockImplementation((query: string) => {
                if (query.includes("license_key")) return { value: JSON.stringify(validKey) };
                if (query.includes("license_last_checked")) return { value: JSON.stringify(Date.now()) };
                if (query.includes("license_status")) return { value: JSON.stringify("invalid") };
                return null;
            });

            const status = await licenseService.getLocalLicenseStatus();

            expect(status.isValid).toBe(false);
            expect(status.status).toBe("invalid");
        });
    });

    describe("verifyWithHub", () => {
        beforeEach(() => {
            mockDb.get.mockImplementation((query: string) => {
                if (query.includes("license_key")) return { value: JSON.stringify(validKey) };
                if (query.includes("license_last_checked")) return { value: JSON.stringify(Date.now() - 1000) };
                if (query.includes("license_status")) return { value: JSON.stringify("active") };
                return null;
            });
        });

        it("updates lastChecked after successful hub verification", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ valid: true }),
            });

            await expect(licenseService.verifyWithHub("test-station-1")).resolves.toBe(true);
            expect(global.fetch).toHaveBeenCalledWith(
                "https://hub.example/api/license/validate",
                expect.any(Object),
            );
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO settings"),
                expect.arrayContaining(["license_last_checked", expect.any(String)]),
            );
        });

        it("marks the local status invalid when the hub rejects it", async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: async () => ({ valid: false, reason: "REVOKED" }),
            });

            await expect(licenseService.verifyWithHub("test-station-1")).resolves.toBe(false);
            expect(mockDb.run).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO settings"),
                expect.arrayContaining(["license_status", JSON.stringify("invalid")]),
            );
        });

        it("uses verified local grace state when the network fails", async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

            await expect(licenseService.verifyWithHub("test-station-1")).resolves.toBe(true);
            expect(mockLogger.error).toHaveBeenCalledWith(
                expect.stringContaining("Error checking license"),
                expect.any(Object),
            );
        });
    });
});
