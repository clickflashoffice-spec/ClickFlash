#!/usr/bin/env node
/**
 * MoneyTrash Cloudflare Provisioning Script
 *
 * This script automates the creation of:
 * - D1 Database (moneytrash-db)
 * - KV Namespace (UPLOAD_SESSIONS)
 *
 * Then updates wrangler.toml with the actual IDs.
 *
 * Usage:
 *   node provision.js [--dry-run] [--env production]
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const ENVIRONMENT = process.env.NODE_ENV || "production";

const WRANGLER_TOML_PATH = path.join(__dirname, "wrangler.toml");
const SCHEMA_PATH = path.join(__dirname, "schema", "schema.sql");

const isDryRun = process.argv.includes("--dry-run");
const isVerbose = process.argv.includes("--verbose");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  blue: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.blue}▶ ${step}${colors.reset} ${message}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, "green");
}

function logError(message) {
  log(`✗ ${message}`, "red");
}

function logWarning(message) {
  log(`⚠ ${message}`, "yellow");
}

function runCommand(command, options = {}) {
  if (isVerbose) {
    log(`  Running: ${command}`, "yellow");
  }
  try {
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: isVerbose ? "inherit" : "pipe",
      ...options,
    });
    return output.trim();
  } catch (error) {
    if (isVerbose) {
      logError(`Command failed: ${command}`);
      logError(error.message);
    }
    throw error;
  }
}

function getWranglerVersion() {
  try {
    return runCommand("npx wrangler --version").replace("wrangler ", "");
  } catch {
    return "unknown";
  }
}

async function checkWranglerAuth() {
  logStep("AUTH", "Checking Wrangler authentication...");
  try {
    runCommand("npx wrangler whoami");
    logSuccess("Authenticated with Cloudflare");
    return true;
  } catch {
    logError("Not authenticated with Cloudflare");
    log("Please run: npx wrangler login", "blue");
    return false;
  }
}

async function createD1Database() {
  logStep("D1", "Creating D1 database (moneytrash-db)...");

  // Check if database already exists
  try {
    const listOutput = runCommand("npx wrangler d1 list --json");
    const databases = JSON.parse(listOutput);
    const existing = databases.find((db) => db.name === "moneytrash-db");

    if (existing) {
      logWarning(
        `Database "moneytrash-db" already exists with ID: ${existing.uuid}`,
      );
      return existing.uuid;
    }
  } catch {
    // Database list might fail if none exist
  }

  if (isDryRun) {
    log("  [DRY RUN] Would create D1 database", "yellow");
    return "x12345678-dry-run-xxxx-xxxx-xxxxxxxxxxxx";
  }

  try {
    const output = runCommand("npx wrangler d1 create moneytrash-db");
    // Parse UUID from output - format: "Created database 'moneytrash-db' (UUID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)"
    const match = output.match(/UUID:\s*([a-f0-9-]+)/i);
    if (match) {
      const dbId = match[1];
      logSuccess(`Created D1 database: ${dbId}`);
      return dbId;
    }
    throw new Error("Could not parse database ID from output");
  } catch (error) {
    logError("Failed to create D1 database");
    throw error;
  }
}

async function createKVNamespace() {
  logStep("KV", "Creating KV namespace (UPLOAD_SESSIONS)...");

  // Check if namespace already exists
  try {
    const listOutput = runCommand("npx wrangler kv:namespace list --json");
    const namespaces = JSON.parse(listOutput);
    const existing = namespaces.find((ns) => ns.title === "UPLOAD_SESSIONS");

    if (existing) {
      logWarning(
        `KV namespace "UPLOAD_SESSIONS" already exists with ID: ${existing.id}`,
      );
      return existing.id;
    }
  } catch {
    // Namespace list might fail if none exist
  }

  if (isDryRun) {
    log("  [DRY RUN] Would create KV namespace", "yellow");
    return "x12345678dryrunxxxxxxx";
  }

  try {
    const output = runCommand(
      "npx wrangler kv:namespace create UPLOAD_SESSIONS",
    );
    // Parse ID from output
    const match = output.match(/ID:\s*([a-z0-9]+)/i);
    if (match) {
      const kvId = match[1];
      logSuccess(`Created KV namespace: ${kvId}`);
      return kvId;
    }
    throw new Error("Could not parse KV namespace ID from output");
  } catch (error) {
    logError("Failed to create KV namespace");
    throw error;
  }
}

async function executeSchema(databaseId) {
  logStep("SCHEMA", "Executing database schema...");

  if (isDryRun) {
    log("  [DRY RUN] Would execute schema", "yellow");
    return;
  }

  try {
    runCommand(
      `npx wrangler d1 execute moneytrash-db --database-id=${databaseId} --file=${SCHEMA_PATH} --yes`,
    );
    logSuccess("Schema executed successfully");
  } catch (error) {
    logError("Failed to execute schema");
    throw error;
  }
}

function updateWranglerToml(databaseId, kvId) {
  logStep("CONFIG", "Updating wrangler.toml with new IDs...");

  if (isDryRun) {
    log("  [DRY RUN] Would update wrangler.toml", "yellow");
    return;
  }

  let content = fs.readFileSync(WRANGLER_TOML_PATH, "utf-8");

  // Replace placeholder IDs
  content = content.replace(
    /database_id\s*=\s*"your-d1-database-id"/,
    `database_id = "${databaseId}"`,
  );

  content = content.replace(
    /id\s*=\s*"your-kv-namespace-id"/,
    `id = "${kvId}"`,
  );

  fs.writeFileSync(WRANGLER_TOML_PATH, content);
  logSuccess("Updated wrangler.toml");
}

function generateSecrets() {
  logStep("SECRETS", "Instructions for setting secrets...");

  console.log(`
${colors.bold}Required Secrets:${colors.reset}

Run these commands to set required secrets:

${colors.green}# JWT Secret (generate a secure random string)${colors.reset}
echo "your-super-secret-jwt-key-min-32-characters" | npx wrangler secret put JWT_SECRET

${colors.green}# Stripe Secret Key (if using payments)${colors.reset}
npx wrangler secret put STRIPE_SECRET_KEY

${colors.green}# Webhook Secret${colors.reset}
npx wrangler secret put WEBHOOK_SECRET
`);
}

async function deployWorker() {
  logStep("DEPLOY", "Deploying MoneyTrash Worker...");

  if (isDryRun) {
    log("  [DRY RUN] Would deploy worker", "yellow");
    return;
  }

  try {
    runCommand("npx wrangler deploy");
    logSuccess("Worker deployed successfully");
  } catch (error) {
    logError("Failed to deploy worker");
    throw error;
  }
}

async function verifyDeployment() {
  logStep("VERIFY", "Verifying deployment...");

  try {
    const health = runCommand(
      'curl -s https://moneytrash-api.<your-subdomain>.workers.dev/api/health 2>/dev/null || echo "DEPLOYMENT_URL_NOT_CONFIGURED"',
    );

    if (health.includes('"status":"ok"')) {
      logSuccess("Health check passed");
    } else {
      logWarning(
        "Could not verify health check (might need correct subdomain)",
      );
      log(`  Response: ${health.substring(0, 100)}...`);
    }
  } catch {
    logWarning("Could not verify deployment - ensure subdomain is configured");
  }
}

async function main() {
  console.log(`
${colors.bold}╔════════════════════════════════════════════════════════════════╗
║     MoneyTrash Cloudflare Provisioning Script                ║
║     Version: 4.2.0                                          ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
  `);

  if (isDryRun) {
    logWarning("DRY RUN MODE - No actual changes will be made\n");
  }

  // Check prerequisites
  log(`Wrangler version: ${getWranglerVersion()}`);

  const isAuthenticated = await checkWranglerAuth();
  if (!isAuthenticated) {
    process.exit(1);
  }

  let databaseId;
  let kvId;

  try {
    // Create D1 database
    databaseId = await createD1Database();

    // Create KV namespace
    kvId = await createKVNamespace();

    // Execute schema
    await executeSchema(databaseId);

    // Update wrangler.toml
    updateWranglerToml(databaseId, kvId);

    // Show secrets instructions
    generateSecrets();

    // Deploy worker
    await deployWorker();

    // Verify
    await verifyDeployment();

    console.log(`
${colors.green}╔════════════════════════════════════════════════════════════════╗
║     Provisioning Complete!                                 ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}

Next steps:
1. Set secrets: npx wrangler secret put JWT_SECRET
2. Test the API: curl https://moneytrash-api.<your-subdomain>.workers.dev/api/health
3. Configure your MoneyTrash app to use the new endpoint
    `);
  } catch (error) {
    console.log(`
${colors.red}╔════════════════════════════════════════════════════════════════╗
║     Provisioning Failed!                                  ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}
    `);
    console.error(error);
    process.exit(1);
  }
}

main();
