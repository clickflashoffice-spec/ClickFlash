import sqlite3
conn = sqlite3.connect('apps/touch/pb_data/touch.db')
cur = conn.cursor()
cur.execute("PRAGMA table_info(orders)")
print(cur.fetchall())
