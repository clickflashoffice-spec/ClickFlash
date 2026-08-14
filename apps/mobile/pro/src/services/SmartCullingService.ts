import type { AIQualityScore } from '@clickflash/ai-core';

export interface CullingScore extends AIQualityScore {
  status: 'ANALYZED';
  isAcceptable: boolean;
  reason?: string;
}

export interface CullingAnalysisUnavailable {
  status: 'ANALYSIS_UNAVAILABLE';
  reason: 'NO_DETERMINISTIC_PIXEL_ANALYZER';
}

export type CullingResult = CullingScore | CullingAnalysisUnavailable;

const analysisUnavailable: CullingAnalysisUnavailable = {
  status: 'ANALYSIS_UNAVAILABLE',
  reason: 'NO_DETERMINISTIC_PIXEL_ANALYZER',
};

class SmartCullingService {
  evaluatePhoto(_localUri: string): Promise<CullingResult> {
    return Promise.resolve(analysisUnavailable);
  }
}

export const smartCullingService = new SmartCullingService();
