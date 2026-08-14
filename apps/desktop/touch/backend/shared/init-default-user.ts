// backend/shared/init-default-user.ts
import fs from 'fs';
import path from 'path';
import { DatabaseManager } from './db';
import { hashPassword } from './auth';

const DEFAULT_USER = {
    name: 'Alaeddine',
    email: 'alaeddine@example.com',
    password: 'DEFAULT_PASSWORD_PLACEHOLDER',
    role: 'Admin' as const,
    password_must_change: 1
};

interface PermissionMap { [role: string]: string[]; }

export async function initDefaultUser(dbManagerOrPath?: DatabaseManager | string): Promise<void> {
    let dbManager: DatabaseManager;

    if (dbManagerOrPath && typeof dbManagerOrPath !== 'string' && 'get' in dbManagerOrPath) {
        dbManager = dbManagerOrPath as DatabaseManager;
    } else {
        const dbPath = typeof dbManagerOrPath === 'string' ? path.join(dbManagerOrPath, 'data.db') : path.join(process.cwd(), 'pb_data', 'data.db');
        if (!fs.existsSync(dbPath)) return;
        dbManager = new DatabaseManager(dbPath);
        dbManager.connect();
    }

    try {
        const existingUsers = dbManager.query<{ count: number }>('SELECT COUNT(*) as count FROM users');
        const userCount = existingUsers[0]?.count || 0;

        const ALL_PERMISSIONS = [
            'viewDashboard', 'viewAlbums', 'manageOwnAlbums', 'manageAllAlbums',
            'viewOrders', 'viewOwnOrders', 'viewAllOrders',
            'viewPhotographers', 'managePhotographers',
            'viewBookings', 'manageBookings',
            'viewSettings', 'manageLocalSettings', 'manageSessionTypes',
            'viewProducts', 'manageProducts',
            'viewManagementDashboard', 'viewDestinations', 'viewReports',
            'viewExpenses', 'viewCapital', 'viewAdjustments', 'manageAdjustments',
            'viewPerformance', 'viewWarehouse', 'manageEquipmentCategories',
            'viewPayroll', 'runPayroll', 'viewEcommerceSettings',
            'viewGlobalSettings', 'manageGlobalSettings', 'viewDocumentation',
            'manageExpenseCategories'
        ];

        const PERMISSIONS: PermissionMap = {
            Photographer: ['viewDashboard', 'viewAlbums', 'manageOwnAlbums', 'viewOrders', 'viewOwnOrders', 'viewBookings', 'viewDocumentation', 'viewProducts'],
            'Team Leader': ['viewDashboard', 'viewAlbums', 'manageAllAlbums', 'viewOrders', 'viewAllOrders', 'viewPhotographers', 'viewBookings', 'manageBookings', 'viewSettings', 'manageLocalSettings', 'manageSessionTypes', 'viewDocumentation', 'viewProducts', 'manageProducts'],
            Admin: ['viewDashboard', 'viewAlbums', 'manageOwnAlbums', 'manageAllAlbums', 'viewOrders', 'viewOwnOrders', 'viewAllOrders', 'viewPhotographers', 'managePhotographers', 'viewBookings', 'manageBookings', 'viewSettings', 'manageLocalSettings', 'manageSessionTypes', 'viewDocumentation', 'viewProducts', 'manageProducts', 'viewManagementDashboard', 'viewDestinations', 'viewReports', 'viewExpenses', 'viewCapital', 'viewAdjustments', 'viewPerformance', 'viewWarehouse', 'viewPayroll', 'viewEcommerceSettings', 'viewGlobalSettings'],
            Manager: ['viewManagementDashboard', 'viewDestinations', 'viewReports', 'viewExpenses', 'viewCapital', 'viewAdjustments', 'manageAdjustments', 'viewPerformance', 'viewWarehouse', 'viewPayroll', 'runPayroll', 'viewEcommerceSettings', 'viewGlobalSettings', 'manageGlobalSettings', 'manageExpenseCategories', 'manageEquipmentCategories', 'manageSessionTypes', 'viewDocumentation', 'viewDashboard', 'viewAlbums', 'viewOrders', 'viewPhotographers', 'viewBookings', 'viewSettings', 'manageLocalSettings', 'viewProducts', 'manageProducts'],
            CEO: ALL_PERMISSIONS
        };

        try {
            const tableCheck = dbManager.query("SELECT name FROM sqlite_master WHERE type='table' AND name='role_permissions'");
            if (tableCheck.length > 0) {
                const permCount = dbManager.query<{ count: number }>('SELECT COUNT(*) as count FROM role_permissions');
                if (permCount[0]?.count === 0) {
                    dbManager.transaction(() => {
                        const insert = dbManager.getDb().prepare('INSERT INTO role_permissions (role, permission) VALUES (?, ?)');
                        Object.entries(PERMISSIONS).forEach(([role, perms]) => {
                            perms.forEach(perm => insert.run(role, perm));
                        });
                    });
                }
            }
        } catch (e) { }

        const defaultUser = dbManager.get<{ role: string }>('SELECT * FROM users WHERE email = ?', [DEFAULT_USER.email]);
        if (userCount === 0 || !defaultUser) {
            const hashedPassword = await hashPassword(DEFAULT_USER.password);
            let columns = ['name', 'email', 'password', 'role'];
            let placeholders = ['?', '?', '?', '?'];
            let values: any[] = [DEFAULT_USER.name, DEFAULT_USER.email, hashedPassword, DEFAULT_USER.role];

            try {
                const schemaInfo = dbManager.query<{ name: string }>("PRAGMA table_info(users)");
                if (schemaInfo.some(col => col.name === 'password_must_change')) {
                    columns.push('password_must_change');
                    placeholders.push('?');
                    values.push(DEFAULT_USER.password_must_change);
                }
            } catch (e) { }

            const insertSql = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
            dbManager.run(insertSql, values);
        }
    } catch (error) { }
}
