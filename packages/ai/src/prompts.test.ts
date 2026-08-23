import { describe, it, expect } from 'vitest';
import {
  PromptCatalog,
  formatPrompt,
  getPromptWithExamples,
  getPrompt,
  CULLING_PROMPT,
  BLUR_AND_SHARPNESS_PROMPT,
  TAGGING_PROMPT,
  EDITING_PROMPT,
  ANTI_SPOOFING_PROMPT,
  BURST_ACTION_PROMPT,
  CEO_SYNTHESIS_PROMPT,
  SALES_ANALYST_PROMPT,
  SALES_CLOSER_PROMPT,
  NEGOTIATOR_PROMPT,
  ABANDONED_CART_PROMPT,
  WHALE_LEAD_PROMPT,
  DYNAMIC_YIELD_PROMPT,
  HOTSPOT_DISPATCH_PROMPT,
  STAFFING_OPTIMIZER_PROMPT,
  SPY_AUDIT_PROMPT,
  NLP_SEARCH_PROMPT,
  VOICE_SEARCH_PROMPT,
  KIOSK_ATTRACT_PROMPT,
  STORYBOOK_ALBUM_PROMPT,
  FIGURINE_MESH_PROMPT,
  SYSTEM_ARCHITECT_PROMPT,
  CODE_REVIEW_PROMPT,
  GDPR_BIOMETRIC_AUDIT_PROMPT,
  CHAOS_TEST_PROMPT,
} from './prompts.js';

describe('Prompt Library - Template Formatting & Variable Injection', () => {
  it('should replace single and multiple variable placeholders', () => {
    const template = 'Hello {{NAME}}, welcome to {{RESORT}} on {{DATE}}!';
    const result = formatPrompt(template, {
      NAME: 'Sarah',
      RESORT: 'Atlantis Aquaventure',
      DATE: '2026-08-24',
    });
    expect(result).toBe('Hello Sarah, welcome to Atlantis Aquaventure on 2026-08-24!');
  });

  it('should handle missing or undefined variables gracefully without crashing', () => {
    const template = 'Hello {{NAME}}, your discount is {{DISCOUNT}}%';
    const result = formatPrompt(template, {
      NAME: 'Alex',
      DISCOUNT: undefined,
    });
    expect(result).toBe('Hello Alex, your discount is {{DISCOUNT}}%');
  });

  it('should format CEO Synthesis prompt with multi-agent reports', () => {
    const formatted = formatPrompt(CEO_SYNTHESIS_PROMPT, {
      HOTSPOT_REPORT: 'Rollercoaster zone at 95% capacity; Waterpark at 40%.',
      SPY_REPORT: 'No revenue leaks detected; competitor pricing 15% higher.',
      STAFFING_REPORT: '6 photographers active; 2 on break.',
      REVENUE_REPORT: '$14,250 today (+22% vs forecast).',
    });

    expect(formatted).toContain('Rollercoaster zone at 95% capacity');
    expect(formatted).toContain('No revenue leaks detected');
    expect(formatted).toContain('6 photographers active');
    expect(formatted).toContain('$14,250 today');
    expect(formatted).not.toContain('{{HOTSPOT_REPORT}}');
  });

  it('should format Sales Closer prompt with dynamic discounts and magic links', () => {
    const formatted = formatPrompt(SALES_CLOSER_PROMPT, {
      RESORT_NAME: 'Disney World Animal Kingdom',
      GUEST_NAME: 'David',
      TOP_ACTIVITY: 'Expedition Everest',
      PHOTO_COUNT: 14,
      DISCOUNT_CODE: 'EVEREST25',
      DISCOUNT_PERCENT: 25,
      EXPIRATION_HOURS: 12,
      MAGIC_LINK: 'https://gallery.clickflash.com/gallery/magic_token_123',
    });

    expect(formatted).toContain('Disney World Animal Kingdom');
    expect(formatted).toContain('David');
    expect(formatted).toContain('EVEREST25');
    expect(formatted).toContain('https://gallery.clickflash.com/gallery/magic_token_123');
    expect(formatted).not.toContain('{{DISCOUNT_CODE}}');
  });

  it('should format Negotiator prompt with counter-offer parameters', () => {
    const formatted = formatPrompt(NEGOTIATOR_PROMPT, {
      GUEST_MESSAGE: 'Can I get a discount for buying the whole album?',
      INITIAL_PRICE: 49.99,
      AI_SALVAGE_SCORE: 88,
      MAX_DISCOUNT_PERCENT: 30,
      DISCOUNT_CODE: 'SAVE30',
    });

    expect(formatted).toContain('Can I get a discount for buying the whole album?');
    expect(formatted).toContain('$49.99');
    expect(formatted).toContain('88');
    expect(formatted).toContain('30%');
    expect(formatted).toContain('SAVE30');
  });
});

describe('Prompt Library - Few-Shot In-Context Learning', () => {
  it('should correctly format few-shot examples into prompt text', () => {
    const template = 'Translate natural language to search filter for {{STORE}}:';
    const examples = [
      {
        input: 'Show me photos of kids smiling at the pool',
        output: '{"scene": "pool", "mood": "smiling", "kids": true}',
      },
      {
        input: 'Couples on the rollercoaster wearing hats',
        output: '{"scene": "rollercoaster", "couple": true, "accessories": ["hats"]}',
      },
    ];

    const result = getPromptWithExamples(template, examples, { STORE: 'Kiosk 3' });

    expect(result).toContain('Translate natural language to search filter for Kiosk 3:');
    expect(result).toContain('### Example 1:');
    expect(result).toContain('Show me photos of kids smiling at the pool');
    expect(result).toContain('### Example 2:');
    expect(result).toContain('Couples on the rollercoaster wearing hats');
    expect(result).toContain('Now perform the task for the given input.');
  });

  it('should return base prompt when examples array is empty', () => {
    const template = 'Base template {{VAR}}';
    const result = getPromptWithExamples(template, [], { VAR: 'TEST' });
    expect(result).toBe('Base template TEST');
  });
});

describe('Prompt Library - PromptCatalog Registry Integrity', () => {
  it('should contain all required core vision prompts', () => {
    expect(PromptCatalog.culling).toBeDefined();
    expect(PromptCatalog.culling.category).toBe('vision');
    expect(PromptCatalog.blurSharpness).toBeDefined();
    expect(PromptCatalog.tagging).toBeDefined();
    expect(PromptCatalog.editing).toBeDefined();
    expect(PromptCatalog.antiSpoofing).toBeDefined();
    expect(PromptCatalog.burstAction).toBeDefined();
  });

  it('should contain all required autonomous swarm prompts', () => {
    expect(PromptCatalog.ceoSynthesis).toBeDefined();
    expect(PromptCatalog.ceoSynthesis.category).toBe('swarm');
    expect(PromptCatalog.salesAnalyst).toBeDefined();
    expect(PromptCatalog.salesCloser).toBeDefined();
    expect(PromptCatalog.negotiator).toBeDefined();
    expect(PromptCatalog.abandonedCart).toBeDefined();
    expect(PromptCatalog.whaleLead).toBeDefined();
    expect(PromptCatalog.dynamicYield).toBeDefined();
    expect(PromptCatalog.hotspotDispatch).toBeDefined();
    expect(PromptCatalog.staffingOptimizer).toBeDefined();
    expect(PromptCatalog.spyAudit).toBeDefined();
  });

  it('should contain all required guest and attract prompts', () => {
    expect(PromptCatalog.nlpSearch).toBeDefined();
    expect(PromptCatalog.nlpSearch.category).toBe('guest');
    expect(PromptCatalog.voiceSearch).toBeDefined();
    expect(PromptCatalog.kioskAttract).toBeDefined();
    expect(PromptCatalog.storybookAlbum).toBeDefined();
    expect(PromptCatalog.figurineMesh).toBeDefined();
  });

  it('should contain all required engineering and security prompts', () => {
    expect(PromptCatalog.systemArchitect).toBeDefined();
    expect(PromptCatalog.systemArchitect.category).toBe('engineering');
    expect(PromptCatalog.codeReview).toBeDefined();
    expect(PromptCatalog.gdprBiometricAudit).toBeDefined();
    expect(PromptCatalog.chaosTest).toBeDefined();
  });

  it('should lookup prompt definition via getPrompt helper', () => {
    const prompt = getPrompt('salesCloser');
    expect(prompt).toBeDefined();
    expect(prompt?.name).toBe('Sales Closer WhatsApp & Email Copy');
    expect(prompt?.requiredVariables).toContain('MAGIC_LINK');
  });

  it('should return undefined for non-existent prompt ID', () => {
    const prompt = getPrompt('non_existent_prompt_id');
    expect(prompt).toBeUndefined();
  });
});

describe('Prompt Library - Prompt Strings Constants', () => {
  it('should have valid non-empty prompt strings', () => {
    const prompts = [
      CULLING_PROMPT,
      BLUR_AND_SHARPNESS_PROMPT,
      TAGGING_PROMPT,
      EDITING_PROMPT,
      ANTI_SPOOFING_PROMPT,
      BURST_ACTION_PROMPT,
      CEO_SYNTHESIS_PROMPT,
      SALES_ANALYST_PROMPT,
      SALES_CLOSER_PROMPT,
      NEGOTIATOR_PROMPT,
      ABANDONED_CART_PROMPT,
      WHALE_LEAD_PROMPT,
      DYNAMIC_YIELD_PROMPT,
      HOTSPOT_DISPATCH_PROMPT,
      STAFFING_OPTIMIZER_PROMPT,
      SPY_AUDIT_PROMPT,
      NLP_SEARCH_PROMPT,
      VOICE_SEARCH_PROMPT,
      KIOSK_ATTRACT_PROMPT,
      STORYBOOK_ALBUM_PROMPT,
      FIGURINE_MESH_PROMPT,
      SYSTEM_ARCHITECT_PROMPT,
      CODE_REVIEW_PROMPT,
      GDPR_BIOMETRIC_AUDIT_PROMPT,
      CHAOS_TEST_PROMPT,
    ];

    for (const p of prompts) {
      expect(typeof p).toBe('string');
      expect(p.length).toBeGreaterThan(50);
    }
  });
});
