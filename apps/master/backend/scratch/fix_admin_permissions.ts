import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Using __dirname workaround for ES modules if needed, but since it's tsx we can just use process.cwd() or absolute path
const dbPath = path.resolve('C:/Users/alamo/Desktop/ClickFlash/apps/master/pb_data/master.db');
const db = new Database(dbPath);

const adminPermissions = [
    'viewDashboard',
    'viewAlbums',
    'manageOwnAlbums',
    'manageAllAlbums',
    'viewOrders',
    'viewOwnOrders',
    'viewAllOrders',
    'viewPhotographers',
    'managePhotographers',
    'viewBookings',
    'manageBookings',
    'viewSettings',
    'manageLocalSettings',
    'manageSystemInfrastructure',
    'manageSessionTypes',
    'viewDocumentation',
    'viewProducts',
    'manageProducts',
    'viewManagementDashboard',
    'viewDestinations',
    'viewReports',
    'viewExpenses',
    'viewCapital',
    'viewAdjustments',
    'viewPerformance',
    'viewWarehouse',
    'viewPayroll',
    'viewEcommerceSettings',
    'viewGlobalSettings',
    'viewMoneyTrash',
    'viewClients',
    'viewMarketing',
    'viewGrowth'
];

console.log('Fixing Admin permissions in DB: ', dbPath);

const insertStmt = db.prepare(`
  INSERT INTO role_permissions (role, permission) 
  VALUES (?, ?) 
  ON CONFLICT(role, permission) DO NOTHING
`);

const insertMany = db.transaction((role: string, permissions: string[]) => {
  let count = 0;
  for (const p of permissions) {
    const info = insertStmt.run(role, p);
    if (info.changes > 0) count++;
  }
  return count;
});

const inserted = insertMany('Admin', adminPermissions);
console.log(`Inserted ${inserted} missing permissions for Admin role.`);

const teamLeaderPermissions = [
        'viewDashboard',
        'viewAlbums',
        'manageAllAlbums',
        'viewOrders',
        'viewAllOrders',
        'viewPhotographers',
        'viewBookings',
        'manageBookings',
        'viewSettings',
        'manageLocalSettings',
        'manageSessionTypes',
        'viewDocumentation',
        'viewProducts',
        'manageProducts',
        'viewClients', 
        'viewGrowth',
];
const insertedTL = insertMany('Team Leader', teamLeaderPermissions);
console.log(`Inserted ${insertedTL} missing permissions for Team Leader role.`);

db.close();
console.log('Done.');
