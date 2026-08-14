import { LlamaModel, LlamaContext, LlamaChatSession } from "node-llama-cpp";
import path from "path";

let model: LlamaModel | null = null;
let context: LlamaContext | null = null;
let session: LlamaChatSession | null = null;

/**
 * Initializes the node-llama-cpp environment with aggressive thread limits.
 * We are running a Llama-3.1-8B quantized model (or similar) on a 6-core/34GB RAM PC.
 */
export async function getLlamaSession(): Promise<LlamaChatSession> {
  if (session) {
    return session;
  }

  // Load the quantized model
  const modelsDirectory = path.join(process.cwd(), "models");
  model = new LlamaModel({
    modelPath: path.join(modelsDirectory, "Llama-3.1-8B-Instruct-Q4_K_M.gguf"),
    // Since this is the Master Node with 34GB RAM, memory isn't the issue, but compute is.
  });

  // Create context with a strict 3 thread limit to ensure the 6-core OS does not freeze
  context = new LlamaContext({
    model,
    threads: 3, 
    contextSize: 4096 // Sufficient for most swarm reasoning tasks
  });

  session = new LlamaChatSession({
    contextSequence: context.getSequence()
  });

  return session;
}

/**
 * Offline Swarm AI reasoning.
 * Generative AI runs strictly in a background pool and takes as long as it needs,
 * preventing UI thread starvation on 4-6 core machines.
 */
export async function performOfflineReasoning(prompt: string): Promise<string> {
  try {
    const chatSession = await getLlamaSession();
    const response = await chatSession.prompt(prompt);
    return response;
  } catch (error) {
    console.error("Failed to run local generative AI:", error);
    return "Error: Local AI reasoning failed.";
  }
}
