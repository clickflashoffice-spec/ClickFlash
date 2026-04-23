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
