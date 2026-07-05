-- Add Touch Integration Settings
-- These settings configure the local folders for Master-Touch integration

-- Touch Upload Folder (where Touch receives albums from Master)
INSERT OR REPLACE INTO settings (key, value) 
VALUES ('touchUploadFolder', '{"path":"C:\\TouchData\\uploads"}');

-- Touch Orders Folder (where Touch exports orders for Master to import)
INSERT OR REPLACE INTO settings (key, value) 
VALUES ('touchOrdersFolder', '{"path":"C:\\TouchData\\orders"}');

-- Note: These are local paths on the Touch PC
-- Master will access these via network shares:
-- - \\TOUCH-PC\TouchUploads (for albums)
-- - \\TOUCH-PC\TouchOrders (for orders)

INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s3', 'kioskId', 'test-kiosk-1');
INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s4', 'signingSecret', 'test-secret');
INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s5', 'masterApiUrl', 'http://127.0.0.1:8090');
INSERT OR REPLACE INTO settings (id, key, value) VALUES ('s6', 'siteId', 'TN-E2E-TEST');
