import { ManualEdits } from '@/types';
import { apiService } from '@/services/apiService';
import { logger } from '@/utils/logger';

export interface Preset {
    id: string;
    name: string;
    description?: string;
    adjustments: ManualEdits;
    isSystem: boolean;
    category: string;
    createdAt?: string;
}

/** Shape returned by the collections API for a photo_presets record */
interface RawPresetRecord {
    id: string;
    name: string;
    description?: string;
    adjustments: string | ManualEdits;
    isSystem?: number | boolean;
    category?: string;
    createdAt?: string;
}

export class PresetManager {
    private static COLLECTION = 'photo_presets';

    static async getPresets(): Promise<Preset[]> {
        try {
            const records = await (apiService as any).getRecords(this.COLLECTION) as RawPresetRecord[];
            return (records || []).reduce<Preset[]>((acc, r) => {
                try {
                    const adjustments = typeof r.adjustments === 'string' ? JSON.parse(r.adjustments) as ManualEdits : r.adjustments;
                    acc.push({
                        id: r.id,
                        name: String(r.name || '').slice(0, 100),
                        description: r.description ? String(r.description).slice(0, 500) : undefined,
                        adjustments,
                        isSystem: Boolean(r.isSystem),
                        category: r.category || 'Custom',
                        createdAt: r.createdAt
                    });
                } catch (e) {
                    logger.warn('Skipping preset with invalid adjustments', { id: r.id, error: e });
                }
                return acc;
            }, []);
        } catch (error) {
            logger.error('Failed to fetch presets:', error);
            return [];
        }
    }

    static async savePreset(preset: Omit<Preset, 'id' | 'isSystem' | 'createdAt'>): Promise<Preset | null> {
        try {
            const id = `preset-${Date.now()}`;
            const record = {
                id,
                ...preset,
                isSystem: 0, // Always 0 for user-created
                adjustments: JSON.stringify(preset.adjustments)
            };

            const saved = await (apiService as any).createRecord(this.COLLECTION, record);
            if (!saved) return null;

            return {
                ...preset,
                id: saved.id,
                isSystem: false,
                createdAt: saved.createdAt
            };
        } catch (error) {
            logger.error('Failed to save preset:', { error });
            return null;
        }
    }

    static async deletePreset(id: string): Promise<boolean> {
        try {
            return await (apiService as any).deleteRecord(this.COLLECTION, id);
        } catch (error) {
            logger.error('Failed to delete preset:', error);
            return false;
        }
    }
}
