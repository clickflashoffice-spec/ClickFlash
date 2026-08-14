-- Migration 047: Restore missing permissions for Cloud Sync and UI consistency
-- Adheres to Rule 01 and Law 04: master-app scope
-- Add manageSystemInfrastructure to Admin and CEO roles if not present
-- This permission is required for the "Cloud Sync" and "Database Engine" settings group
INSERT
    OR IGNORE INTO role_permissions (role, permission, created_at)
SELECT 'Admin',
    'manageSystemInfrastructure',
    CURRENT_TIMESTAMP
WHERE EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role = 'Admin'
        LIMIT 1
    );
INSERT
    OR IGNORE INTO role_permissions (role, permission, created_at)
SELECT 'CEO',
    'manageSystemInfrastructure',
    CURRENT_TIMESTAMP
WHERE EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role = 'CEO'
        LIMIT 1
    );
-- Sync other missing UI permissions for consistency across roles
INSERT
    OR IGNORE INTO role_permissions (role, permission, created_at)
SELECT 'Admin',
    'viewGrowth',
    CURRENT_TIMESTAMP
WHERE EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role = 'Admin'
        LIMIT 1
    );
INSERT
    OR IGNORE INTO role_permissions (role, permission, created_at)
SELECT 'Admin',
    'viewClients',
    CURRENT_TIMESTAMP
WHERE EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role = 'Admin'
        LIMIT 1
    );
INSERT
    OR IGNORE INTO role_permissions (role, permission, created_at)
SELECT 'Admin',
    'viewMarketing',
    CURRENT_TIMESTAMP
WHERE EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role = 'Admin'
        LIMIT 1
    );
INSERT
    OR IGNORE INTO role_permissions (role, permission, created_at)
SELECT 'Admin',
    'viewMoneyTrash',
    CURRENT_TIMESTAMP
WHERE EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role = 'Admin'
        LIMIT 1
    );
-- Team Leader missing permissions
INSERT
    OR IGNORE INTO role_permissions (role, permission, created_at)
SELECT 'Team Leader',
    'viewGrowth',
    CURRENT_TIMESTAMP
WHERE EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role = 'Team Leader'
        LIMIT 1
    );
INSERT
    OR IGNORE INTO role_permissions (role, permission, created_at)
SELECT 'Team Leader',
    'viewClients',
    CURRENT_TIMESTAMP
WHERE EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role = 'Team Leader'
        LIMIT 1
    );
-- Manager permissions for System Infrastructure
INSERT
    OR IGNORE INTO role_permissions (role, permission, created_at)
SELECT 'Manager',
    'manageSystemInfrastructure',
    CURRENT_TIMESTAMP
WHERE EXISTS (
        SELECT 1
        FROM role_permissions
        WHERE role = 'Manager'
        LIMIT 1
    );