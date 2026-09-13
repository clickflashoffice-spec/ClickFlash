export interface GradeResult {
  id: string;
  filename: string;
  status: 'keeper' | 'reject' | 'borderline';
  sharpnessScore: number;
}
