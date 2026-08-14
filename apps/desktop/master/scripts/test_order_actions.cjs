const {
  OrderValidationService,
} = require("./backend/services/OrderValidationService");
const { DatabaseManager } = require("./backend/database/db");
const { Logger } = require("./backend/utils/logger");
const path = require("path");

// Mock services that we don't need to actually run for this verification
class MockEmailService {
  async sendTransactional(data) {
    console.log("[MOCK EMAIL] To:", data.to, "Subject:", data.subject);
    console.log(
      "[MOCK EMAIL] PIN in HTML:",
      data.html.includes("Access PIN") ? "YES" : "NO",
    );
    return { success: true };
  }
}

class MockHardwareService {
  async enqueuePrint(path) {
    console.log("[MOCK HARDWARE] Enqueued print:", path);
    return { success: true };
  }
}

class MockFulfillmentSlipService {
  async generateSlip(orderId, options) {
    console.log("[MOCK SLIP] Generated for:", orderId, "Options:", options);
    return path.join(__dirname, "temp", `slip_${orderId}.jpg`);
  }
}

async function testValidationActions() {
  const logger = new Logger();
  const dbPath = path.join(__dirname, "pb_data", "master.db");
  const db = new DatabaseManager(dbPath);

  // Check for a paid/test order
  const testOrder = db.get(
    "SELECT id FROM orders WHERE status = 'paid' LIMIT 1",
  );
  if (!testOrder) {
    console.error(
      "No test order found with status 'paid'. Run create_test_order.cjs first.",
    );
    return;
  }

  const orderId = testOrder.id;
  console.log("Testing Post-Validation Actions for Order:", orderId);

  const emailService = new MockEmailService();
  const hardwareService = new MockHardwareService();
  const fulfillmentSlipService = new MockFulfillmentSlipService();
  const jwtSecret = "test_secret";

  const service = new OrderValidationService(
    db,
    logger,
    emailService,
    hardwareService,
    fulfillmentSlipService,
    jwtSecret,
  );

  await service.handlePostValidationActions(orderId);

  // Verify DB update
  const updatedOrder = db.get(
    "SELECT access_pin, magic_link_token FROM orders WHERE id = ?",
    [orderId],
  );
  console.log("DB Verification:", updatedOrder);
}

testValidationActions().catch(console.error);
