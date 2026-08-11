// backend/services/faceService.ts
import fs from "fs";
import { Logger } from "../shared/logger";

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
  private logger: Logger;

  private constructor(logger: Logger) {
    this.logger = logger;
  }

  public static getInstance(logger?: Logger): FaceService {
    if (!FaceService.instance) {
      if (!logger)
        throw new Error("FaceService must be initialized with a logger first");
      FaceService.instance = new FaceService(logger);
    }
    return FaceService.instance;
  }

  public async analyzeImage(imagePath: string): Promise<FaceAnalysis> {
    try {
      const fileBuffer = await fs.promises.readFile(imagePath);
      const blob = new Blob([fileBuffer]);
      
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');

      const response = await fetch('http://localhost:8000/api/ai/face/vector', {
          method: 'POST',
          body: formData as any,
      });

      if (!response.ok) {
        throw new Error(`AI worker returned status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || data.status !== 'success') {
         throw new Error(data?.detail || "Failed to analyze image");
      }

      return {
        faces: [{
          descriptor: new Float32Array(data.vector),
          box: { x: 0, y: 0, width: 0, height: 0 }, // Fake box, InsightFace doesn't currently return box to this API
        }],
        scores: {
            overall: 1.0,
            sharpness: 1.0,
            expression: 1.0,
        },
        faceCount: 1,
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
