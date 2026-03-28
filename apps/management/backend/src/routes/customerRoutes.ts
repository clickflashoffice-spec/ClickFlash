/**
 * Customer-facing API routes for Management App
 * Standard Express Router version
 */

const express = require("express");
const router = express.Router();
const { getDatabase } = require("../db");

// Route: GET /api/orders/by-credentials?orderId=X&email=Y
router.get("/by-credentials", (req, res) => {
  try {
    const { orderId, email } = req.query;

    if (!orderId || !email) {
      return res.status(400).json({ error: "Missing orderId or email" });
    }

    const db = getDatabase();
    const order = db
      .prepare("SELECT * FROM orders WHERE id = ? AND email = ?")
      .get(orderId.trim(), email.trim().toLowerCase());

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const items = db
      .prepare("SELECT * FROM order_items WHERE orderId = ?")
      .all(order.id);

    res.json({
      ...order,
      items: items || [],
    });
  } catch (e) {
    console.error("[Customer API] Order lookup failed", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route: GET /api/orders/by-room?roomNumber=123&siteId=S1
router.get("/by-room", (req, res) => {
  try {
    const { roomNumber, siteId } = req.query;

    if (!roomNumber || !siteId) {
      return res.status(400).json({ error: "Missing roomNumber or siteId" });
    }

    const db = getDatabase();
    const order = db
      .prepare("SELECT * FROM orders WHERE roomNumber = ? AND desk_id = ?")
      .get(roomNumber.trim(), siteId.trim());

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const items = db
      .prepare("SELECT * FROM order_items WHERE orderId = ?")
      .all(order.id);

    res.json({
      ...order,
      items: items || [],
    });
  } catch (e) {
    console.error("[Customer API] Room lookup failed", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route: POST /api/bookings
router.post("/bookings", async (req, res) => {
  try {
    const data = req.body;
    const crypto = require("crypto");

    if (!data.name || !data.email || !data.date) {
      return res
        .status(400)
        .json({ error: "Missing required fields (name, email, date)" });
    }

    const bookingId = `BK-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;
    const db = getDatabase();

    db.prepare(
      `
            INSERT INTO bookings (
                id, clientName, clientEmail, clientPhone, 
                bookingDate, bookingTime, location, message, 
                service_type, status, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
    ).run(
      bookingId,
      data.name,
      data.email,
      data.phone || null,
      data.date,
      data.time || null,
      data.location || null,
      data.message || null,
      data.sessionType || null,
      "Pending",
      new Date().toISOString(),
      new Date().toISOString(),
    );

    res.status(201).json({
      success: true,
      message: "Booking request received successfully",
      bookingId,
    });
  } catch (e) {
    console.error("[Customer API] Booking submission failed", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
