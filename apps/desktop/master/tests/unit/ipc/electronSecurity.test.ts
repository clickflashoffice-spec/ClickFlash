import path from "path";
import { isTrustedIpcSender, resolveContainedPath } from "../../../electron-security";

describe("canonical Master Electron security helpers", () => {
  it("accepts only the live top frame of the canonical window", () => {
    const mainFrame = { url: "http://localhost:8090" };
    const webContents = { mainFrame };
    const window = { isDestroyed: () => false, webContents };

    expect(isTrustedIpcSender({ sender: webContents, senderFrame: mainFrame }, window)).toBe(true);
    expect(isTrustedIpcSender({ sender: webContents, senderFrame: { url: "https://attacker.test" } }, window))
      .toBe(false);
    expect(isTrustedIpcSender({ sender: {}, senderFrame: mainFrame }, window)).toBe(false);
  });

  it("keeps protocol paths inside the application data root", () => {
    const root = path.resolve("C:/ClickFlashData");
    expect(resolveContainedPath(root, "albums/photo.jpg")).toBe(path.join(root, "albums/photo.jpg"));
    expect(resolveContainedPath(root, "../ClickFlashData-evil/photo.jpg")).toBeNull();
    expect(resolveContainedPath(root, "..\\Windows\\system.ini")).toBeNull();
    expect(resolveContainedPath(root, "")).toBeNull();
  });
});
