const db = require('better-sqlite3-multiple-ciphers')('./pb_data/data.db');
try {
  const rows = db.prepare('SELECT id, email, role FROM users').all();
  console.log('Plaintext Users:', rows);
} catch (e) {
  console.log('Plaintext error:', e.message);
}
