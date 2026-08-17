import { vi, describe, it, test, expect, beforeEach } from 'vitest';
import { geminiService } from '../geminiService';

const mockGenerateContent = vi.fn();

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: mockGenerateContent
        }
      };
    })
  };
}, { virtual: true });

describe('GeminiService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await geminiService.initialize('test-key');
  });

  describe('generateTags (generatePhotoTags equivalent)', () => {
    it('returns TagResult array', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: '["tag1", "tag2"]'
      });
      const result = await geminiService.generateTags(Buffer.from('test'));
      expect(result).toEqual(['tag1', 'tag2']);
    });

    it('retry logic: first call throws 429, second succeeds', async () => {
      const error429 = new Error('Too many requests');
      (error429 as any).status = 429;
      
      mockGenerateContent
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ text: '["tag1"]' });

      // Spy on setTimeout to capture jitter
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      const result = await geminiService.generateTags(Buffer.from('test'), 'image/jpeg', 1);
      
      expect(result).toEqual(['tag1']);
      expect(mockGenerateContent).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      
      const delay = setTimeoutSpy.mock.calls[0][1] as number;
      // Delay should be 1000 + random jitter (0 to 500)
      expect(delay).toBeGreaterThanOrEqual(1000);
      expect(delay).toBeLessThan(1500);
      
      setTimeoutSpy.mockRestore();
    });

    it('jitter: two calls do not have identical delays', async () => {
      const error429 = new Error('Too many requests');
      (error429 as any).status = 429;
      
      mockGenerateContent
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ text: '["tag1"]' });

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      await geminiService.generateTags(Buffer.from('test'), 'image/jpeg', 1);
      const delay1 = setTimeoutSpy.mock.calls[0][1] as number;

      mockGenerateContent
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ text: '["tag2"]' });

      await geminiService.generateTags(Buffer.from('test'), 'image/jpeg', 1);
      const delay2 = setTimeoutSpy.mock.calls[1][1] as number;

      // Extremely unlikely to be identical due to Math.random()
      expect(delay1).not.toBe(delay2);

      setTimeoutSpy.mockRestore();
    });
  });

  describe('analyzePhotoForCulling (generateEditParams equivalent)', () => {
    it('returns PhotoAnalysis', async () => {
      const mockAnalysis = {
        sharpnessScore: 8,
        compositionScore: 7,
        expressionScore: 9,
        eyesOpen: true,
        tags: [],
        suggestedEdits: { exposure: 1 }
      };

      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(mockAnalysis)
      });

      const result = await geminiService.analyzePhotoForCulling(Buffer.from('test'));
      expect(result).toEqual(mockAnalysis);
    });
  });

  describe('askAssistant (chatWithAssistant equivalent)', () => {
    it('returns string response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        text: 'This is the response'
      });

      const result = await geminiService.askAssistant('question', 'context');
      expect(result).toBe('This is the response');
    });
  });
});
