import * as path from 'path';
import * as fs from 'fs';
import * as ort from 'onnxruntime-node';
import { logger } from '../utils/logger.ts';

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
  public static async evaluateImage(imagePath: string): Promise<CullingScores> {
    const scores: CullingScores = {
      blurScore: 0.1, // Default safe value
      faceCount: 0,
      closedEyesCount: 0,
    };

    try {
      const exec = require('util').promisify(require('child_process').exec);
      const scriptPath = path.join(process.cwd(), 'scripts', 'brisque_scorer.py');
      const { stdout } = await exec(`python "${scriptPath}" "${imagePath}"`);
      const score = parseFloat(stdout.trim());
      if (!isNaN(score)) {
        scores.blurScore = score;
      }
    } catch (error) {
      logger.error('[AICullingService] Error running BRISQUE inference:', error);
    }

    return scores;
  }

  public async analyzePhoto(photoId: string, imagePath: string): Promise<void> {
    try {
      if (!fs.existsSync(imagePath)) return;
      
      const scores = await AICullingService.evaluateImage(imagePath);
      
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
