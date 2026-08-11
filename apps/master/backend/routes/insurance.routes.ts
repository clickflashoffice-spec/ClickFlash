import { Router, Request, Response } from "express";
import { aiInsuranceService } from "../services/aiInsuranceService";
import multer from "multer";

const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });
const router = Router();

router.get("/telemetry", async (_req: Request, res: Response) => {
  try {
    const telemetry = await aiInsuranceService.getTelemetry();
    res.json({ status: "success", telemetry });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/check", upload.single("photo"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing photo file" });
    }
    const photoId = (req.body.photoId as string) || `manual_${Date.now()}`;
    const result = await aiInsuranceService.insurePhoto(photoId, req.file.buffer);
    res.json({ status: "success", result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/throttle", async (req: Request, res: Response) => {
  try {
    const { isThrottled } = req.body;
    const success = await aiInsuranceService.setThrottling(Boolean(isThrottled));
    res.json({ status: "success", isThrottled, updated: success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
