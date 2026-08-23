import express, { Request, Response, Router } from "express";
import { DatabaseManager } from "../database/db";

export function createConcessionRouter(dbManager: DatabaseManager): Router {
    const router = express.Router();
    const db = dbManager.getDb();

    // =========================================================================
    // PILLAR 1: GEAR ASSETS & CHECKOUTS
    // =========================================================================

    router.get("/gear", (req: Request, res: Response) => {
        try {
            const venueId = (req.query.venueId as string) || "venue-main";
            const rows = db.prepare("SELECT * FROM gear_assets WHERE venue_id = ? ORDER BY asset_tag ASC").all(venueId);
            res.json({ success: true, data: rows });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post("/gear/checkout", (req: Request, res: Response) => {
        try {
            const { gearId, userId, userName, checkoutCondition } = req.body;
            const checkoutId = `co-${Date.now()}`;
            const checkoutTime = new Date().toISOString();

            db.prepare(`
                INSERT INTO gear_checkouts (id, gear_id, user_id, user_name, checkout_time, checkout_condition)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(checkoutId, gearId, userId, userName, checkoutTime, checkoutCondition || 5);

            db.prepare(`
                UPDATE gear_assets
                SET status = 'CHECKED_OUT', assigned_to_user_id = ?, assigned_to_name = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(userId, userName, gearId);

            res.json({ success: true, checkoutId, checkoutTime });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    });

    router.post("/gear/checkin", (req: Request, res: Response) => {
        try {
            const { gearId, returnCondition, notes } = req.body;
            const returnTime = new Date().toISOString();

            db.prepare(`
                UPDATE gear_checkouts
                SET return_time = ?, return_condition = ?, notes = ?
                WHERE gear_id = ? AND return_time IS NULL
            `).run(returnTime, returnCondition || 5, notes || null, gearId);

            db.prepare(`
                UPDATE gear_assets
                SET status = 'AVAILABLE', assigned_to_user_id = NULL, assigned_to_name = NULL, condition_rating = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(returnCondition || 5, gearId);

            res.json({ success: true, returnTime });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    });

    // =========================================================================
    // PILLAR 1: PRINT SPOOLER QUEUE
    // =========================================================================

    router.get("/print-queue", (req: Request, res: Response) => {
        try {
            const venueId = (req.query.venueId as string) || "venue-main";
            const rows = db.prepare("SELECT * FROM print_jobs WHERE venue_id = ? ORDER BY priority DESC, created_at ASC").all(venueId);
            res.json({ success: true, data: rows });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post("/print-queue", (req: Request, res: Response) => {
        try {
            const { venueId, printerName, orderId, photoUrl, paperSize, copies, priority, guestName } = req.body;
            const id = `print-${Date.now()}`;
            const submittedAt = new Date().toISOString();

            db.prepare(`
                INSERT INTO print_jobs (id, venue_id, printer_name, order_id, photo_url, paper_size, copies, priority, guest_name, submitted_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED')
            `).run(id, venueId || "venue-main", printerName || "DNP DS620 - Station 1", orderId, photoUrl, paperSize || "6x8", copies || 1, priority || 5, guestName || null, submittedAt);

            res.json({ success: true, printJobId: id });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    });

    // =========================================================================
    // PILLAR 2: SHIFTS & 90-MIN ZONE ROTATIONS
    // =========================================================================

    router.get("/shifts", (req: Request, res: Response) => {
        try {
            const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
            const rows = db.prepare("SELECT * FROM shift_schedules WHERE date = ?").all(date);
            res.json({ success: true, data: rows });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post("/shifts/clock-in", (req: Request, res: Response) => {
        try {
            const { shiftId } = req.body;
            const clockInTime = new Date().toTimeString().slice(0, 5);

            db.prepare(`
                UPDATE shift_schedules
                SET clock_in_time = ?, status = 'CLOCKED_IN', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(clockInTime, shiftId);

            res.json({ success: true, clockInTime });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    });

    // =========================================================================
    // PILLAR 3: SLEEPING MONEY & CASH RECONCILIATION
    // =========================================================================

    router.get("/sleeping-money", (req: Request, res: Response) => {
        try {
            const rows = db.prepare("SELECT * FROM sleeping_money_leads ORDER BY initial_cart_value DESC").all();
            res.json({ success: true, data: rows });
        } catch (error: any) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.post("/sleeping-money/:id/trigger-swarm", (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const lastTouchAt = new Date().toISOString();

            db.prepare(`
                UPDATE sleeping_money_leads
                SET status = 'OFFER_SENT', channel_used = 'WHATSAPP', last_touch_at = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `).run(lastTouchAt, id);

            res.json({ success: true, message: "WhatsApp closer swarm dispatched with 20% yield discount link" });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    });

    // =========================================================================
    // PILLAR 4 & 5: REVIEWS INTERCEPTION & AI COACHING LOGS
    // =========================================================================

    router.post("/reviews/intercept", (req: Request, res: Response) => {
        try {
            const { venueId, guestName, guestEmail, guestPhone, ratingScore, feedbackText } = req.body;
            const id = `rev-${Date.now()}`;
            
            // Interceptor Gatekeeper Logic: <= 3 stars is intercepted for GM resolution; >= 4 stars routes to TripAdvisor/Google
            const routingResult = ratingScore <= 3 ? "INTERNAL_RESOLUTION_INTERCEPTED" : "GOOGLE_TRIPADVISOR_REDIRECT";
            const compensationOffered = ratingScore <= 3 ? "Complimentary High-Res Digital Album Voucher" : null;

            db.prepare(`
                INSERT INTO review_interception_logs (id, venue_id, guest_name, guest_email, guest_phone, rating_score, feedback_text, routing_result, compensation_offered)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(id, venueId || "venue-main", guestName, guestEmail || null, guestPhone || null, ratingScore, feedbackText, routingResult, compensationOffered);

            res.json({
                success: true,
                routingResult,
                compensationOffered,
                redirectTo: routingResult === "GOOGLE_TRIPADVISOR_REDIRECT" ? "https://maps.google.com" : null
            });
        } catch (error: any) {
            res.status(400).json({ success: false, error: error.message });
        }
    });

    return router;
}
