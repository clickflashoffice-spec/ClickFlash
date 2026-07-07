const { execSync } = require("child_process");

try {
  console.log("Running ALTER TABLE for access_pin...");
  const result = execSync(
    'npx wrangler d1 execute management-db --remote --command "ALTER TABLE orders ADD COLUMN access_pin TEXT"',
    { encoding: "utf8" },
  );
  console.log("STDOUT:", result);
} catch (e) {
  console.log("Command failed!");
  console.log("Status code:", e.status);
  console.log("Error output (STDERR):", e.stderr);
  console.log("Standard output (STDOUT):", e.stdout);
}
