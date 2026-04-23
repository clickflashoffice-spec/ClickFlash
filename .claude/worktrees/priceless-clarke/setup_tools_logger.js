const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const logFile = path.join(__dirname, 'setup_debug.log');
function log(msg) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`);
    console.log(msg);
}

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        log(`Starting download: ${url}`);
        const file = fs.createWriteStream(dest);
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
                log(`Redirecting to ${response.headers.location}`);
                downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                log(`Download complete: ${dest}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function setup(name, url, dest) {
    log(`--- Setting up ${name} ---`);
    const zipPath = path.join(__dirname, `${name}.zip`);
    const tempExtract = path.join(__dirname, `${name}_temp`);

    try {
        await downloadFile(url, zipPath);

        if (!fs.existsSync(dest)) {
            log(`Creating destination directory: ${dest}`);
            fs.mkdirSync(dest, { recursive: true });
        }

        log(`Extracting ${zipPath} via PowerShell...`);
        execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempExtract}' -Force"`);
        log(`Extraction complete for ${name}`);

        const extractedDirs = fs.readdirSync(tempExtract);
        if (extractedDirs.length === 0) throw new Error("Extraction folder is empty");

        const fullExtractedPath = path.join(tempExtract, extractedDirs[0]);
        log(`Moving files from ${fullExtractedPath} to ${dest}`);

        const items = fs.readdirSync(fullExtractedPath);
        for (const item of items) {
            const src = path.join(fullExtractedPath, item);
            const target = path.join(dest, item);
            if (fs.existsSync(target)) {
                if (fs.lstatSync(target).isDirectory()) fs.rmSync(target, { recursive: true });
                else fs.unlinkSync(target);
            }
            fs.renameSync(src, target);
        }

        fs.rmSync(tempExtract, { recursive: true });
        fs.unlinkSync(zipPath);
        log(`Successfully setup ${name}`);
    } catch (err) {
        log(`ERROR setting up ${name}: ${err.message}`);
    }
}

async function run() {
    log('=== Tool Setup Session Started ===');
    await setup("CLIProxyAPI", "https://codeload.github.com/router-for-me/CLIProxyAPI/zip/refs/heads/main", path.join(__dirname, ".agent", "tools", "CLIProxyAPI"));
    await setup("OpenMemory", "https://codeload.github.com/CaviraOSS/OpenMemory/zip/refs/heads/main", path.join(__dirname, ".agent", "tools", "OpenMemory"));
    log('=== Tool Setup Session Completed ===');
}

run();
