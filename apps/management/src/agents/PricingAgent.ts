import { performOfflineReasoning } from "@clickflash/ai/src/llama-cpp-client";

export class PricingAgent {
  public static async analyzePricing(currentSales: number, occupancyRate: number): Promise<string> {
    const prompt = `
      You are an autonomous pricing strategist for a resort photography system.
      Current Sales: $${currentSales}
      Resort Occupancy: ${occupancyRate}%
      
      Suggest if we should increase, decrease, or maintain the current digital photo pass price, and provide a 1-sentence reason.
    `;

    // Uses the strictly constrained node-llama-cpp offline model (3 cores)
    return await performOfflineReasoning(prompt);
  }
}
