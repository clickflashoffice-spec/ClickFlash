const fs = require('fs');
const path = require('path');

const files = [
    ['C:/Users/alamo/Desktop/ClickFlash/apps/master/backend/routes/collections.ts', 'e:/ClickFlash/apps/master/backend/routes/collections.ts'],
    ['C:/Users/alamo/Desktop/ClickFlash/apps/master/backend/shared/photoProcessor.ts', 'e:/ClickFlash/apps/master/backend/shared/photoProcessor.ts'],
    ['C:/Users/alamo/Desktop/ClickFlash/apps/master/backend/workers/photoWorker.ts', 'e:/ClickFlash/apps/master/backend/workers/photoWorker.ts'],
    ['C:/Users/alamo/Desktop/ClickFlash/apps/master/backend/server.ts', 'e:/ClickFlash/apps/master/backend/server.ts'],
    ['C:/Users/alamo/Desktop/ClickFlash/apps/master/backend/shared/db.ts', 'e:/ClickFlash/apps/master/backend/shared/db.ts'],
    ['C:/Users/alamo/Desktop/ClickFlash/apps/master/backend/services/realtimeService.ts', 'e:/ClickFlash/apps/master/backend/services/realtimeService.ts'],
    ['C:/Users/alamo/Desktop/ClickFlash/apps/master/backend/config/constants.ts', 'e:/ClickFlash/apps/master/backend/config/constants.ts']
];

files.forEach(([src, dest]) => {
    try {
        console.log(`Copying ${src} to ${dest}...`);
        fs.copyFileSync(src, dest);
        console.log(`Success: ${dest}`);
    } catch (err) {
        console.error(`Failed to copy ${src}: ${err.message}`);
    }
});
