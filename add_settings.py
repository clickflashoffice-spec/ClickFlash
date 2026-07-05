import sqlite3
conn = sqlite3.connect('apps/touch/pb_data/touch.db')
cur = conn.cursor()
cur.execute("INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES ('kioskId', 'test-kiosk-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
cur.execute("INSERT OR REPLACE INTO settings (key, value, created_at, updated_at) VALUES ('signingSecret', 'test-secret-key-12345', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)")
conn.commit()
print('Settings added')
