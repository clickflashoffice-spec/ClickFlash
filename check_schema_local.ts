import { DatabaseManager } from "./apps/master/backend/shared/db";
import path from "path";

const DB_FILE = path.join(process.cwd(), "apps/master/pb_data/master.db");
const db = new DatabaseManager(DB_FILE);
db.connect();

const tables = db.query("SELECT name FROM sqlite_master WHERE type='table'");
console.log("TABLES:", tables.map((t) => t.name).join(", "));

const checkTable = (name: string) => {
  try {
    const info = db.query(`PRAGMA table_info(${name})`);
    console.log(
      `STRUCTURE ${name}:`,
      info.map((c) => `${c.name} (${c.type})`).join(", "),
    );
  } catch (e: any) {
    console.log(`ERROR ${name}:`, e.message);
  }
};

checkTable("albums");
checkTable("photos");
checkTable("retention_queue");
checkTable("moneytrash_candidates");

db.close();
