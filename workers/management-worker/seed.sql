-- Seed default admin user for Cloud Hub using bcrypt (Auth Law 01)
INSERT OR IGNORE INTO users (id, name, email, password, role, status, destinationId, desk_id, machine_id)
VALUES (
    1,
    'Alaeddine',
    'alaeddine@example.com',
    '$2b$12$Z4JSxO0atttcwntCgr1Un.TTafem0hctTK.ol7Klk2/7hATmvGxv6', -- DEFAULT_PASSWORD_PLACEHOLDER
    'Admin',
    'Active',
    'HQ',
    'HQ',
    'LOCAL_DEV'
);

-- Authorized Master Station (TN001)
INSERT OR IGNORE INTO users (id, name, email, password, role, status, destinationId, desk_id, machine_id)
VALUES (
    2,
    'Master Admin',
    'admin@test.clickflash.photo',
    '$2b$12$Z4JSxO0atttcwntCgr1Un.TTafem0hctTK.ol7Klk2/7hATmvGxv6', -- test_secure_password
    'Admin',
    'Active',
    'TN001',
    'TN001',
    '5cd0522f517ec17d7e06fcf5097565b6daafd159feb74f1b84bf6f0b68c0362e'
);