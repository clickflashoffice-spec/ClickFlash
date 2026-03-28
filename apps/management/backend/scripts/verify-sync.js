const sqlite3 = require("better-sqlite3");
const path = require("path");

const DB_FILE = "E:\\ClickFlash\\apps\\management\\pb_data\\data.db";

async function check() {
    console.log(`Checking Hub Database: ${DB_FILE}`);
    const db = new sqlite3(DB_FILE);

    const orders = db.prepare("SELECT * FROM orders WHERE id LIKE 'TEST_ORDER_%'").all();
    console.log(`Found ${orders.length} test orders`);
    if (orders.length > 0) {
        orders.forEach(o => {
            console.log(`- Order: ${o.id} (${o.orderNumber}), Status: ${o.status}, Total: ${o.total}, Desk: ${o.desk_id}`);
        });
    }
    
    process.exit(0);
}

check().catch(err => {
    console.error(err);
    process.exit(1);
});
