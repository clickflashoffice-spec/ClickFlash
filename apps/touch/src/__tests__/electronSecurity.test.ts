import { describe, expect, it } from "vitest";
import { isTrustedIpcSender, isTrustedLoopbackRendererUrl } from "../../electron-security";

describe("Touch Electron security helpers", () => {
    it("accepts only the live top frame of the kiosk window", () => {
        const mainFrame = { url: "http://127.0.0.1:8001" };
        const webContents = { mainFrame };
        const window = { isDestroyed: () => false, webContents };

        expect(isTrustedIpcSender({ sender: webContents, senderFrame: mainFrame }, window)).toBe(true);
        expect(isTrustedIpcSender({ sender: webContents, senderFrame: {} }, window)).toBe(false);
        expect(isTrustedIpcSender({ sender: {}, senderFrame: mainFrame }, window)).toBe(false);
    });

    it("limits kiosk navigation to the active loopback origin", () => {
        expect(isTrustedLoopbackRendererUrl("http://127.0.0.1:8001/?mode=touch", 8001)).toBe(true);
        expect(isTrustedLoopbackRendererUrl("http://localhost:8001/?mode=touch", 8001)).toBe(true);
        expect(isTrustedLoopbackRendererUrl("http://192.168.1.50:8001", 8001)).toBe(false);
        expect(isTrustedLoopbackRendererUrl("https://127.0.0.1:8001", 8001)).toBe(false);
        expect(isTrustedLoopbackRendererUrl("http://127.0.0.1:9000", 8001)).toBe(false);
    });
});
