const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

function cloneRepo(url, dest) {
    console.log(`Cloning ${url} to ${dest}...`);
    if (!fs.existsSync(path.dirname(dest))) {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
    }

    // shell: false is the key here to avoid CMD/PS interpretation
    const git = spawn('git', ['clone', '--depth', '1', url, dest], { shell: false });

    git.stdout.on('data', (data) => console.log(`[STDOUT] ${data}`));
    git.stderr.on('data', (data) => console.error(`[STDERR] ${data}`));

    git.on('close', (code) => {
        console.log(`Git process exited with code ${code}`);
    });
}

const tools = [
    ["https://github.com/router-for-me/CLIProxyAPI.git", ".agent/tools/CLIProxyAPI"],
    ["https://github.com/CaviraOSS/OpenMemory.git", ".agent/tools/OpenMemory"]
];

tools.forEach(([url, dest]) => cloneRepo(url, dest));
