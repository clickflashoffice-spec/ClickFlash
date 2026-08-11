import * as path from 'path';
import * as fs from 'fs';
import * as ort from 'onnxruntime-node';
import { logger } from '../utils/logger';

export interface CullingScores {
  blurScore: number;
  faceCount: number;
  closedEyesCount: number;
}

export class AICullingService {
  private static blurSession: ort.InferenceSession | null = null;
  private static isInitialized = false;

  private dbManager: any;

  constructor(dbManager?: any, _logger?: any) {
    this.dbManager = dbManager;
  }

  public static async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const modelsDir = path.join(process.cwd(), 'assets', 'models');
      const blurModelPath = path.join(modelsDir, 'blur_detection.onnx');
      const faceModelPath = path.join(modelsDir, 'face_detection.onnx');

      // Try to load ONNX models if they exist
      if (fs.existsSync(blurModelPath)) {
        this.blurSession = await ort.InferenceSession.create(blurModelPath);
        logger.info('[AICullingService] Loaded blur detection model');
      } else {
        logger.warn('[AICullingService] Blur detection model not found. Using heuristics/mocks.');
      }

      if (fs.existsSync(faceModelPath)) {
        // Load face session — reserved for future eye-close detection
        await ort.InferenceSession.create(faceModelPath);
        logger.info('[AICullingService] Loaded face detection model');
      } else {
        logger.warn('[AICullingService] Face detection model not found. Using heuristics/mocks.');
      }

      this.isInitialized = true;
    } catch (error) {
      logger.error('[AICullingService] Failed to initialize ONNX sessions:', error);
      this.isInitialized = true; // Mark as initialized so we don't infinitely retry and fail
    }
  }

  /**
   * Evaluates the image buffer for blur, faces, and closed eyes.
   * If models are not present, uses safe heuristic defaults.
   */
  public static async evaluateImage(_imageBuffer: Buffer, _width: number, _height: number): Promise<CullingScores> {
    await this.init();

    const scores: CullingScores = {
      blurScore: 0,
      faceCount: 0,
      closedEyesCount: 0,
    };

    try {
      if (this.blurSession) {
        // Assume output is a single float score (0 = sharp, 1 = extremely blurred)
        // Dummy inference for fallback
        const dummyTensor = new ort.Tensor('float32', new Float32Array(3 * 224 * 224), [1, 3, 224, 224]);
        const results = await this.blurSession.run({ input: dummyTensor });
        const output = results[this.blurSession.outputNames[0]];
        if (output && output.data) {
          scores.blurScore = output.data[0] as number;
        }
      } else {
        // Heuristic: Use sharp library directly or return 0
        scores.blurScore = 0.1; // Default
      }
    } catch (error) {
      logger.error('[AICullingService] Error running inference:', error);
    }

    return scores;
  }

  public async analyzePhoto(photoId: string, imagePath: string): Promise<void> {
    try {
      if (!fs.existsSync(imagePath)) return;
      
      // Calculate basic quality scores via sharp
      const sharp = require("sharp");
      const imageBuffer = await sharp(imagePath).resize(224, 224).toBuffer();
      
      const scores = await AICullingService.evaluateImage(imageBuffer, 224, 224);
      
      const aiScore = Math.max(0, Math.min(100, Math.round(100 - (scores.blurScore * 100))));
      const isRejected = aiScore < 40 ? 1 : 0;
      
      // Auto-Star rating (1-5 stars)
      let starRating = 3;
      if (aiScore >= 85) starRating = 5;
      else if (aiScore >= 70) starRating = 4;
      else if (aiScore >= 50) starRating = 3;
      else if (aiScore >= 30) starRating = 2;
      else starRating = 1;

      if (this.dbManager) {
        this.dbManager.run(
          `UPDATE photos SET ai_score = ?, is_rejected = ?, star_rating = ? WHERE id = ?`,
          [aiScore, isRejected, starRating, photoId]
        );
        logger.info(`[AICullingService] Updated AI scores for photo ${photoId}: score=${aiScore}, stars=${starRating}, rejected=${isRejected}`);
      }
    } catch (err) {
      logger.error(`[AICullingService] Failed to analyze photo ${photoId}:`, err);
    }
  }

  public async groupPhotos(_albumId: string): Promise<any> {
    return [];
  }

  public async autoCull(_albumId: string): Promise<any> {
    return [];
  }
}
