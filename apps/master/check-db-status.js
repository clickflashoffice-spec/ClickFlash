const Database = require('better-sqlite3');
const fs = require('fs');

try {
    const db = new Database('master.db');
    const row = db.prepare("SELECT * FROM face_indexing_queue LIMIT 1").get();

    let result = "NO_DATA";
    if (row) {
        result = `STATUS:${row.status}`;
        if (row.status === 'completed') {
            const count = db.prepare("SELECT count(*) as c FROM photo_faces WHERE photoId = ?").get(row.photoId).c;
            result += `|FACES:${count}`;
        } else if (row.status === 'failed') {
            result += `|ERROR:${row.error}`;
        }
    }

    fs.writeFileSync('status.txt', result);
} catch (e) {
    fs.writeFileSync('status.txt', `EXCEPTION:${e.message}`);
}
