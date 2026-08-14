import { aiIntelligenceService } from '../aiIntelligenceService';
import { logger } from '@/utils/logger';

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  }
}));

describe('aiIntelligenceService', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetchCEOInsights (generateForecast) returns revenue projection and pricing suggestions', async () => {
    const mockResponse = {
      success: true,
      executiveSummary: 'Great month',
      forecastAugust: 40000,
      pricingSuggestions: [{
        id: '1',
        trigger: 'Test',
        suggestion: 'Test suggestion',
        impact: '+10%',
        confidence: 90,
        color: 'emerald'
      }]
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await aiIntelligenceService.fetchCEOInsights({ month: 'August' });
    expect(result.forecastAugust).toBe(40000);
    expect(result.pricingSuggestions).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('fetchManagerFlags (generateCoachingPlan) returns structured plan with action items', async () => {
    const mockResponse = {
      success: true,
      flags: [{
        photographerId: 'p1',
        flagReason: 'Low volume',
        coachingMessage: 'Keep it up!',
        actionPlan: ['Step 1', 'Step 2']
      }]
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await aiIntelligenceService.fetchManagerFlags(['p1']);
    expect(result).toHaveLength(1);
    expect(result[0].actionPlan).toEqual(['Step 1', 'Step 2']);
  });

  it('fetchScoutInsights (detectAnomalies) returns anomaly/scout objects for outliers', async () => {
    const mockResponse = {
      success: true,
      insights: [{
        zoneId: 'z1',
        zoneName: 'Lobby',
        profitabilityScore: 99,
        revenuePerHour: 5000,
        recommendationText: 'Huge surge',
        actionType: 'SURGE_WARNING',
        priority: 'HIGH'
      }]
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await aiIntelligenceService.fetchScoutInsights({ data: 'test' });
    expect(result).toHaveLength(1);
    expect(result[0].actionType).toBe('SURGE_WARNING');
  });

  it('returns fallback data gracefully when API errors out', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network Error'));

    const result = await aiIntelligenceService.fetchScoutInsights();
    // Fallback data has 4 insights
    expect(result.length).toBeGreaterThan(0);
    expect(logger.warn).toHaveBeenCalled();
  });
  
  it('returns fallback data gracefully when fetch is not OK', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await aiIntelligenceService.fetchManagerFlags();
    expect(result.length).toBeGreaterThan(0);
  });
});
