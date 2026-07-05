import { DatabaseManager } from "../database/db.js";
import path from "path";

import { logger } from "../utils/logger";

async function check() {
  const dbPath = path.join(process.cwd(), "apps/master/pb_data/master.db");
  const db = new DatabaseManager(dbPath);
  db.connect();

  const photos = db.query("SELECT id, albumId FROM photos LIMIT 5");
  const retention = db.query(
    "SELECT asset_id, album_id FROM retention_queue LIMIT 5",
  );

  logger.info("PHOTO SAMPLES:", photos);
  logger.info("RETENTION SAMPLES:", retention);

  const countJoin = db.get(`
        SELECT COUNT(*) as count 
        FROM retention_queue rq
        JOIN photos p ON rq.asset_id = p.id
        WHERE rq.status = 'pending'
    `);
  logger.info("JOINED COUNT:", countJoin.count);

  db.close();
}

check().catch(console.error);
