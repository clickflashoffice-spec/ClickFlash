const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("./pb_data/master.db");

const sessionTypes = [
  { name: "Standard Session", photos: 10, price: 49.99 },
  { name: "Premium Session", photos: 25, price: 99.99 },
  { name: "Platinum Session", photos: 50, price: 149.99 },
];

const products = [
  { name: "4x6 Print", category: "Prints", price: 5.0 },
  { name: "8x10 Print", category: "Prints", price: 15.0 },
  { name: "Digital Full Album", category: "Digital", price: 199.0 },
  { name: "USB Flash Drive", category: "Add-ons", price: 25.0 },
];

db.serialize(() => {
  console.log("--- Seeding Session Types ---");
  const stmtSession = db.prepare(
    "INSERT OR IGNORE INTO session_types (id, name, numberOfPhotos, price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  sessionTypes.forEach((st) => {
    const id = "st_" + Math.random().toString(36).substr(2, 10);
    const now = new Date().toISOString();
    stmtSession.run(id, st.name, st.photos, st.price, now, now);
    console.log(`Seeded Session Type: ${st.name}`);
  });
  stmtSession.finalize();

  console.log("--- Seeding Products ---");
  const stmtProduct = db.prepare(
    "INSERT OR IGNORE INTO products (id, name, category, price, stock, isFeatured, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  products.forEach((p) => {
    const id = "prod_" + Math.random().toString(36).substr(2, 10);
    const now = new Date().toISOString();
    stmtProduct.run(id, p.name, p.category, p.price, 100, 1, now, now);
    console.log(`Seeded Product: ${p.name}`);
  });
  stmtProduct.finalize();
});

db.close(() => {
  console.log("Seeding completed.");
});
