import { describe, expect, it } from "vitest";
import path from "path";
import {
  getApprovedDirectory,
  getApprovedExecutable,
  getBoundedString,
  getPinnedPrivateIpv4,
  getPrivateLanHost,
  getSafeExternalUrl,
  getSafeCloudBaseUrl,
  getValidPort,
  isTrustedRendererUrl,
} from "./electron-security";

describe("installer Electron security boundaries", () => {
  it("accepts only the exact development origin or packaged files", () => {
    expect(isTrustedRendererUrl("http://localhost:5175/setup", false, "http://localhost:5175")).toBe(true);
    expect(isTrustedRendererUrl("http://localhost.attacker.test:5175", false, "http://localhost:5175")).toBe(false);
    expect(isTrustedRendererUrl("https://example.test", false, "http://localhost:5175")).toBe(false);
    expect(isTrustedRendererUrl(
      "file:///C:/ClickFlash/index.html",
      true,
      "http://localhost:5175",
      "C:/ClickFlash/index.html",
    )).toBe(true);
    expect(isTrustedRendererUrl(
      "file:///C:/Windows/System32/index.html",
      true,
      "http://localhost:5175",
      "C:/ClickFlash/index.html",
    )).toBe(false);
  });

  it("opens only credential-free HTTPS URLs", () => {
    const allowedHosts = ["hub.clickflash.app", "dash.cloudflare.com"];
    expect(getSafeExternalUrl("https://hub.clickflash.app/fleet/MASTER_1", allowedHosts)).toBe(
      "https://hub.clickflash.app/fleet/MASTER_1",
    );
    expect(getSafeExternalUrl("https://example.test", allowedHosts)).toBeNull();
    expect(getSafeExternalUrl("http://hub.clickflash.app", allowedHosts)).toBeNull();
    expect(getSafeExternalUrl("file:///C:/Windows/System32/calc.exe", allowedHosts)).toBeNull();
    expect(getSafeExternalUrl("https://user:secret@hub.clickflash.app", allowedHosts)).toBeNull();
  });

  it("restricts launch targets to named executables in the approved directory", () => {
    const root = path.resolve("C:/ClickFlash");
    expect(getApprovedDirectory(root)).toBe(root);
    expect(getApprovedDirectory("../ClickFlash")).toBeNull();
    expect(getApprovedExecutable(path.join(root, "ClickFlash Master.exe"), root, "ClickFlash Master.exe"))
      .toBe(path.join(root, "ClickFlash Master.exe"));
    expect(getApprovedExecutable(path.join(root, "malware.exe"), root, "ClickFlash Master.exe")).toBeNull();
    expect(getApprovedExecutable(path.join(root, "nested", "ClickFlash Master.exe"), root, "ClickFlash Master.exe"))
      .toBeNull();
  });

  it("accepts only approved cloud origins", () => {
    const hosts = ["hub.clickflash.app"];
    expect(getSafeCloudBaseUrl("https://hub.clickflash.app/", hosts)).toBe("https://hub.clickflash.app");
    expect(getSafeCloudBaseUrl("https://hub.clickflash.app/api", hosts)).toBeNull();
    expect(getSafeCloudBaseUrl("https://attacker.test/", hosts)).toBeNull();
  });

  it("accepts private LAN hosts, bounded ports, and bounded identifiers", () => {
    expect(getPrivateLanHost("192.168.1.50")).toBe("192.168.1.50");
    expect(getPrivateLanHost("studio-master.local")).toBe("studio-master.local");
    expect(getPrivateLanHost("8.8.8.8")).toBeNull();
    expect(getPrivateLanHost("example.test")).toBeNull();
    expect(getValidPort(8090)).toBe(8090);
    expect(getValidPort(70_000)).toBeNull();
    expect(getBoundedString(" MASTER_TUNIS_01 ", 64)).toBe("MASTER_TUNIS_01");
    expect(getBoundedString("bad\nvalue", 64)).toBeNull();
  });

  it("pins LAN names only when every resolved address remains private", () => {
    expect(getPinnedPrivateIpv4("studio-master.local", ["192.168.1.20"])).toBe("192.168.1.20");
    expect(getPinnedPrivateIpv4("studio-master.local", ["192.168.1.20", "8.8.8.8"])).toBeNull();
    expect(getPinnedPrivateIpv4("studio-master.local", [])).toBeNull();
    expect(getPinnedPrivateIpv4("10.0.0.25", ["8.8.8.8"])).toBe("10.0.0.25");
  });
});
