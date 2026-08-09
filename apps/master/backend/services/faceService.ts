// backend/services/faceService.ts
import path from "path";
import fs from "fs";
import { logger } from '../utils/logger';
import { FaceAnalysis, FaceWorkerResult, FaceWorkerJob } from "../types/face";
import { WorkerPool } from '../services/WorkerPool';
import { fileURLToPath } from 'url';

const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

// Path to models
const getModelsPath = () => {
  const distPath = path.resolve(process.cwd(), "dist", "master", "models");
  if (fs.existsSync(distPath)) return distPath;

  const publicPath = path.resolve(process.cwd(), "public", "models");
  if (fs.existsSync(publicPath)) return publicPath;

  if ((process as any).resourcesPath) {
    const electronPath = path.join((process as any).resourcesPath, "models");
    if (fs.existsSync(electronPath)) return electronPath;
  }

  return publicPath;
};

const MODELS_PATH = getModelsPath();

export class FaceService {
  private static instance: FaceService;
  private pool: WorkerPool;

  private constructor() {
    this.pool = new WorkerPool(this.getWorkerScriptPath(), logger);
  }

  public static getInstance(): FaceService {
    if (!FaceService.instance) {
      FaceService.instance = new FaceService();
    }
    return FaceService.instance;
  }

  private getWorkerScriptPath(): string {
    const prodPath = path.resolve(_dirname, "../workers/faceWorker.js");
    if (fs.existsSync(prodPath)) return prodPath;

    const devPath = path.resolve(_dirname, "../workers/faceWorker.ts");
    if (fs.existsSync(devPath)) return devPath;

    return path.resolve(process.cwd(), "backend/workers/faceWorker.ts");
  }

  private async runWorker(job: FaceWorkerJob): Promise<FaceWorkerResult> {
    try {
      // WorkerPool expects WorkerJob, FaceWorkerJob is compatible
      const result = (await this.pool.run(job as any)) as FaceWorkerResult;
      return result;
    } catch (err: any) {
      logger.error("[FaceService] Pool Execution Error", {
        error: err.message,
      });
      return { success: false, error: err.message };
    }
  }

  /**
   * Get AI Analysis (Descriptors + Boxes + Scores) for all faces in image (Offloaded to worker)
   */
  public async analyzeImage(imagePath: string): Promise<FaceAnalysis> {
    try {
      const result = await this.runWorker({
        type: "get-descriptors",
        imagePath,
        modelsPath: MODELS_PATH,
      });

      if (!result.success || !result.faces) {
        throw new Error(result.error || "Failed to analyze image");
      }

      return {
        faces: result.faces.map((f: any) => ({
          descriptor: new Float32Array(f.descriptor),
          box: f.box,
        })),
        scores: result.scores,
        faceCount: result.faceCount || 0,
        width: result.width,
        height: result.height,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`[FaceService] Error analyzing image ${imagePath}:`, {
        error: message,
      });
      return { faces: [], faceCount: 0 };
    }
  }

  /**
   * Backward compatibility or specialized fetch
   */
  public async getAllDescriptors(imagePath: string): Promise<Float32Array[]> {
    const analysis = await this.analyzeImage(imagePath);
    return analysis.faces.map((f) => f.descriptor);
  }

  /**
   * Legacy support or single face descriptor
   */
  public async getDescriptor(imagePath: string): Promise<Float32Array | null> {
    const descriptors = await this.getAllDescriptors(imagePath);
    return descriptors.length > 0 ? descriptors[0] : null;
  }
}

export const faceService = FaceService.getInstance();
