with open('packages/database/src/schema.ts', 'r') as f:
    content = f.read()

content = content.replace("import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';", "import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';")

# Find where 'export const photos' ends
photos_str = "export const photos = sqliteTable('photos', {"
if photos_str in content:
    idx = content.find("});", content.find(photos_str))
    content = content[:idx] + "}, (table) => ({ albumIdx: index('photos_album_id_idx').on(table.albumId) }));" + content[idx+3:]

faces_str = "export const faces = sqliteTable('faces', {"
if faces_str in content:
    idx = content.find("});", content.find(faces_str))
    content = content[:idx] + "}, (table) => ({ photoIdx: index('faces_photo_id_idx').on(table.photoId) }));" + content[idx+3:]

kiosk_str = "export const kioskTransferQueue = sqliteTable('kiosk_transfer_queue', {"
if kiosk_str in content:
    idx = content.find("});", content.find(kiosk_str))
    content = content[:idx] + "}, (table) => ({ statusIdx: index('kiosk_queue_status_idx').on(table.status) }));" + content[idx+3:]

with open('packages/database/src/schema.ts', 'w') as f:
    f.write(content)
print("Patched schema.ts")
