import Database from 'better-sqlite3-multiple-ciphers';
import path from 'path';

const dbPath = path.resolve('pb_data/master.db');
console.log(`Connecting to ${dbPath}`);

try {
  const db = new Database(dbPath);

  // Check current permissions for Admin
  const current = db.prepare("SELECT * FROM role_permissions WHERE role = 'Admin'").all();
  console.log("Current Admin permissions:", current.map((c: any) => c.permission));

  const missingPermissions = [
    'viewClients',
    'viewBookings',
    'viewPhotographers',
    'viewGrowth',
    'viewMarketing',
    'viewMoneyTrash',
    'manageSystemInfrastructure'
  ];

  const insert = db.prepare("INSERT OR IGNORE INTO role_permissions (role, permission, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)");

  const runInsert = db.transaction((role: string, perms: string[]) => {
    for (const p of perms) {
      insert.run(role, p);
    }
  });

  runInsert('Admin', missingPermissions);
  runInsert('CEO', missingPermissions); 

  console.log("Permissions inserted successfully.");

  const after = db.prepare("SELECT * FROM role_permissions WHERE role = 'Admin'").all();
  console.log("New Admin permissions:", after.map((c: any) => c.permission));

  db.close();
} catch (e) {
  console.error("Error:", e);
}
