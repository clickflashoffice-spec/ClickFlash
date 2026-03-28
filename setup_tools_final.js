const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response) => {
            if (response.statusCode === 302 || response.statusCode === 301) {
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
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function setup(name, url, dest) {
    console.log(`Setting up ${name}...`);
    const zipPath = `${name}.zip`;
    const tempExtract = `${name}_temp`;

    try {
        await downloadFile(url, zipPath);
        console.log(`Downloaded ${name}.zip`);

        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

        // Use powershell for extraction
        execSync(`powershell -Command "Expand-Archive -Path ${zipPath} -DestinationPath ${tempExtract} -Force"`);

        const extractedDir = fs.readdirSync(tempExtract)[0];
        const fullExtractedPath = path.join(tempExtract, extractedDir);

        // Move contents
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
        console.log(`Successfully setup ${name} in ${dest}`);
    } catch (err) {
        console.error(`Error setup ${name}: ${err.message}`);
    }
}

async function run() {
    await setup("CLIProxyAPI", "https://codeload.github.com/router-for-me/CLIProxyAPI/zip/refs/heads/main", ".agent/tools/CLIProxyAPI");
    await setup("OpenMemory", "https://codeload.github.com/CaviraOSS/OpenMemory/zip/refs/heads/main", ".agent/tools/OpenMemory");
}

run();
