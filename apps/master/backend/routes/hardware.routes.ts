import express, { Request, Response, Router } from "express";
import { hardwareTriggerService } from "../services/hardwareTriggerService";
import { dslrTetherService } from "../services/dslrTetherService";

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

    // DSLR USB Tethering Routes
    router.get("/dslr/status", (_req: Request, res: Response) => {
        res.json(dslrTetherService.getStatus());
    });

    router.post("/dslr/start", (_req: Request, res: Response) => {
        const success = dslrTetherService.startTether();
        res.json({ success, status: dslrTetherService.getStatus() });
    });

    router.post("/dslr/stop", (_req: Request, res: Response) => {
        const success = dslrTetherService.stopTether();
        res.json({ success, status: dslrTetherService.getStatus() });
    });

    return router;
}
