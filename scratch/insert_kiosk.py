import sqlite3
import datetime

conn = sqlite3.connect('apps/master/pb_data/master.db')
cur = conn.cursor()

try:
    now = datetime.datetime.now().isoformat()
    cur.execute("INSERT OR REPLACE INTO kiosks (id, name, status, signingSecret, created_at, updated_at) VALUES ('test-kiosk-1', 'Test Kiosk 1', 'Connected', 'test-secret-key-12345', ?, ?)", (now, now))
    conn.commit()
    print("Kiosk test-kiosk-1 inserted!")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
