import type { QualityGateEvaluation, QualityGateOptions } from './types.js';

export const DEFAULT_BANNED_PATTERNS = [
  /\bguarantee(d)?\b/i,
  /\b100% free forever\b/i,
  /\bunlimited prints\b/i,
  /\bfotiqo\b/i,
  /\bdei\b/i,
  /\bcheap\b/i,
];

export const DEFAULT_REQUIRED_KEYWORDS = [
  /memories|moment|experience|capture|resort|vacation|photography|collection/i,
];

export class QualityGateEngine {
  /**
   * Evaluates AI-generated copy and media payloads against brand, safety, hallucination, and budget rules.
   */
  public static evaluateContent(
    text: string,
    metadata: {
      guestName?: string;
      location?: string;
      date?: string;
      expectedImageCount?: number;
    } = {},
    tokenUsage: { promptTokens?: number; completionTokens?: number } = {},
    options: QualityGateOptions = {}
  ): QualityGateEvaluation {
    const violations: string[] = [];
    const bannedPatterns = options.bannedTerms ?? DEFAULT_BANNED_PATTERNS;
    const requiredKeywords = options.requiredKeywords ?? DEFAULT_REQUIRED_KEYWORDS;
    const minBrandScore = options.minBrandSafetyScore ?? 0.85;

    // 1. Prohibited & Banned Patterns
    for (const pattern of bannedPatterns) {
      if (pattern.test(text)) {
        violations.push(`Contains prohibited phrase matching ${pattern.source}`);
      }
    }

    // 2. Brand Tone Compliance
    const matchesBrandTone = requiredKeywords.some((regex) => regex.test(text));
    if (!matchesBrandTone) {
      violations.push('Lacks mandatory resort brand tone and experience keywords');
    }

    // 3. Hallucination & Metadata Grounding Check
    let hallucinationRisk: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';
    if (metadata.guestName && !text.toLowerCase().includes(metadata.guestName.toLowerCase())) {
      violations.push(`Guest personalization mismatch: missing referenced name '${metadata.guestName}'`);
      hallucinationRisk = 'HIGH';
    }

    if (metadata.location && !text.toLowerCase().includes(metadata.location.toLowerCase())) {
      violations.push(`Location mismatch: missing referenced location '${metadata.location}'`);
      if (hallucinationRisk === 'LOW') hallucinationRisk = 'MEDIUM';
    }

    // 4. Token & Cost Accounting
    const promptTokens = tokenUsage.promptTokens ?? 0;
    const completionTokens = tokenUsage.completionTokens ?? 0;
    const inputRate = options.costPer1kInputTokens ?? 0.00015; // Gemini Flash baseline
    const outputRate = options.costPer1kOutputTokens ?? 0.0006;
    const estimatedCostUsd =
      (promptTokens / 1000) * inputRate + (completionTokens / 1000) * outputRate;

    const maxDailySpend =
      options.maxDailySpendUsd ?? options.maxDailyBudgetUsd ?? 25.0;
    const currentDailySpend = options.currentDailySpendUsd ?? 0.0;

    if (currentDailySpend + estimatedCostUsd > maxDailySpend) {
      violations.push(
        `Cost budget breach: Total spend ($${(currentDailySpend + estimatedCostUsd).toFixed(4)}) exceeds daily limit ($${maxDailySpend.toFixed(2)})`
      );
    }

    // 5. Score Calculation & Routing Decision
    const brandSafetyScore =
      violations.length === 0 ? 1.0 : Math.max(0, 1.0 - violations.length * 0.2);
    const passed = violations.length === 0 && brandSafetyScore >= minBrandScore;

    let routing: 'AUTO_PUBLISH' | 'HITL_REVIEW' | 'REJECT' = 'AUTO_PUBLISH';
    let approvalRequired = false;

    if (violations.length > 0 && violations.some((v) => v.includes('Cost budget') || v.includes('prohibited'))) {
      routing = 'REJECT';
      approvalRequired = true;
    } else if (brandSafetyScore < minBrandScore || hallucinationRisk === 'MEDIUM' || hallucinationRisk === 'HIGH') {
      routing = 'HITL_REVIEW';
      approvalRequired = true;
    }

    return {
      passed,
      brandSafetyScore,
      hallucinationRisk,
      approvalRequired,
      routing,
      violations,
      tokenCostEstimate: {
        promptTokens,
        completionTokens,
        estimatedCostUsd,
      },
    };
  }
}

/**
 * Token Bucket Rate Limiter to prevent HTTP 429 rate limit spikes during batch operations.
 */
export class TokenBucketRateLimiter {
  private capacity: number;
  private refillRatePerSecond: number;
  private tokens: number;
  private lastRefillTimestamp: number;

  constructor(capacity = 30, refillRatePerSecond = 10) {
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.tokens = capacity;
    this.lastRefillTimestamp = Date.now();
  }

  private refill(): void {
    const now = Date.now();
    const elapsedTimeInSeconds = (now - this.lastRefillTimestamp) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedTimeInSeconds * this.refillRatePerSecond);
    this.lastRefillTimestamp = now;
  }

  public tryAcquire(cost = 1): boolean {
    this.refill();
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    return false;
  }

  public async acquire(cost = 1, maxWaitMs = 5000): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime <= maxWaitMs) {
      if (this.tryAcquire(cost)) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return false;
  }

  public getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}
