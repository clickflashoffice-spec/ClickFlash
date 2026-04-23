/**
 * Payment API routes for Customer Gallery (Stripe)
 * Standard Express Router version
 */

const express = require("express");
const router = express.Router();
let stripe;
const getStripe = () => {
  if (!stripe && process.env.STRIPE_SECRET_KEY) {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
};
const { getDatabase } = require("../db");

// Route: POST /api/payments/create-intent
router.post("/create-intent", async (req, res) => {
  try {
    const { amount, currency = "usd", orderId, email } = req.body;

    if (!amount || !orderId) {
      return res.status(400).json({ error: "Missing amount or orderId" });
    }

    const db = getDatabase();
    const order = db
      .prepare("SELECT total, totalAmount, desk_id FROM orders WHERE id = ?")
      .get(orderId);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const dbAmount = order.total || order.totalAmount || 0;
    const expectedAmountCents = Math.round(dbAmount * 100);

    if (expectedAmountCents <= 0) {
      return res
        .status(400)
        .json({ error: "Order has zero or negative balance" });
    }

    const stripeClient = getStripe();
    if (!stripeClient) {
      console.error("STRIPE_SECRET_KEY is missing in .env");
      return res.status(500).json({ error: "Payment configuration error" });
    }

    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: expectedAmountCents,
      currency: currency,
      automatic_payment_methods: { enabled: true },
      metadata: {
        orderId: orderId,
        email: email || "unknown",
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      dpmCheckerLink: `https://dashboard.stripe.com/settings/payment_methods/dpm_beta?transaction_id=${paymentIntent.id}`,
    });
  } catch (e) {
    console.error("[Stripe] Create Intent Failed", e);
    res.status(500).json({ error: e.message || "Payment processing failed" });
  }
});

module.exports = router;
