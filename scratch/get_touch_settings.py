import sqlite3

conn = sqlite3.connect('apps/touch/pb_data/touch.db')
cur = conn.cursor()
try:
    cur.execute("SELECT key, value FROM settings WHERE key IN ('kioskId', 'signingSecret')")
    print(cur.fetchall())
finally:
    conn.close()
