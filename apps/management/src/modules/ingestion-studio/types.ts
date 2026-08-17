export interface GradeResult {
  id: string;
  filename: string;
  sharpnessScore: number;
  status: 'keeper' | 'reject' | 'borderline';
  thumbnailUrl?: string;
}

export interface IngestionSession {
  id: string;
  date: string;
  source: string;
  totalPhotos: number;
  keepers: number;
  rejectRate: number;
  status: 'processing' | 'completed' | 'failed';
  duration: string;
}
