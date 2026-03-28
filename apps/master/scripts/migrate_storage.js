const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.join(__dirname, '..', 'master-app', 'react-new-backup', 'uploads');

async function migrate() {
    console.log(`Starting storage migration in: ${UPLOAD_DIR}`);

    if (!fs.existsSync(UPLOAD_DIR)) {
        console.error('Upload directory not found.');
        return;
    }

    const albums = fs.readdirSync(UPLOAD_DIR);

    for (const albumId of albums) {
        const albumPath = path.join(UPLOAD_DIR, albumId);
        if (!fs.statSync(albumPath).isDirectory()) continue;

        const highResDir = path.join(albumPath, 'highres');
        const thumbsDir = path.join(albumPath, 'thumbs');

        if (!fs.existsSync(highResDir)) fs.mkdirSync(highResDir, { recursive: true });
        if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true });

        const items = fs.readdirSync(albumPath);
        for (const item of items) {
            const itemPath = path.join(albumPath, item);
            if (fs.statSync(itemPath).isDirectory()) continue;

            // Move legacy files to highres
            const targetPath = path.join(highResDir, item);
            console.log(`Moving ${item} -> highres/${item}`);
            fs.renameSync(itemPath, targetPath);
        }
    }
    console.log('Migration complete.');
}

migrate();
