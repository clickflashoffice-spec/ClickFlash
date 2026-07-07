const { execSync } = require("child_process");

try {
  console.log('Auditing sqlite_master for "access_pin"...');
  const result = execSync(
    "npx wrangler d1 execute management-db --remote --command \"SELECT type, name FROM sqlite_master WHERE name LIKE '%access_pin%' OR name LIKE '%magic_link%'\" --json",
    { encoding: "utf8" },
  );
  const data = JSON.parse(result);
  if (data && data[0] && data[0].results && data[0].results.length > 0) {
    console.log(
      "Found objects with conflicting names:",
      JSON.stringify(data[0].results, null, 2),
    );
  } else {
    console.log("No conflicting names found in sqlite_master.");
  }
} catch (e) {
  console.log("Command failed!");
}
