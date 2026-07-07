const { execSync } = require("child_process");

try {
  console.log("Querying D1 for full orders schema...");
  const result = execSync(
    "npx wrangler d1 execute management-db --remote --command \"SELECT sql FROM sqlite_master WHERE name='orders'\" --json",
    { encoding: "utf8" },
  );
  const data = JSON.parse(result);
  if (data && data[0] && data[0].results && data[0].results[0]) {
    console.log("CREATE TABLE SQL:");
    console.log(data[0].results[0].sql);
  } else {
    console.log("No schema found for table: orders");
  }
} catch (e) {
  console.log("Command failed!");
  console.log("Error output (STDERR):", e.stderr);
}
