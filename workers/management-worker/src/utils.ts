import http from 'http';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { sendNotFoundError } from './errorHandler.js';

export const copyFileWindows = async (sourcePath: string, destPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        const absSource = path.resolve(sourcePath);
        const absDest = path.resolve(destPath);
        const escapedSource = absSource.replace(/'/g, "''");
        const escapedDest = absDest.replace(/'/g, "''");
        const powershellCommand = `powershell -Command "Copy-Item -LiteralPath '${escapedSource}' -Destination '${escapedDest}' -Force -ErrorAction Stop"`;

        exec(powershellCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Windows copy failed: ${error.message}`));
                return;
            }
            resolve();
        });
    });
};

export const serveStatic = (res: http.ServerResponse, baseDir: string, urlPath: string) => {
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
        const mime: Record<string, string> = {
            '.html': 'text/html',
            '.js': 'application/javascript',
            '.css': 'text/css',
            '.json': 'application/json',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
        };
        const headers: Record<string, string> = { 'Content-Type': mime[ext] || 'application/octet-stream' };
        if (ext === '.html') {
            headers['Content-Security-Policy'] = "script-src 'unsafe-eval' 'unsafe-inline' 'self' http://localhost:* http://127.0.0.1:* https://cdn.tailwindcss.com data: blob:; style-src 'unsafe-inline' 'self' https://cdn.tailwindcss.com; object-src 'none'; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; img-src 'self' data: blob: https: http:;";
        }
        res.writeHead(200, headers);
        fs.createReadStream(targetPath).pipe(res);
    } else {
        sendNotFoundError(res, 'Page');
    }
};
