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
