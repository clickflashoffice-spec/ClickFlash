# ClickFlash Enterprise AI Prompt Library Reference Manual

> **Standardized Prompt Catalog, System Prompts, Few-Shot Schemas, and Quality Guardrails**  
> Package: [`@clickflash/ai`](file:///c:/Users/alamo/Desktop/ClickFlash/packages/ai) | Architecture: [ADR-008](file:///c:/Users/alamo/Desktop/ClickFlash/.agents/rules/adrs/ADR-008-prompt-engineering-lifecycle.md)

---

## 1. Executive Architecture Overview

In the ClickFlash V7.0 Omni-Modal Ecosystem, AI drives everything from edge photo quality grading to real-time conversational pricing negotiation on WhatsApp. To prevent hallucinations, enforce token budget limits, eliminate security vulnerabilities (e.g. prompt injection), and guarantee deterministic execution, all prompts follow the **Enterprise Prompt Engineering Lifecycle (ADR-008)**.

### Core Lifecycle Principles

```text
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│ 1. Parameterized│ ───► │ 2. Few-Shot     │ ───► │ 3. LLM Infer-   │ ───► │ 4. Zod Schema   │
│    Template     │      │    Calibration  │      │    ence (Gemini)│      │    Validation   │
└─────────────────┘      └─────────────────┘      └─────────────────┘      └─────────────────┘
         ▲                                                                          │
         │                                                                          ▼
┌─────────────────┐                                                        ┌─────────────────┐
│ Guardrail Checks│ ◄──────────────────────────────────────────────────────│ Quality Gate    │
│ (Brand & Budget)│                                                        │ Decision (HITL) │
└─────────────────┘                                                        └─────────────────┘
```

1. **Strict JSON Schema Contracts**: All structured responses must validate against explicit Zod schemas in `packages/ai/src/schemas.ts`.
2. **Deterministic Variable Interpolation**: Prompts use `formatPrompt(template, variables)` to inject variables with `{{VAR_NAME}}` placeholders without string concatenation errors.
3. **Few-Shot In-Context Calibration**: Complex evaluation tasks incorporate few-shot input/output examples via `getPromptWithExamples()`.
4. **Safety & Budget Guardrails**: Outbound requests are screened for brand safety and capped by daily token budget limits (`packages/ai/src/guardrails.ts`).

---

## 2. Prompt Categories & Catalog Index

All prompts are indexed in `PromptCatalog` and exported directly from `@clickflash/ai`:

```typescript
import {
  PromptCatalog,
  formatPrompt,
  getPromptWithExamples,
  getPrompt,
  CULLING_PROMPT,
  SALES_CLOSER_PROMPT,
  NEGOTIATOR_PROMPT,
  NLP_SEARCH_PROMPT
} from '@clickflash/ai';
```

| ID | Name | Category | Description |
| --- | --- | --- | --- |
| `culling` | Photo Culling & Quality Scoring | Vision | Multi-criteria grading (sharpness, exposure, eyes, composition). |
| `blurSharpness` | Action Blur & Sharpness Evaluator | Vision | Edge acutance & subject vs background panning blur. |
| `tagging` | Semantic Scene & Object Tagging | Vision | Rich metadata extraction (scene, mood, attire, activity). |
| `editing` | Photo Editing Parameter Suggestion | Vision | Non-destructive color, light, and crop adjustments. |
| `antiSpoofing` | Biometric Anti-Spoofing & Liveness | Vision | Detects 2D print attacks, screens, and deepfakes. |
| `burstAction` | Burst Action Peak Shot Scorer | Vision | Identifies hero frames in ride action bursts. |
| `ceoSynthesis` | CEO Executive Briefing Synthesis | Swarm | Synthesizes multi-agent telemetry into 3-sentence briefings. |
| `salesAnalyst` | Sales Analyst Lead Scoring | Swarm | Calculates purchase intent & qualifies hot leads. |
| `salesCloser` | Sales Closer WhatsApp & Email Copy | Swarm | Hyper-personalized closing copy with magic links. |
| `negotiator` | Conversational Dynamic Negotiator | Swarm | Real-time counter-offering & objection handling. |
| `abandonedCart` | Abandoned Cart Recovery Pitch | Swarm | Urgency-driven recovery copy with coupon codes. |
| `whaleLead` | Whale Lead VIP Luxury Concierge | Swarm | Bespoke high-ticket packages for repeat guests. |
| `dynamicYield` | Dynamic Yield & Surge Pricing | Swarm | Real-time price multipliers based on park traffic. |
| `hotspotDispatch` | Hotspot Swarm Crowd Dispatch | Swarm | Reallocates photographers based on BLE heatmaps. |
| `staffingOptimizer` | Photographer Staffing Optimizer | Swarm | Balances shift schedules and photographer fatigue. |
| `spyAudit` | Concession Compliance & Fraud Audit | Swarm | Scans transaction logs for leaks & unlinked photos. |
| `nlpSearch` | Natural Language Photo Search | Guest | Converts search phrases into structured visual filters. |
| `voiceSearch` | Voice Query Normalizer | Guest | Cleans acoustic noise from spoken kiosk searches. |
| `kioskAttract` | Kiosk Attract Screensaver Copy | Guest | Inviting headlines and CTAs for Touch Kiosks. |
| `storybookAlbum` | AI Storybook Photobook Narrative | Guest | 4-chapter narrative for custom resort photobooks. |
| `figurineMesh` | 2D-to-3D Figurine Mesh Guidance | Guest | Validates 3D printability and mesh geometry. |
| `systemArchitect` | System Architect Design Review | Engineering | Evaluates design against ADRs and simplicity principles. |
| `codeReview` | Senior Code Quality Review | Engineering | Structured PR review: Critical, Suggestion, Praise. |
| `gdprBiometricAudit` | GDPR / BIPA Biometric Privacy Audit | Engineering | Verifies zero-cloud-raw-storage compliance. |
| `chaosTest` | Chaos Resilience & Fault Injection | Engineering | Designs edge fault scenarios and offline recovery. |

---

## 3. Detailed Prompt Specifications

### 3.1 Computer Vision & Ingestion Prompts

#### `CULLING_PROMPT`
- **Purpose**: Autonomous photo grading for quality, focus, exposure, closed eyes, and composition.
- **Output Interface**: `AIScore`
- **Output Schema**:
```json
{
  "sharpness": 88,
  "exposure": 76,
  "composition": 92,
  "overall": 85,
  "faceCount": 2,
  "hasClosedEyes": false,
  "isBlurry": false,
  "grade": "A",
  "reason": "Crisp subject focus with vibrant exposure and natural smiles."
}
```

#### `ANTI_SPOOFING_PROMPT`
- **Purpose**: Biometric facial liveness verification for guest selfie uploads.
- **Output Schema**:
```json
{
  "isLive": true,
  "livenessScore": 0.96,
  "attackDetected": "NONE",
  "confidence": 0.98,
  "reason": "Natural facial micro-texture and depth response verified."
}
```

---

### 3.2 Autonomous Swarm & Commerce Prompts

#### `CEO_SYNTHESIS_PROMPT`
- **Variables**: `HOTSPOT_REPORT`, `SPY_REPORT`, `STAFFING_REPORT`, `REVENUE_REPORT`
- **Example Usage**:
```typescript
const prompt = formatPrompt(CEO_SYNTHESIS_PROMPT, {
  HOTSPOT_REPORT: "Splash Mountain queue density at 92%; Main Plaza at 30%.",
  SPY_REPORT: "Zero revenue leaks detected; competitor pricing is 15% higher.",
  STAFFING_REPORT: "8 photographers active; 2 on rotation break.",
  REVENUE_REPORT: "$18,400 captured today (+28% vs target)."
});
```

#### `SALES_CLOSER_PROMPT`
- **Variables**: `RESORT_NAME`, `GUEST_NAME`, `TOP_ACTIVITY`, `PHOTO_COUNT`, `DISCOUNT_CODE`, `DISCOUNT_PERCENT`, `EXPIRATION_HOURS`, `MAGIC_LINK`
- **Output Schema**:
```json
{
  "whatsapp": "Hey David! 🎢 Your 14 photos from Expedition Everest turned out amazing. Use code EVEREST25 for 25% OFF your full album for the next 12 hours: https://gallery.clickflash.com/gallery/tok_123",
  "emailSubject": "25% OFF: Your Expedition Everest photos are ready! 📸",
  "emailHtml": "<p>Hi David,</p><p>Relive your thrill on Expedition Everest! Use code <strong>EVEREST25</strong> to save 25% today.</p>"
}
```

#### `NEGOTIATOR_PROMPT`
- **Variables**: `GUEST_MESSAGE`, `INITIAL_PRICE`, `AI_SALVAGE_SCORE`, `MAX_DISCOUNT_PERCENT`, `DISCOUNT_CODE`
- **Output Schema**:
```json
{
  "replyText": "We'd love to help you take these home! How about $29.99 with code SAVE25? ✨",
  "counterOfferPrice": 29.99,
  "discountPercentage": 25,
  "intent": "PRICE_OBJECTION"
}
```

---

### 3.3 Guest Experience & Attract Prompts

#### `NLP_SEARCH_PROMPT`
- **Variables**: `USER_QUERY`
- **Output Schema**:
```json
{
  "intent": "SEARCH_PHOTOS",
  "peopleCount": 2,
  "clothingColors": ["yellow", "blue"],
  "scene": "waterpark",
  "mood": "laughing",
  "accessories": ["sunglasses"],
  "timeFilter": "afternoon",
  "semanticKeywords": ["waterslides", "splash", "wavepool"]
}
```

#### `FIGURINE_MESH_PROMPT`
- **Variables**: `POSE_DESCRIPTION`, `SUBJECTS_COUNT`, `GROUND_CONTACT`
- **Output Schema**:
```json
{
  "meshViabilityScore": 94,
  "isPrintable": true,
  "suggestedBaseThicknessMm": 4.5,
  "manifoldWarnings": [],
  "meshPromptConditioning": "high-detail watertight figurine mesh, solid flat hexagonal pedestal base, full color sandstone texture"
}
```

---

## 4. End-to-End Programmatic Usage Example

```typescript
import {
  GeminiClient,
  PromptCatalog,
  formatPrompt,
  aiScoreSchema,
  TagResult
} from '@clickflash/ai';

const client = new GeminiClient({
  apiKey: process.env.GEMINI_API_KEY!,
  model: 'gemini-2.0-flash',
  temperature: 0.2
});

// 1. Photo Auto-Culling Execution
async function evaluatePhoto(photoBase64: string) {
  const prompt = PromptCatalog.culling.template;
  
  const response = await client.analyzeImage(photoBase64, prompt);
  if (!response.success || !response.data) {
    throw new Error(`AI grading failed: ${response.error}`);
  }

  // 2. Validate against Zod schema
  const parsed = aiScoreSchema.parse(response.data);
  return parsed;
}

// 3. Autonomous WhatsApp Sales Pitch
async function generateSalesPitch(guestName: string, magicLink: string) {
  const prompt = formatPrompt(PromptCatalog.salesCloser.template, {
    RESORT_NAME: 'Atlantis Palm Resort',
    GUEST_NAME: guestName,
    TOP_ACTIVITY: 'Dolphin Encounter',
    PHOTO_COUNT: 18,
    DISCOUNT_CODE: 'DOLPHIN20',
    DISCOUNT_PERCENT: 20,
    EXPIRATION_HOURS: 24,
    MAGIC_LINK: magicLink
  });

  const response = await client.chat([{ role: 'user', content: prompt }]);
  return JSON.parse(response.data || '{}');
}
```
