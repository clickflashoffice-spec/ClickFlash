const Database = require('better-sqlite3');
const path = require('path');
const readline = require('readline');

// Update this path after locating the DB
const DB_PATH = path.join(process.cwd(), 'pb_data', 'master.db');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const configure = async () => {
    if (!require('fs').existsSync(DB_PATH)) {
        console.error(`Database not found at ${DB_PATH}`);
        process.exit(1);
    }

    const db = new Database(DB_PATH);
    const kiosks = db.prepare("SELECT id, name, ordersFolderPath FROM kiosks").all();

    console.log('\n--- Current Sync Configuration ---');
    kiosks.forEach((k, i) => {
        console.log(`${i + 1}. [${k.name}] Sync Path: ${k.ordersFolderPath || '(Not Set)'}`);
    });
    console.log('----------------------------------\n');

    rl.question('Enter number of kiosk to update (or 0 to exit): ', (answer) => {
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < kiosks.length) {
            const kiosk = kiosks[index];
            rl.question(`Enter new network path for '${kiosk.name}' (e.g. \\\\${kiosk.name}\\TouchOrders): `, (newPath) => {
                if (newPath) {
                    try {
                        db.prepare("UPDATE kiosks SET ordersFolderPath = ? WHERE id = ?").run(newPath, kiosk.id);
                        console.log(`✅ Updated ${kiosk.name} path to: ${newPath}`);
                    } catch (e) {
                        console.error('Error updating DB:', e.message);
                    }
                }
                rl.close();
            });
        } else {
            console.log('Exiting.');
            rl.close();
        }
    });
};

configure();
