-- packages/database/schema/unified.sql
-- ClickFlash Unified Schema (generated during migration consolidation)
-- This is a STARTER template. Review and reconcile per-app differences before applying.

-- CPU/RAM Optimization Pragmas for 16GB Master Node
PRAGMA mmap_size = 2147483648; -- 2GB max mmap for fast disk I/O
PRAGMA cache_size = -200000; -- 200MB cache limit to prevent starving Electron UI

-- Core shared tables
CREATE TABLE IF NOT EXISTS destinations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS session_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  duration_minutes INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  desk_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add app-specific tables below after schema reconciliation

CREATE TABLE IF NOT EXISTS kiosks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hardware_id TEXT UNIQUE NOT NULL,
  name TEXT,
  status TEXT DEFAULT 'offline',
  last_ping DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  destination_id INTEGER NOT NULL,
  session_type_id INTEGER NOT NULL,
  photographer_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(destination_id) REFERENCES destinations(id),
  FOREIGN KEY(session_type_id) REFERENCES session_types(id),
  FOREIGN KEY(photographer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  album_id INTEGER NOT NULL,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sync_status TEXT DEFAULT 'local',
  ai_score REAL,
  is_rejected BOOLEAN DEFAULT 0,
  burst_group TEXT,
  face_vector BLOB, -- sqlite-vec 128D embedding
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(album_id) REFERENCES albums(id)
);

-- sqlite-vec Virtual Table for blazing-fast 128D local facial search
CREATE VIRTUAL TABLE IF NOT EXISTS vec_faces USING vec0(
  photo_id INTEGER PRIMARY KEY,
  face_embedding float[128]
);

CREATE TABLE IF NOT EXISTS kiosk_transfer_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  photo_id INTEGER NOT NULL,
  kiosk_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(photo_id) REFERENCES photos(id),
  FOREIGN KEY(kiosk_id) REFERENCES kiosks(id)
);
