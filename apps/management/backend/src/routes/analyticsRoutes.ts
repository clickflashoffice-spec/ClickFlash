const express = require("express");
const router = express.Router();
const analyticsService = require("../services/analyticsService");

// Middleware to validate date range or set defaults (last 30 days)
const validateDateRange = (req, res, next) => {
  try {
    let { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30);

      endDate = end.toISOString().split("T")[0];
      startDate = start.toISOString().split("T")[0];
    }

    // Basic manual regex validation to avoid Zod v4 ESM trigger
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      throw new Error("Invalid format");
    }

    req.query.startDate = startDate;
    req.query.endDate = endDate;
    next();
  } catch (error) {
    res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
  }
};

// GET /api/analytics/dashboard
router.get("/dashboard", validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const stats = analyticsService.getDashboardStats(startDate, endDate);
    const trend = analyticsService.getRevenueTrend(startDate, endDate);

    res.json({ stats, trend });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Failed to fetch dashboard stats" });
  }
});

// GET /api/analytics/daily-intelligence
router.get("/daily-intelligence", validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate, deskId } = req.query;
    const data = analyticsService.getDailyIntelligence(startDate, endDate, deskId);
    res.json(data);
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Failed to fetch daily intelligence reports" });
  }
});

// GET /api/analytics/top-albums
router.get("/top-albums", validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const limit = parseInt(req.query.limit) || 5;
    const albums = analyticsService.getTopAlbums(startDate, endDate, limit);
    res.json(albums);
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Failed to fetch top albums" });
  }
});

// GET /api/analytics/top-photographers
router.get("/top-photographers", validateDateRange, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const photographers = analyticsService.getTopPhotographers(
      startDate,
      endDate,
    );
    res.json(photographers);
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Failed to fetch top photographers" });
  }
});

// POST /api/analytics/albums/:id/view
router.post("/albums/:id/view", async (req, res) => {
  try {
    const { id } = req.params;
    analyticsService.incrementAlbumView(id);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ error: "Failed to track view" });
  }
});

// POST /api/analytics/resort-ingest
router.post("/resort-ingest", async (req, res) => {
    const deskId = req.headers['x-desk-id'] || req.query.deskId || 'UNKNOWN';
    try {
        const result = await analyticsService.ingestResortData(deskId, req.body);
        res.json(result);
    } catch (error) {
        console.error("Resort Ingest Error:", error);
        res.status(500).json({ error: "Failed to ingest resort data" });
    }
});

module.exports = router;
