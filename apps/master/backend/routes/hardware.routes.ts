import express, { Request, Response, Router } from "express";
import { hardwareTriggerService } from "../services/hardwareTriggerService";

export function createHardwareRouter(): Router {
    const router = express.Router();

    router.post("/trigger", async (req: Request, res: Response): Promise<void> => {
        try {
            const result = await hardwareTriggerService.handleTrigger(req.body);
            res.json(result);
        } catch (error: any) {
            res.status(400).json({ error: error.message || "Invalid payload" });
        }
    });

    return router;
}
