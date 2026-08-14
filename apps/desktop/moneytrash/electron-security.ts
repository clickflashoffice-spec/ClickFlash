import { BrowserWindow, IpcMainInvokeEvent, app } from "electron";

const DEV_ORIGIN = "http://127.0.0.1:1420";
const PRODUCTION_API_HOSTS = new Set([
  "moneytrash-api.clickflash-office.workers.dev",
  "moneytrash-api.clickflash.com",
]);

function isApprovedMoneyTrashHost(hostname: string): boolean {
  return PRODUCTION_API_HOSTS.has(hostname)
    || /^moneytrash-api(?:-[a-z0-9-]+)?\.[a-z0-9-]+\.workers\.dev$/i.test(hostname);
}

export function isTrustedIpcSender(event: IpcMainInvokeEvent, window: BrowserWindow | null): boolean {
  return Boolean(
    window
    && !window.isDestroyed()
    && event.sender === window.webContents
    && event.senderFrame === window.webContents.mainFrame,
  );
}

export function isTrustedRendererUrl(value: string, packagedEntryUrl: string): boolean {
  try {
    const url = new URL(value);
    if (!app.isPackaged) return url.origin === DEV_ORIGIN;
    return url.toString() === packagedEntryUrl;
  } catch {
    return false;
  }
}

export function parseApprovedApiUrl(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("API URL credentials, query parameters, and fragments are not allowed");
  }
  url.pathname = url.pathname.replace(/\/$/, "");

  const isApprovedProduction = url.protocol === "https:"
    && isApprovedMoneyTrashHost(url.hostname);
  const isApprovedDevelopment = !app.isPackaged
    && url.protocol === "http:"
    && ["127.0.0.1", "localhost"].includes(url.hostname);

  if (!isApprovedProduction && !isApprovedDevelopment) {
    throw new Error("API URL is not an approved MoneyTrash endpoint");
  }
  return url.toString().replace(/\/$/, "");
}

export function parseApprovedExternalUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Only credential-free HTTPS links are allowed");
  }
  const approved = url.hostname === "clickflash.com"
    || url.hostname.endsWith(".clickflash.com")
    || isApprovedMoneyTrashHost(url.hostname);
  if (!approved) throw new Error("External link host is not approved");
  return url.toString();
}
