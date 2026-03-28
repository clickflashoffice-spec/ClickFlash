const { execSync } = require("child_process");

try {
  console.log("Querying D1 for columns via JSON output...");
  const result = execSync(
    'npx wrangler d1 execute management-db --remote --command "SELECT * FROM orders LIMIT 1" --json',
    { encoding: "utf8" },
  );
  const data = JSON.parse(result);
  if (data && data[0] && data[0].results && data[0].results[0]) {
    console.log(
      "Columns found in result set:",
      Object.keys(data[0].results[0]).join(", "),
    );
  } else {
    console.log("No rows returned to determine columns.");
  }
} catch (e) {
  console.log("Command failed!");
  console.log("Error output (STDERR):", e.stderr);
}
