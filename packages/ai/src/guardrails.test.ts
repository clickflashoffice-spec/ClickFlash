import { describe, it, expect, vi } from 'vitest';
import {
  QualityGateEngine,
  TokenBucketRateLimiter,
  DEFAULT_BANNED_PATTERNS,
} from './guardrails.js';

describe('QualityGateEngine', () => {
  const mockMetadata = {
    guestName: 'Sarah Jenkins',
    location: 'Emerald Cove Resort',
    date: '2026-08-14',
    expectedImageCount: 12,
  };

  it('passes compliant and on-brand content with low cost', () => {
    const content =
      'Dear Sarah Jenkins, your vacation photography collection at Emerald Cove Resort is ready to view. Relive your favorite memories!';
    const evaluation = QualityGateEngine.evaluateContent(
      content,
      mockMetadata,
      { promptTokens: 120, completionTokens: 40 },
      { currentDailySpendUsd: 1.5, maxDailyBudgetUsd: 20.0 }
    );

    expect(evaluation.passed).toBe(true);
    expect(evaluation.brandSafetyScore).toBe(1.0);
    expect(evaluation.hallucinationRisk).toBe('LOW');
    expect(evaluation.approvalRequired).toBe(false);
    expect(evaluation.routing).toBe('AUTO_PUBLISH');
    expect(evaluation.violations).toHaveLength(0);
    expect(evaluation.tokenCostEstimate.estimatedCostUsd).toBeGreaterThan(0);
  });

  it('flags and rejects content with prohibited banned phrases', () => {
    const content =
      'Dear Sarah Jenkins, we guarantee 100% free forever unlimited prints for your Emerald Cove Resort vacation memories!';
    const evaluation = QualityGateEngine.evaluateContent(
      content,
      mockMetadata,
      { promptTokens: 100, completionTokens: 50 },
      { currentDailySpendUsd: 1.0, maxDailyBudgetUsd: 20.0 }
    );

    expect(evaluation.passed).toBe(false);
    expect(evaluation.brandSafetyScore).toBeLessThan(0.85);
    expect(evaluation.routing).toBe('REJECT');
    expect(evaluation.violations.some((v) => v.includes('prohibited'))).toBe(true);
  });

  it('detects guest name omission as hallucination risk requiring review', () => {
    const content =
      'Your vacation photography collection at Emerald Cove Resort is ready to view. Relive your favorite memories!';
    const evaluation = QualityGateEngine.evaluateContent(
      content,
      mockMetadata,
      { promptTokens: 100, completionTokens: 50 },
      { currentDailySpendUsd: 1.0, maxDailyBudgetUsd: 20.0 }
    );

    expect(evaluation.passed).toBe(false);
    expect(evaluation.hallucinationRisk).toBe('HIGH');
    expect(evaluation.approvalRequired).toBe(true);
    expect(evaluation.routing).toBe('HITL_REVIEW');
  });

  it('flags daily budget breach and stops auto-publishing', () => {
    const content =
      'Dear Sarah Jenkins, your vacation photography collection at Emerald Cove Resort is ready.';
    const evaluation = QualityGateEngine.evaluateContent(
      content,
      mockMetadata,
      { promptTokens: 5000, completionTokens: 2000 },
      { currentDailySpendUsd: 24.999, maxDailyBudgetUsd: 25.0 }
    );

    expect(evaluation.passed).toBe(false);
    expect(evaluation.violations.some((v) => v.includes('Cost budget breach'))).toBe(true);
    expect(evaluation.routing).toBe('REJECT');
  });
});

describe('TokenBucketRateLimiter', () => {
  it('allows token acquisition within rate limit capacity', () => {
    const limiter = new TokenBucketRateLimiter(5, 1);
    expect(limiter.tryAcquire(3)).toBe(true);
    expect(limiter.tryAcquire(2)).toBe(true);
    expect(limiter.tryAcquire(1)).toBe(false);
  });

  it('refills tokens over time', async () => {
    const limiter = new TokenBucketRateLimiter(2, 20); // 20 tokens per sec
    expect(limiter.tryAcquire(2)).toBe(true);
    expect(limiter.tryAcquire(1)).toBe(false);

    await new Promise((r) => setTimeout(r, 100)); // ~2 tokens refilled
    expect(limiter.tryAcquire(1)).toBe(true);
  });
});
