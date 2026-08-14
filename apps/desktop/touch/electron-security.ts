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

export function isTrustedLoopbackRendererUrl(value: unknown, port: number | null): boolean {
    if (typeof value !== "string" || !port) return false;
    try {
        const url = new URL(value);
        const loopback = url.hostname === "localhost" || url.hostname === "127.0.0.1";
        return url.protocol === "http:" && loopback && Number(url.port || "80") === port;
    } catch {
        return false;
    }
}

export function resolveRendererAssetPath(root: string, requestUrl: unknown): string | null {
    if (typeof requestUrl !== "string" || requestUrl.includes("\0")) return null;

    try {
        const url = new URL(requestUrl, "http://127.0.0.1");
        const decodedPath = decodeURIComponent(url.pathname);
        const relativePath = decodedPath === "/"
            ? "index.html"
            : decodedPath.replace(/^[/\\]+/, "");
        const resolvedRoot = path.resolve(root);
        const resolvedPath = path.resolve(resolvedRoot, relativePath);
        const relative = path.relative(resolvedRoot, resolvedPath);
        if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return null;
        return resolvedPath;
    } catch {
        return null;
    }
}
