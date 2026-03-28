const fs = require('fs');
const logPath = 'e:\\ClickFlash\\apps\\master\\pb_data\\logs\\info-2026-02-17.log';
try {
    if (!fs.existsSync(logPath)) {
        console.error('Log file not found:', logPath);
        process.exit(1);
    }
    const data = fs.readFileSync(logPath, 'utf8');
    const lines = data.split('\n');
    console.log(lines.slice(-100).join('\n'));
} catch (e) {
    console.error('Error reading log:', e);
}
