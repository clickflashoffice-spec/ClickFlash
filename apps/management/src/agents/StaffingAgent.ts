import { performOfflineReasoning } from "@clickflash/ai/src/llama-cpp-client";

export class StaffingAgent {
  public static async suggestStaffingLevels(queueLength: number, activePhotographers: number): Promise<string> {
    const prompt = `
      You are an autonomous staffing manager for a resort photography system.
      Current Queue Length: ${queueLength} guests
      Active Photographers: ${activePhotographers}
      
      Should we dispatch more photographers or stand down? Provide a 1-sentence recommendation.
    `;

    // Uses the strictly constrained node-llama-cpp offline model (3 cores)
    return await performOfflineReasoning(prompt);
  }
}
