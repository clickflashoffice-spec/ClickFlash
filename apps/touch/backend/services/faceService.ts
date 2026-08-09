// backend/services/faceService.ts
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import fs from "fs";
import { Logger } from "../shared/logger";
import { WorkerPool } from "../shared/WorkerPool";

// For Touch App, models are typically in public/models or a similar path
const getModelsPath = () => {
  const publicPath = path.resolve(process.cwd(), "public", "models");
  if (fs.existsSync(publicPath)) return publicPath;

  const dataPath = path.resolve(process.cwd(), "pb_data", "models");
  if (fs.existsSync(dataPath)) return dataPath;

  return publicPath;
};

const MODELS_PATH = getModelsPath();

export interface FaceAnalysis {
  faces: {
    descriptor: Float32Array;
    box: any;
  }[];
  scores: {
    overall: number;
    sharpness: number;
    expression: number;
  };
  faceCount: number;
}

export class FaceService {
  private static instance: FaceService;
  private pool: WorkerPool;
  private logger: Logger;

  private constructor(logger: Logger) {
    this.logger = logger;
    this.pool = new WorkerPool(this.getWorkerScriptPath(), logger);
  }

  public static getInstance(logger?: Logger): FaceService {
    if (!FaceService.instance) {
      if (!logger)
        throw new Error("FaceService must be initialized with a logger first");
      FaceService.instance = new FaceService(logger);
    }
    return FaceService.instance;
  }

  private getWorkerScriptPath(): string {
    // In dev, we might use tsx to run the worker
    const devPath = path.resolve(__dirname, "../workers/faceWorker.ts");
    if (fs.existsSync(devPath)) return devPath;

    const prodPath = path.resolve(__dirname, "../workers/faceWorker.js");
    if (fs.existsSync(prodPath)) return prodPath;

    return path.resolve(process.cwd(), "backend/workers/faceWorker.ts");
  }

  public async analyzeImage(imagePath: string): Promise<FaceAnalysis> {
    try {
      const result = await this.pool.run({
        type: "get-descriptors",
        imagePath,
        modelsPath: MODELS_PATH,
      } as any);

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
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[FaceService] Error analyzing image ${imagePath}:`, {
        error: message,
      });
      return {
        faces: [],
        scores: { overall: 0, sharpness: 0, expression: 0 },
        faceCount: 0,
      };
    }
  }

  public async getDescriptor(imagePath: string): Promise<Float32Array | null> {
    const analysis = await this.analyzeImage(imagePath);
    return analysis.faces.length > 0 ? analysis.faces[0].descriptor : null;
  }
}

export const faceService = {
  getInstance: (logger?: Logger) => FaceService.getInstance(logger),
};
