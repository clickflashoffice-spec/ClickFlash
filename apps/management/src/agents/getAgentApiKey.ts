/**
 * Shared AI API key resolution for management agents.
 * Resolves from: Vite env → window.ENV → process.env → empty string (disabled).
 */
export const getAgentApiKey = (): string => {
  const key =
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_API_KEY) ||
    (typeof window !== "undefined" && (window as any).ENV?.GEMINI_API_KEY) ||
    (typeof process !== "undefined" && process.env?.GEMINI_API_KEY) ||
    "";
  if (!key) {
    console.warn("[ClickFlash Agent] GEMINI_API_KEY not configured — AI agent features will be disabled");
  }
  return key;
};
