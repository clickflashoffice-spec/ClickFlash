import type { D1Database } from '@cloudflare/workers-types';
import { logAICost } from './ai-cost';

export interface ScoutInsight {
  zoneId: string;
  zoneName: string;
  profitabilityScore: number;
  revenuePerHour: number;
  recommendationText: string;
  actionType: "REDEPLOY" | "SURGE_WARNING" | "MAINTAIN";
  priority: "HIGH" | "MEDIUM" | "LOW";
}

export interface ManagerFlag {
  photographerId: string;
  flagReason: string;
  coachingMessage: string;
  actionPlan: string[];
}

export interface PricingSuggestion {
  id: string;
  trigger: string;
  suggestion: string;
  impact: string;
  confidence: number;
  color: string;
}

/**
 * Calls Gemini API to generate real Location Scout intelligence and foot traffic redeployment strategies.
 */
export async function analyzeLocationScoutWithGemini(
  zonesData: any,
  apiKey: string,
  db: D1Database
): Promise<ScoutInsight[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are the Fotiqo AI Location Scout engine for a global resort photography ecosystem.
Given the following real-time zone metrics across our resorts and attractions:
${JSON.stringify(zonesData, null, 2)}

Generate exactly 3 actionable, high-impact tactical insights for the fleet dispatch controller.
Return ONLY a valid JSON array matching this schema:
[
  {
    "zoneId": "pool-b",
    "zoneName": "Pool Area B",
    "profitabilityScore": 94,
    "revenuePerHour": 4250,
    "recommendationText": "Specific rationale and recommendation based on foot traffic and revenue density...",
    "actionType": "REDEPLOY",
    "priority": "HIGH"
  },
  {
    "zoneId": "sunset-pt",
    "zoneName": "Sunset Point",
    "profitabilityScore": 82,
    "revenuePerHour": 1800,
    "recommendationText": "Imminent surge predicted based on check-ins...",
    "actionType": "SURGE_WARNING",
    "priority": "MEDIUM"
  },
  {
    "zoneId": "central-gdn",
    "zoneName": "Central Garden",
    "profitabilityScore": 68,
    "revenuePerHour": 950,
    "recommendationText": "Coverage optimization strategy...",
    "actionType": "MAINTAIN",
    "priority": "LOW"
  }
]`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { response_mime_type: "application/json" }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Scout Error: ${response.status} ${errorText}`);
  }

  const data: any = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text returned from Gemini Scout");

  const promptTokens = data.usageMetadata?.promptTokenCount || 0;
  const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
  await logAICost(db, 'analyzeLocationScoutWithGemini', 'gemini-1.5-flash', promptTokens, completionTokens);

  try {
    const stripped = text.replace(/```json?\n?([\s\S]*?)```/g, '$1').trim();
    return JSON.parse(stripped) as ScoutInsight[];
  } catch (e: any) {
    throw new Error(`Failed to parse Gemini JSON: ${text}`);
  }
}

/**
 * Calls Gemini API to analyze photographer metrics and generate real coaching advice and warnings.
 */
export async function analyzeFleetManagerWithGemini(
  photographers: any[],
  apiKey: string,
  db: D1Database
): Promise<ManagerFlag[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are the Fotiqo AI Manager and Coaching engine.
Given these current metrics for resort photographers:
${JSON.stringify(photographers, null, 2)}

Analyze who is struggling (low conversion rate < 30%, offline during scheduled shift, or idle too long) and who deserves praise or immediate intervention.
Return ONLY a valid JSON array of objects for flagged photographers matching this schema:
[
  {
    "photographerId": "p2",
    "flagReason": "Conversion rate critically low (18%). Customer satisfaction at risk.",
    "coachingMessage": "Personalized, encouraging, and tactical coaching advice from AI Manager...",
    "actionPlan": [
      "Step 1: Check lighting angles at Beach Front.",
      "Step 2: Use rapid pose prompts from Scout app."
    ]
  }
]`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { response_mime_type: "application/json" }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Manager Error: ${response.status} ${errorText}`);
  }

  const data: any = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text returned from Gemini Manager");

  const promptTokens = data.usageMetadata?.promptTokenCount || 0;
  const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
  await logAICost(db, 'analyzeFleetManagerWithGemini', 'gemini-1.5-flash', promptTokens, completionTokens);

  try {
    const stripped = text.replace(/```json?\n?([\s\S]*?)```/g, '$1').trim();
    return JSON.parse(stripped) as ManagerFlag[];
  } catch (e: any) {
    throw new Error(`Failed to parse Gemini JSON: ${text}`);
  }
}

/**
 * Calls Gemini API to generate CEO dynamic pricing suggestions and revenue forecasts.
 */
export async function analyzeCEOInsightsWithGemini(
  financialData: any,
  apiKey: string,
  db: D1Database
): Promise<{ pricingSuggestions: PricingSuggestion[]; executiveSummary: string; forecastAugust: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are the Fotiqo AI CEO strategic engine for our global resort photography business.
Given our recent revenue and operational figures:
${JSON.stringify(financialData, null, 2)}

Analyze pricing elasticities and resort guest arrivals to produce dynamic pricing suggestions and a strategic executive summary.
Return ONLY a valid JSON object matching this schema:
{
  "pricingSuggestions": [
    {
      "id": "ps-1",
      "trigger": "Peak Hours (14:00-17:00) detected",
      "suggestion": "Increase Digital Album from EUR 85 -> EUR 99",
      "impact": "+18% projected revenue",
      "confidence": 92,
      "color": "emerald"
    },
    {
      "id": "ps-2",
      "trigger": "Low conversion rate at Beach Front",
      "suggestion": "Offer 10% flash discount code for next 2 hours",
      "impact": "+34% conversion at this location",
      "confidence": 78,
      "color": "amber"
    },
    {
      "id": "ps-3",
      "trigger": "All-inclusive guests arriving (40 rooms today)",
      "suggestion": "Pre-sell 'Resort Memory Package' at check-in (EUR 120)",
      "impact": "EUR 4,800 potential incremental revenue",
      "confidence": 85,
      "color": "sky"
    }
  ],
  "executiveSummary": "Concise 2-sentence executive assessment of current revenue velocity...",
  "forecastAugust": 38500
}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { response_mime_type: "application/json" }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini CEO Error: ${response.status} ${errorText}`);
  }

  const data: any = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text returned from Gemini CEO");

  const promptTokens = data.usageMetadata?.promptTokenCount || 0;
  const completionTokens = data.usageMetadata?.candidatesTokenCount || 0;
  await logAICost(db, 'analyzeCEOInsightsWithGemini', 'gemini-1.5-flash', promptTokens, completionTokens);

  try {
    const stripped = text.replace(/```json?\n?([\s\S]*?)```/g, '$1').trim();
    return JSON.parse(stripped) as { pricingSuggestions: PricingSuggestion[]; executiveSummary: string; forecastAugust: number };
  } catch (e: any) {
    throw new Error(`Failed to parse Gemini JSON: ${text}`);
  }
}
