#!/usr/bin/env node

/**
 * Master Station Cloud Setup Wizard
 *
 * This script automates the configuration of a new Master station
 * to connect with Management Hub and Gallery cloud services.
 *
 * Usage: node cloud-setup-wizard.js [--auto] [--desk-id=ID]
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const crypto = require("crypto");
const https = require("https");

const CONFIG_FILE = path.join(process.cwd(), "cloud-config.json");
const ENV_FILE = path.join(process.cwd(), ".env.cloud");

// Cloudflare API Configuration
const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4";

class CloudSetupWizard {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    this.progress = 0;
    this.isAuto = process.argv.includes("--auto");
    this.args = this.parseArgs();

    this.config = {
      deskId: this.args["desk-id"] || "",
      deskName: this.args["desk-name"] || "",
      location: this.args["location"] || "",
      managementHub: {
        url: this.args["hub-url"] || "",
        email: this.args["email"] || "",
        password: "", // Password still required or should be in env
        apiToken: "",
      },
      gallery: {
        url: this.args["gallery-url"] || "",
        enabled: true,
      },
      cloudflare: {
        accountId: "",
        apiToken: "",
        zoneId: "",
      },
      features: {
        moneyTrash: true,
        cloudSync: true,
        retentionEnabled: true,
      },
    };
  }

  parseArgs() {
    const args = {};
    process.argv.slice(2).forEach((arg) => {
      if (arg.startsWith("--")) {
        const [key, value] = arg.slice(2).split("=");
        args[key] = value || true;
      }
    });
    return args;
  }

  async ask(question, defaultValue = "", configPath = "") {
    if (this.isAuto) {
      if (configPath) {
        // Support nested paths like 'managementHub.url'
        const parts = configPath.split(".");
        let obj = this.config;
        for (let i = 0; i < parts.length; i++) {
          if (obj[parts[i]] !== undefined && obj[parts[i]] !== "") {
            if (i === parts.length - 1) return obj[parts[i]];
            obj = obj[parts[i]];
          } else {
            break;
          }
        }
      }
      if (defaultValue) return defaultValue;
    }

    return new Promise((resolve) => {
      this.rl.question(
        `${question} ${defaultValue ? `(${defaultValue}) ` : ""}`,
        (answer) => {
          resolve(answer.trim() || defaultValue);
        },
      );
    });
  }

  async askPassword(question) {
    if (this.isAuto) {
      if (process.env.CLOUD_PASSWORD) return process.env.CLOUD_PASSWORD;
      if (this.config.managementHub.password)
        return this.config.managementHub.password;
    }

    return new Promise((resolve) => {
      const stdin = process.stdin;
      const stdout = process.stdout;

      stdout.write(`${question} `);

      const canRaw = typeof stdin.setRawMode === "function";
      if (canRaw) {
        stdin.setRawMode(true);
      }

      stdin.resume();
      stdin.setEncoding("utf8");

      let password = "";
      stdin.on("data", (ch) => {
        ch = ch + "";
        switch (ch) {
          case "\n":
          case "\r":
          case "\u0004":
            if (canRaw) stdin.setRawMode(false);
            stdin.pause();
            stdout.write("\n");
            resolve(password);
            break;
          case "\u0003":
            process.exit(1);
            break;
          default:
            password += ch;
            stdout.write("*");
            break;
        }
      });
    });
  }

  async run() {
    console.log("\n");
    console.log(
      "╔════════════════════════════════════════════════════════════╗",
    );
    console.log(
      "║         CLICKFLASH MASTER - CLOUD SETUP WIZARD             ║",
    );
    console.log(
      "║" +
        (this.isAuto ? " [AUTOMATED MODE] ".padStart(42) : " ".repeat(42)) +
        "         ║",
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝",
    );
    console.log("\n");

    try {
      // Step 1: Generate Desk ID
      await this.configureDeskIdentity();

      // Step 2: Configure Management Hub
      await this.configureManagementHub();

      // Step 3: Configure Gallery
      await this.configureGallery();

      // Step 4: Configure Features
      await this.configureFeatures();

      // Step 5: Test Connections
      if (!this.args["skip-test"]) {
        await this.testConnections();
      }

      // Step 6: Save Configuration
      await this.saveConfiguration();

      // Step 7: Initialize Database
      await this.initializeDatabase();

      console.log("\n✅ Setup completed successfully!");
      console.log(
        `\nYour Master station "${this.config.deskName}" (${this.config.deskId}) is ready.`,
      );

      if (!this.isAuto) {
        console.log("\nNext steps:");
        console.log("  1. Restart the Master application");
        console.log("  2. Log in with your admin credentials");
        console.log("  3. Verify cloud sync in Settings > Cloud Status");
      }
    } catch (error) {
      console.error("\n❌ Setup failed:", error.message);
      process.exit(1);
    } finally {
      this.rl.close();
    }
  }

  async configureDeskIdentity() {
    console.log("📍 STEP 1: Desk Identity");
    console.log(
      "────────────────────────────────────────────────────────────\n",
    );

    const autoDeskId = `MASTER_${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    this.config.deskId = await this.ask(
      `Enter Desk ID (or press Enter for auto-generated: ${autoDeskId}):`,
      autoDeskId,
      "deskId",
    );

    this.config.deskName = await this.ask(
      'Enter Desk Name (e.g., "Resort Maldives - Reception"):',
      `Master Station ${this.config.deskId}`,
      "deskName",
    );

    this.config.location = await this.ask(
      'Enter Location (e.g., "Maldives, North Atoll"):',
      "Unknown Location",
      "location",
    );

    console.log(`\n✓ Desk configured: ${this.config.deskId}`);
    console.log("");
  }

  async configureManagementHub() {
    console.log("☁️  STEP 2: Management Hub Configuration");
    console.log(
      "────────────────────────────────────────────────────────────\n",
    );

    const hasExisting = this.config.managementHub.url
      ? "yes"
      : await this.ask("Do you have an existing Management Hub URL? (yes/no):");

    if (hasExisting.toLowerCase() === "yes") {
      this.config.managementHub.url = await this.ask(
        "Enter Management Hub URL (e.g., https://hub.yourdomain.com):",
        "https://management.clickflash.app",
        "managementHub.url",
      );
    } else {
      console.log("\n🔄 Auto-detecting Management Hub...");
      this.config.managementHub.url = "https://management.clickflash.app";
      console.log(`   Using default: ${this.config.managementHub.url}`);
    }

    this.config.managementHub.email = await this.ask(
      "Enter Management Hub Admin Email:",
      "",
      "managementHub.email",
    );

    this.config.managementHub.password = await this.askPassword(
      "Enter Management Hub Admin Password:",
    );

    console.log("\n✓ Management Hub configured");
    console.log("");
  }

  async configureGallery() {
    console.log("🖼️  STEP 3: Gallery Configuration");
    console.log(
      "────────────────────────────────────────────────────────────\n",
    );

    const enableGallery = await this.ask(
      "Enable Customer Gallery? (yes/no, default: yes):",
      "yes",
    );

    this.config.gallery.enabled = enableGallery.toLowerCase() !== "no";

    if (this.config.gallery.enabled) {
      const hasExisting = this.config.gallery.url
        ? "yes"
        : await this.ask("Do you have an existing Gallery URL? (yes/no):");

      if (hasExisting.toLowerCase() === "yes") {
        this.config.gallery.url = await this.ask(
          "Enter Gallery URL (e.g., https://gallery.yourdomain.com):",
          "",
          "gallery.url",
        );
      } else {
        this.config.gallery.url = this.config.managementHub.url.replace(
          "management",
          "gallery",
        );
        console.log(`   Using: ${this.config.gallery.url}`);
      }
    }

    console.log("\n✓ Gallery configured");
    console.log("");
  }

  async configureFeatures() {
    console.log("⚙️  STEP 4: Feature Configuration");
    console.log(
      "────────────────────────────────────────────────────────────\n",
    );

    const enableCloudSync = await this.ask(
      "Enable Cloud Sync? (yes/no, default: yes):",
      "yes",
      "features.cloudSync",
    );
    this.config.features.cloudSync =
      enableCloudSync === true ||
      enableCloudSync.toString().toLowerCase() !== "no";

    if (this.config.features.cloudSync) {
      const enableMoneyTrash = await this.ask(
        "Enable MoneyTrash (unsold photo monetization)? (yes/no, default: yes):",
        "yes",
        "features.moneyTrash",
      );
      this.config.features.moneyTrash =
        enableMoneyTrash === true ||
        enableMoneyTrash.toString().toLowerCase() !== "no";

      if (this.config.features.moneyTrash) {
        const retentionDays = await this.ask(
          "Retention period in days (default: 15):",
          "15",
          "features.retentionDays",
        );
        this.config.features.retentionDays = parseInt(retentionDays) || 15;
      }
    }

    console.log("\n✓ Features configured");
    console.log("");
  }

  async testConnections() {
    console.log("🧪 STEP 5: Testing Connections");
    console.log(
      "────────────────────────────────────────────────────────────\n",
    );

    // Test Management Hub
    console.log("Testing Management Hub connection...");
    try {
      const health = await this.testEndpoint(
        `${this.config.managementHub.url}/api/health`,
      );
      if (health) {
        console.log("  ✅ Management Hub: Connected");
      } else {
        console.log(
          "  ⚠️  Management Hub: Unreachable (will retry on startup)",
        );
      }
    } catch (e) {
      console.log("  ⚠️  Management Hub: Unreachable (will retry on startup)");
    }

    // Test Gallery if enabled
    if (this.config.gallery.enabled) {
      console.log("Testing Gallery connection...");
      try {
        const health = await this.testEndpoint(
          `${this.config.gallery.url}/api/health`,
        );
        if (health) {
          console.log("  ✅ Gallery: Connected");
        } else {
          console.log("  ⚠️  Gallery: Unreachable (will retry on startup)");
        }
      } catch (e) {
        console.log("  ⚠️  Gallery: Unreachable (will retry on startup)");
      }
    }

    console.log("");
  }

  async saveConfiguration() {
    console.log("💾 STEP 6: Saving Configuration");
    console.log(
      "────────────────────────────────────────────────────────────\n",
    );

    // Save to JSON config
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    console.log(`  ✓ Saved: ${CONFIG_FILE}`);

    // Generate .env.cloud
    const envContent = this.generateEnvContent();
    fs.writeFileSync(ENV_FILE, envContent);
    console.log(`  ✓ Saved: ${ENV_FILE}`);

    // Update main .env if exists
    const mainEnvPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(mainEnvPath)) {
      let mainEnv = fs.readFileSync(mainEnvPath, "utf8");

      // Remove old cloud config lines
      mainEnv = mainEnv.replace(/# Cloud Config[\s\S]*?(?=#|\n\n|$)/, "");

      // Append new cloud config
      mainEnv += `\n# Cloud Config (Auto-generated by setup-wizard)\n`;
      mainEnv += `DESK_ID=${this.config.deskId}\n`;
      mainEnv += `CLOUD_API_URL=${this.config.managementHub.url}\n`;
      mainEnv += `CLOUD_EMAIL=${this.config.managementHub.email}\n`;
      mainEnv += `CLOUD_PASSWORD=${this.config.managementHub.password}\n`;
      mainEnv += `GALLERY_URL=${this.config.gallery.url || ""}\n`;

      fs.writeFileSync(mainEnvPath, mainEnv);
      console.log(`  ✓ Updated: ${mainEnvPath}`);
    }

    console.log("");
  }

  async initializeDatabase() {
    console.log("🗄️  STEP 7: Initializing Database");
    console.log(
      "────────────────────────────────────────────────────────────\n",
    );

    // This will be handled by the application's migration system
    // We just need to ensure the cloud sync columns exist
    console.log(
      "  ℹ️  Database migrations will run on next application startup",
    );
    console.log("  ℹ️  Cloud sync tables will be created automatically");

    // Create a marker file to indicate setup is complete
    const markerFile = path.join(process.cwd(), ".cloud-setup-complete");
    fs.writeFileSync(
      markerFile,
      JSON.stringify(
        {
          deskId: this.config.deskId,
          setupDate: new Date().toISOString(),
          version: "1.0.0",
        },
        null,
        2,
      ),
    );

    console.log("");
  }

  generateEnvContent() {
    return `# ClickFlash Master - Cloud Configuration
# Generated: ${new Date().toISOString()}
# Desk ID: ${this.config.deskId}

# Desk Identity
DESK_ID=${this.config.deskId}
DESK_NAME=${this.config.deskName}
DESK_LOCATION=${this.config.location}

# Management Hub
CLOUD_API_URL=${this.config.managementHub.url}
CLOUD_EMAIL=${this.config.managementHub.email}
CLOUD_PASSWORD=${this.config.managementHub.password}

# Gallery
GALLERY_URL=${this.config.gallery.url || ""}
GALLERY_ENABLED=${this.config.gallery.enabled}

# Features
CLOUD_SYNC_ENABLED=${this.config.features.cloudSync}
MONEYTRASH_ENABLED=${this.config.features.moneyTrash}
RETENTION_DAYS=${this.config.features.retentionDays || 15}
`;
  }

  async testEndpoint(url) {
    return new Promise((resolve) => {
      const req = https.get(url, { timeout: 5000 }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on("error", () => resolve(false));
      req.on("timeout", () => {
        req.destroy();
        resolve(false);
      });
    });
  }
}

// Run wizard if called directly
if (require.main === module) {
  const wizard = new CloudSetupWizard();
  wizard.run();
}

module.exports = { CloudSetupWizard };
