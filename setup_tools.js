const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function downloadAndExtract(url, dest) {
    console.log(`Downloading ${url} to ${dest}...`);
    const file = fs.createWriteStream("temp.zip");
    https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
            console.log(`Redirecting to ${response.headers.location}`);
            downloadAndExtract(response.headers.location, dest);
            return;
        }
        response.pipe(file);
        file.on('finish', () => {
            file.close();
            console.log('Download complete. Extracting...');
            try {
                if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
                // Use built-in tar on Windows if available, or just shell out to powershell Expand-Archive
                const powershellCmd = `powershell -Command "Expand-Archive -Path temp.zip -DestinationPath temp_extract -Force"`;
                execSync(powershellCmd);

                const extractedDir = fs.readdirSync('temp_extract')[0];
                const fullExtractedPath = path.join('temp_extract', extractedDir);

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

                fs.rmSync('temp_extract', { recursive: true });
                fs.unlinkSync('temp.zip');
                console.log(`Successfully setup ${dest}`);
            } catch (err) {
                console.error(`Extraction failed: ${err.message}`);
            }
        });
    }).on('error', (err) => {
        console.error(`Download failed: ${err.message}`);
    });
}

const tools = [
    { url: "https://codeload.github.com/router-for-me/CLIProxyAPI/zip/refs/heads/main", dest: ".agent/tools/CLIProxyAPI" },
    { url: "https://codeload.github.com/CaviraOSS/OpenMemory/zip/refs/heads/main", dest: ".agent/tools/OpenMemory" }
];

// Run sequentially to avoid file locks
let current = 0;
function runNext() {
    if (current < tools.length) {
        downloadAndExtract(tools[current].url, tools[current].dest);
        current++;
        // This is a bit naive for async, but since we are script-based it's okay if we wait or just fire them.
        // Actually, let's just do them one by one.
    }
}
runNext();
setTimeout(runNext, 5000); // Hacky delay for the first one to finish
