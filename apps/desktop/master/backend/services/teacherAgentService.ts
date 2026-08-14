import { createLogger } from '@clickflash/logger';

const logger = createLogger({ serviceName: 'TeacherAgentService' });

export interface CoachingTip {
  category: 'composition' | 'exposure' | 'sharpness' | 'general';
  severity: 'info' | 'warning' | 'positive';
  title: string;
  message: string;
  actionableStep?: string;
}

export interface CoachingReport {
  photoId: string;
  overallGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'Needs Improvement';
  summary: string;
  tips: CoachingTip[];
  aiScore: number;
}

export class TeacherAgentService {
  private dbManager: any;

  constructor(dbManager: any) {
    this.dbManager = dbManager;
  }

  /**
   * Generates a comprehensive composition and technical coaching report for a photo.
   */
  public async getCoachingReport(photoId: string): Promise<CoachingReport> {
    logger.info(`[TeacherAgent] Generating composition and technical coaching report for photo ${photoId}`);

    const photo = this.dbManager.get(
      `SELECT id, ai_score, is_rejected, quality_flags, width, height, originalFilename FROM photos WHERE id = ?`,
      [photoId]
    );

    if (!photo) {
      throw new Error(`Photo ${photoId} not found`);
    }

    const aiScore: number = photo.ai_score !== null && photo.ai_score !== undefined ? Number(photo.ai_score) : 85.0;
    const isRejected: boolean = Boolean(photo.is_rejected);
    let qualityFlags: string[] = [];
    try {
      if (photo.quality_flags) {
        qualityFlags = typeof photo.quality_flags === 'string' ? JSON.parse(photo.quality_flags) : photo.quality_flags;
      }
    } catch (e) {
      logger.warn(`[TeacherAgent] Could not parse quality_flags for ${photoId}`);
    }

    const tips: CoachingTip[] = [];

    // 1. Evaluate Sharpness & Motion Blur
    if (isRejected || qualityFlags.includes('BLUR') || aiScore < 60) {
      tips.push({
        category: 'sharpness',
        severity: 'warning',
        title: 'Motion Blur or Focus Softness Detected',
        message: 'The AI detected edge softness or camera shake across the focal plane. This typically happens when the shutter speed drops below 1/125s for handheld shots.',
        actionableStep: 'Increase your shutter speed above 1/250s or widen your aperture (e.g., f/2.8) to let in more light and freeze motion.'
      });
    } else if (aiScore >= 88) {
      tips.push({
        category: 'sharpness',
        severity: 'positive',
        title: 'Tack-Sharp Focus on Subject',
        message: 'Excellent micro-contrast and sharpness across the subject area. Edge transition is clean with crisp detail preservation.',
        actionableStep: 'Maintain this AF-C / spot focus technique when shooting active subjects.'
      });
    }

    // 2. Composition & Framing (Rule of Thirds / Aspect Ratios)
    const width = photo.width || 1920;
    const height = photo.height || 1080;
    const aspectRatio = width / height;

    if (aspectRatio > 1.7) {
      tips.push({
        category: 'composition',
        severity: 'info',
        title: 'Cinematic Widescreen Framing',
        message: 'This shot uses a wide landscape aspect ratio (~16:9 or wider), creating an immersive, cinematic feeling.',
        actionableStep: 'Ensure your primary subject sits on one of the outer vertical intersecting grid lines (Rule of Thirds) to balance the negative space.'
      });
    } else if (aspectRatio < 0.8) {
      tips.push({
        category: 'composition',
        severity: 'info',
        title: 'Vertical Portrait Orientation',
        message: 'Vertical framing works wonderfully for individual portraits and mobile-first delivery.',
        actionableStep: 'Watch head-room at the top edge—leave just enough breathing room without pushing the eyes below the top horizontal grid line.'
      });
    } else {
      tips.push({
        category: 'composition',
        severity: 'positive',
        title: 'Balanced Classical Framing',
        message: 'Standard aspect ratio gives a familiar, natural perspective well-suited for prints and album layouts.',
        actionableStep: 'Look for leading lines (pathways, railings, architectural edges) to guide the viewer’s eye toward your subject.'
      });
    }

    // 3. Exposure / Quality Flags Evaluation
    if (qualityFlags.includes('UNDEREXPOSED') || qualityFlags.includes('DARK')) {
      tips.push({
        category: 'exposure',
        severity: 'warning',
        title: 'Shadow Clipping / Underexposure',
        message: 'Significant detail is lost in the shadow regions. High-contrast lighting might be overwhelming the dynamic range.',
        actionableStep: 'Use fill flash, reflector bounce, or increase ISO by 1 stop (+1 EV) to open up shadow detail without blowing out highlights.'
      });
    } else if (qualityFlags.includes('OVEREXPOSED') || qualityFlags.includes('BLOWN_HIGHLIGHTS')) {
      tips.push({
        category: 'exposure',
        severity: 'warning',
        title: 'Highlight Clipping Detected',
        message: 'Bright areas (such as sky or white fabrics) have clipped to pure white, reducing recovery potential in post-production.',
        actionableStep: 'Expose for the highlights by dialing exposure compensation down (-0.7 EV) and recovering shadows in RAW processing.'
      });
    } else {
      tips.push({
        category: 'exposure',
        severity: 'positive',
        title: 'Well-Balanced Histogram & Exposure',
        message: 'Shadows and highlights are well-controlled with clean mid-tone distribution across the scene.',
        actionableStep: 'Great exposure management—no immediate lighting adjustments needed!'
      });
    }

    // Calculate Overall Grade based on AI score & tips
    let overallGrade: CoachingReport['overallGrade'] = 'A';
    if (aiScore >= 92 && !isRejected) overallGrade = 'A+';
    else if (aiScore >= 85 && !isRejected) overallGrade = 'A';
    else if (aiScore >= 78) overallGrade = 'B+';
    else if (aiScore >= 70) overallGrade = 'B';
    else if (aiScore >= 60) overallGrade = 'C';
    else overallGrade = 'Needs Improvement';

    const summary = overallGrade === 'Needs Improvement' || overallGrade === 'C'
      ? 'This photo presents some technical challenges with sharpness or exposure. Review the actionable steps below to refine your next shot.'
      : 'Strong technical execution with clean framing and well-managed exposure. Below are targeted tips to elevate your composition even further.';

    return {
      photoId,
      overallGrade,
      summary,
      tips,
      aiScore
    };
  }
}
