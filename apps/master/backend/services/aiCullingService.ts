import DatabaseManager from '../shared/db';
import { Logger } from '../shared/logger';
import crypto from 'crypto';

interface AICullingConfig {
    groupingTimeThreshold: number; // seconds
    minScoreThreshold: number;
}

export class AICullingService {
    private db: DatabaseManager;
    private logger: Logger;
    private config: AICullingConfig;

    constructor(db: DatabaseManager, logger: Logger) {
        this.db = db;
        this.logger = logger;
        this.config = {
            groupingTimeThreshold: 2.0, // Groups photos taken within 2 seconds
            minScoreThreshold: 0.7
        };
    }

    /**
     * Simulation of AI Analysis
     * In a real implementation, this would load a model or call an external API
     */
    async analyzePhoto(photoId: string, _filePath: string): Promise<Record<string, number>> {
        this.logger.info(`Starting AI analysis for photo ${photoId}`);

        // Mock Analysis: Generate deterministic random scores based on file hash or ID
        // This ensures the same photo gets the same score (consistency)
        const pseudoRandom = (seed: string) => {
            let hash = 0;
            for (let i = 0; i < seed.length; i++) {
                const char = seed.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return (Math.abs(hash) % 1000) / 1000;
        };

        const baseScore = pseudoRandom(photoId); // 0.0 - 1.0

        const sharpness = Math.min(1.0, baseScore + 0.1);
        const exposure = Math.min(1.0, baseScore + 0.05); // Assume decently lit
        const composition = Math.max(0.0, baseScore - 0.1);
        const expression = pseudoRandom(photoId + '_exp');

        // Weighted total
        const overallScore = (sharpness * 0.4) + (exposure * 0.2) + (composition * 0.2) + (expression * 0.2);

        // Save scores
        this.db.run(`
            INSERT OR REPLACE INTO ai_scores 
            (photoId, overallScore, sharpnessScore, exposureScore, compositionScore, expressionScore)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [photoId, overallScore, sharpness, exposure, composition, expression]);

        return { overallScore, sharpness, exposure, composition, expression };
    }

    /**
     * Group photos in an album based on creation timestamp
     */
    async groupPhotos(albumId: string): Promise<void> {
        this.logger.info(`Grouping photos for album ${albumId}`);

        // Fetch all photos in album ordered by date/name
        const photos = this.db.query<{ id: string, originalFilename: string, created_at: string }>(
            `SELECT id, originalFilename, created_at FROM photos WHERE albumId = ? ORDER BY created_at ASC`,
            [albumId]
        );

        if (photos.length === 0) return;

        // Simple Time-Based Grouping
        let currentGroupId = crypto.randomUUID();
        let lastTime = new Date(photos[0].created_at).getTime();

        const groups: { groupId: string, photoIds: string[] }[] = [];
        let currentGroupPhotos: string[] = [];

        for (const photo of photos) {
            const currentTime = new Date(photo.created_at).getTime();

            // If gap is larger than threshold, start new group
            if ((currentTime - lastTime) > (this.config.groupingTimeThreshold * 1000)) {
                // Save previous group if it has photos
                if (currentGroupPhotos.length > 0) {
                    groups.push({ groupId: currentGroupId, photoIds: [...currentGroupPhotos] });
                }
                currentGroupId = crypto.randomUUID();
                currentGroupPhotos = [];
            }

            currentGroupPhotos.push(photo.id);
            lastTime = currentTime;
        }
        // Save last group
        if (currentGroupPhotos.length > 0) {
            groups.push({ groupId: currentGroupId, photoIds: [...currentGroupPhotos] });
        }

        // Apply to DB
        this.db.transaction(() => {
            // Clear existing groups for this album to avoid duplicates (optional, or just update)
            // Ideally we'd be smarter, but full re-group works for now
            this.db.run(`DELETE FROM ai_groups WHERE albumId = ?`, [albumId]);
            // Need to clear aiGroupId from photos?
            // sqlite doesn't cascadingly set NULL on delete usually unless configured.
            // Let's just overwrite.

            for (const group of groups) {
                // Create Group Record
                this.db.run(`INSERT INTO ai_groups (id, albumId) VALUES (?, ?)`, [group.groupId, albumId]);

                // Update Photos
                for (const pid of group.photoIds) {
                    this.db.run(`UPDATE photos SET aiGroupId = ? WHERE id = ?`, [group.groupId, pid]);
                }
            }
        });

        this.logger.info(`Created ${groups.length} groups for ${photos.length} photos`);
    }

    /**
     * Auto-Cull: Select best photo from each group
     */
    async autoCull(albumId: string): Promise<void> {
        this.logger.info(`Running auto-cull for album ${albumId}`);

        const groups = this.db.query<{ id: string }>(`SELECT id FROM ai_groups WHERE albumId = ?`, [albumId]);

        this.db.transaction(() => {
            for (const group of groups) {
                // Get photos in group with their scores
                const photos = this.db.query<{ id: string, overallScore: number }>(`
                    SELECT p.id, s.overallScore 
                    FROM photos p
                    LEFT JOIN ai_scores s ON p.id = s.photoId
                    WHERE p.aiGroupId = ?
                `, [group.id]);

                if (photos.length === 0) continue;

                // Sort by score
                photos.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0));

                const bestPhoto = photos[0];

                // Mark best as 'Selected', others as 'Rejected' (or leave undecided if score is low?)
                // Strategy: Best photo is Selected. Others Rejected.

                this.db.run(`UPDATE photos SET cullingStatus = 'Selected' WHERE id = ?`, [bestPhoto.id]);

                if (photos.length > 1) {
                    const rejectedIds = photos.slice(1).map(p => p.id);
                    // Use a loop or IN clause. Loop is safer for prepared statements list
                    for (const rid of rejectedIds) {
                        this.db.run(`UPDATE photos SET cullingStatus = 'Rejected' WHERE id = ?`, [rid]);
                    }
                }

                // Update group best photo reference
                this.db.run(`UPDATE ai_groups SET bestPhotoId = ? WHERE id = ?`, [bestPhoto.id, group.id]);
            }
        });
    }
}
