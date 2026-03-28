const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("./pb_data/master.db");

const hash = "$2a$10$wOItZJINx1hX4TGE.Z0yE.6D29l3M/oQv1E.h95nC9L.zQ1Y/W2fC"; // Password: 'DEFAULT_PASSWORD_PLACEHOLDER!'

db.run(
  `INSERT OR IGNORE INTO users (id, name, email, password, role) VALUES ('123456789012345', 'Admin User', 'admin@starmaster.photo', ?, 'admin');`,
  [hash],
  (err) => {
    if (err) {
      console.error("User creation failed:", err);
    } else {
      console.log("Admin user created with password 'DEFAULT_PASSWORD_PLACEHOLDER!'");
    }

    // In current PB versions, 'admin' access might need an actual admin record in the _admins table
    db.run(
      "INSERT OR IGNORE INTO _admins (id, email, passwordHash) VALUES ('admin_1234567890', 'admin@starmaster.photo', ?);",
      [hash],
      (err2) => {
        if (err2) console.error("Admin creation failed:", err2);
        else console.log("Superuser created.");

        db.close();
      },
    );
  },
);
