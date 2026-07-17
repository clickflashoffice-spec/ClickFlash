import path from "path";

interface IpcSenderEventLike {
  sender: unknown;
  senderFrame: unknown;
}

interface BrowserWindowLike {
  isDestroyed: () => boolean;
  webContents: {
    mainFrame: unknown;
  };
}

export function isTrustedIpcSender(
  event: IpcSenderEventLike,
  window: BrowserWindowLike | null,
): boolean {
  return Boolean(
    window
    && !window.isDestroyed()
    && event.sender === window.webContents
    && event.senderFrame === window.webContents.mainFrame,
  );
}

export function resolveContainedPath(root: string, relativePath: string): string | null {
  if (!relativePath || relativePath.includes("\0")) return null;

  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);
  const relative = path.relative(resolvedRoot, resolvedPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return resolvedPath;
}
