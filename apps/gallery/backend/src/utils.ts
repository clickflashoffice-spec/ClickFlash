import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { ServerResponse } from 'http';
import { sendNotFoundError } from './errorHandler.js';

/**
 * Windows file copy helper using PowerShell
 */
export const copyFileWindows = async (sourcePath: string, destPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const absSource = path.resolve(sourcePath);
        const absDest = path.resolve(destPath);

        const escapedSource = absSource.replace(/'/g, "''");
        const escapedDest = absDest.replace(/'/g, "''");

        const powershellCommand = `powershell -Command "Copy-Item -LiteralPath '${escapedSource}' -Destination '${escapedDest}' -Force -ErrorAction Stop"`;

        exec(powershellCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Windows copy failed: ${error.message}\nCommand: ${powershellCommand}\nStderr: ${stderr}`));
                return;
            }
            resolve();
        });
    });
};

/**
 * Static file serving helper
 */
export const serveStatic = (res: ServerResponse, baseDir: string, urlPath: string) => {
    let safePath = urlPath.replace(/^(\.\.[\/\\])+/, '');
    if (safePath === '/' || safePath === '') safePath = 'index.html';

    let targetPath = path.join(baseDir, safePath);

    if (!targetPath.startsWith(baseDir)) {
        res.writeHead(403); res.end(); return;
    }

    if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
        targetPath = path.join(baseDir, 'index.html');
    }

    if (fs.existsSync(targetPath)) {
        const ext = path.extname(targetPath).toLowerCase();
        const mimeRecord: Record<string, string> = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
        };
        const mime = mimeRecord[ext] || 'application/octet-stream';

        const headers: Record<string, string> = { 'Content-Type': mime };
        if (ext === '.html') {
            // CSP for the compiled Vite SPA served by the dev backend.
            // Tailwind is compiled at build time — no CDN script, no unsafe-eval, no unsafe-inline in script-src.
            // localhost:* / 127.0.0.1:* in script-src is required for Vite HMR in development.
            // unsafe-inline is permitted in style-src only (Tailwind CSS-in-JS at runtime) per CLAUDE.md.
            headers['Content-Security-Policy'] = "script-src 'self' http://localhost:* http://127.0.0.1:*; style-src 'unsafe-inline' 'self'; object-src 'none'; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* https://starmaster.cloud; img-src 'self' data: blob: https: http:;";
        }
        res.writeHead(200, headers);
        fs.createReadStream(targetPath).pipe(res);
    } else {
        sendNotFoundError(res, 'Page');
    }
};
