import { GeminiClient } from '@clickflash/ai';
import { EdgeAIGradingResult, AIGrade } from './grade-worker';

const AI_API_KEY = process.env.GEMINI_API_KEY || 'demo-api-key';

export interface AIGradeRequest {
  type: 'AI_GRADE_FILE';
  imageBase64: string;
  id: string;
  currentScore: number;
}

export interface AIGradeResponse {
  type: 'AI_GRADE_RESULT';
  id: string;
  result: EdgeAIGradingResult;
}

const client = new GeminiClient({
  apiKey: AI_API_KEY,
  model: 'gemini-2.0-flash',
  temperature: 0.1, // Low temperature for consistent grading
});

self.onmessage = async (event: MessageEvent<AIGradeRequest>) => {
  if (event.data.type !== 'AI_GRADE_FILE') return;
  const { imageBase64, id, currentScore } = event.data;

  try {
    const prompt = `You are a professional resort photography editor.
This photo was flagged by our local Laplacian Variance filter as potentially low quality (Sharpness: ${currentScore}/100).
Your job is to evaluate if this photo should be salvaged.
Evaluate the composition, the emotional impact (are people smiling? is it a special moment?), and the salvageability (can it be brightened/sharpened in post?).
If the emotional value or composition outweighs the technical blurriness, grade it as 'B' (Keeper - Needs Edit).
If it is completely unsalvageable or has no emotional value, grade it as 'REJECT'.

Respond with a JSON object:
{
  "grade": "B" | "REJECT",
  "reason": "short explanation of your decision",
  "faceCount": number
}`;

    const schema = {
      type: 'object',
      properties: {
        grade: { type: 'string', enum: ['B', 'REJECT'] },
        reason: { type: 'string' },
        faceCount: { type: 'number' }
      },
      required: ['grade', 'reason', 'faceCount']
    };

    const result = await client.analyzeImage<{ grade: AIGrade; reason: string; faceCount: number }>(
      imageBase64,
      prompt,
      schema as any
    );

    if (result.success && result.data) {
      self.postMessage({
        type: 'AI_GRADE_RESULT',
        id,
        result: {
          grade: result.data.grade,
          sharpnessScore: currentScore,
          exposureScore: 50, // AI salvage baseline
          faceCount: result.data.faceCount,
          reason: result.data.reason
        }
      } satisfies AIGradeResponse);
    } else {
      throw new Error(result.error || 'Unknown AI evaluation error');
    }
  } catch (error: unknown) {
    self.postMessage({
      type: 'AI_GRADE_RESULT',
      id,
      result: {
        grade: 'REJECT',
        sharpnessScore: currentScore,
        exposureScore: 0,
        faceCount: 0,
        reason: `AI Evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
      },
    } satisfies AIGradeResponse);
  }
};
