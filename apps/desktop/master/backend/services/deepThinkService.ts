import { createLogger } from '@clickflash/logger';

const logger = createLogger({ serviceName: 'DeepThinkService' });

export interface PosingIdea {
  id: string;
  category: 'portrait' | 'couple' | 'group' | 'candid' | 'action' | 'vintage';
  title: string;
  description: string;
  cameraSettingSuggestion: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
}

export interface InspirationReport {
  albumId: string;
  shootStyleDetected: string;
  totalPhotosAnalyzed: number;
  recommendations: PosingIdea[];
  creativePrompt: string;
}

const INSPIRATION_DATABASE: PosingIdea[] = [
  {
    id: 'pose_1',
    category: 'portrait',
    title: 'The Over-The-Shoulder Glance',
    description: 'Have the subject turn slightly away from the camera, then look back over their shoulder. Creates depth and sharp jawline definition.',
    cameraSettingSuggestion: 'f/2.8, 1/250s, ISO 400 — focus exactly on the nearest eye.',
    difficulty: 'Beginner',
    tags: ['portrait', 'individual', 'editorial', 'jawline']
  },
  {
    id: 'pose_2',
    category: 'couple',
    title: 'Forehead-to-Forehead Silhouette',
    description: 'Position the couple in profile against a bright background or sunset. Have them gently rest foreheads together with eyes closed.',
    cameraSettingSuggestion: 'f/4.0, 1/500s — expose for the background highlights to create crisp silhouettes.',
    difficulty: 'Intermediate',
    tags: ['couple', 'romantic', 'silhouette', 'sunset']
  },
  {
    id: 'pose_3',
    category: 'group',
    title: 'V-Formation Staggered Walk',
    description: 'Instead of standing in a straight line, arrange the group in a loose V-formation walking slowly toward the lens while talking naturally.',
    cameraSettingSuggestion: 'f/5.6, 1/500s — enough depth of field to keep front and back subjects sharp.',
    difficulty: 'Beginner',
    tags: ['group', 'dynamic', 'candid', 'walking']
  },
  {
    id: 'pose_4',
    category: 'candid',
    title: 'Shared Laughter / The Secret Whisper',
    description: 'Prompt one subject to whisper a genuine compliment or joke to another. Capture the spontaneous, authentic laugh that follows.',
    cameraSettingSuggestion: 'f/2.0, 1/400s — continuous high-speed burst (AF-C).',
    difficulty: 'Beginner',
    tags: ['candid', 'laughter', 'authentic', 'emotion']
  },
  {
    id: 'pose_5',
    category: 'vintage',
    title: 'Fotio Classical Direct Gaze (1960s Studio)',
    description: 'Subject sits square to the camera with a neutral, timeless expression and relaxed shoulders. Perfect for high-contrast B&W processing.',
    cameraSettingSuggestion: 'f/8.0, 1/160s, studio strobe / key light at 45 degrees.',
    difficulty: 'Intermediate',
    tags: ['vintage', 'black_and_white', 'timeless', 'studio']
  },
  {
    id: 'pose_6',
    category: 'action',
    title: 'Dynamic Dress Swirl / Motion Blur Background',
    description: 'If the subject is wearing flowing fabric, have them spin or walk briskly while panning with the movement.',
    cameraSettingSuggestion: 'f/4.0, 1/60s — pan smoothly with the subject for motion-blur background.',
    difficulty: 'Advanced',
    tags: ['action', 'motion', 'creative', 'panning']
  }
];

export class DeepThinkService {
  private dbManager: any;

  constructor(dbManager: any) {
    this.dbManager = dbManager;
  }

  /**
   * Analyzes an album's current photo collection to detect shooting style
   * and recommends curated posing & creative inspiration.
   */
  public async getInspirationForAlbum(albumId: string): Promise<InspirationReport> {
    logger.info(`[DeepThinkService] Curating posing and creative inspiration for album ${albumId}`);

    const photos = this.dbManager.query(
      `SELECT id, width, height, ai_score, quality_flags, title FROM photos WHERE album_id = ? ORDER BY created_at DESC LIMIT 25`,
      [albumId]
    ) || [];

    const totalPhotos = photos.length;
    let portraitCount = 0;
    let wideCount = 0;
    let blurCount = 0;

    photos.forEach((p: any) => {
      const w = p.width || 1920;
      const h = p.height || 1080;
      if (w / h < 0.9) portraitCount++;
      else wideCount++;

      let flags: string[] = [];
      try {
        flags = typeof p.quality_flags === 'string' ? JSON.parse(p.quality_flags) : p.quality_flags || [];
      } catch (e) {}
      if (flags.includes('BLUR')) blurCount++;
    });

    let detectedStyle = 'Versatile Mixed Collection';
    let targetCategories: PosingIdea['category'][] = ['portrait', 'candid', 'vintage'];

    if (totalPhotos === 0) {
      detectedStyle = 'Fresh Shoot Setup';
      targetCategories = ['portrait', 'couple', 'group', 'candid'];
    } else if (portraitCount > wideCount) {
      detectedStyle = 'Portrait-Forward Session';
      targetCategories = ['portrait', 'candid', 'vintage'];
    } else if (wideCount >= portraitCount) {
      detectedStyle = 'Cinematic / Environmental Storytelling';
      targetCategories = ['group', 'couple', 'action', 'candid'];
    }

    // Filter recommendations matching target categories or versatile tags
    const recommendations = INSPIRATION_DATABASE.filter(idea =>
      targetCategories.includes(idea.category) || idea.tags.includes('editorial')
    ).slice(0, 4);

    const creativePrompt = totalPhotos > 0 && blurCount > (totalPhotos * 0.3)
      ? 'Note: We noticed several recent shots experienced motion blur. Try stabilizing your stance or using our action posing prompts above with shutter speeds > 1/400s!'
      : `DeepThink recommendation based on ${totalPhotos} photos: You have established a strong ${detectedStyle} flow. Try introducing a dramatic silhouette or vintage B&W contrast shot next to add visual variety to the client gallery.`;

    return {
      albumId,
      shootStyleDetected: detectedStyle,
      totalPhotosAnalyzed: totalPhotos,
      recommendations,
      creativePrompt
    };
  }
}
