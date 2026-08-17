export * from '@clickflash/types';
import type { Photo } from '@clickflash/types';

export interface MoneyTrashPhoto extends Photo {
  originalAlbumId?: string;
  archivedAt?: string;
  discountPercentage?: number;
  discountPrice?: number;
  originalPrice?: number;
  daysUntilDeletion?: number;
  isFromMoneyTrash?: true;
  manualEdits?: any;
}

export interface ShootIdea {
  title: string;
  description: string;
  settings?: Record<string, string | number>;
  recommendedLenses?: string[];
  samplePoseDescription?: string;
}
