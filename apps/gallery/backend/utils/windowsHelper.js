const { exec } = require('child_process');
const path = require('path');

/**
 * Windows file copy helper using PowerShell
 * Necessary for stable file operations in the Windows-based photography ecosystem
 */
const copyFileWindows = async (sourcePath, destPath) => {
    return new Promise((resolve, reject) => {
        const absSource = path.resolve(sourcePath);
        const absDest = path.resolve(destPath);

        const escapedSource = absSource.replace(/'/g, "''");
        const escapedDest = absDest.replace(/'/g, "''");

        const powershellCommand = `powershell -Command "Copy-Item -LiteralPath '${escapedSource}' -Destination '${escapedDest}' -Force -ErrorAction Stop"`;

        exec(powershellCommand, { maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`Windows copy failed: ${error.message}\nStderr: ${stderr}`));
                return;
            }
            resolve();
        });
    });
};

module.exports = {
    copyFileWindows
};
