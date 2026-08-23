import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { PromptBuilder, AgentOrchestrator } from "@clickflash/ai";
import { logger } from "./logger.js";

/**
 * ClickFlash Autonomous Agent MCP Tools
 */
export const getAutonomousAgentTools = (): Tool[] => [
  {
    name: "run_clickflash_autonomous_agent",
    description: "Dispatches a high-reasoning autonomous agent configured with the V6.0 ClickFlash ecosystem invariants, prompt compiler, and tool-execution loop to solve or plan a task.",
    inputSchema: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "Description of the task to plan or execute."
        },
        apiKey: {
          type: "string",
          description: "Gemini API key override if not set in GEMINI_API_KEY environment variable."
        }
      },
      required: ["task"]
    }
  },
  {
    name: "compile_agent_system_prompt",
    description: "Compiles and returns the full V6.0 Master System Prompt from the curated template registry with dynamic variable injection.",
    inputSchema: {
      type: "object",
      properties: {
        taskContext: {
          type: "string",
          description: "Optional task context to inject into templates."
        }
      }
    }
  }
];

export async function handleRunAutonomousAgent(args: Record<string, unknown>) {
  const task = args.task as string;
  if (!task || typeof task !== "string") {
    throw new Error("Invalid input: 'task' is required and must be a string.");
  }
  const apiKey = (args.apiKey as string) || process.env.GEMINI_API_KEY || "mock-dev-key";
  
  logger.info(`[AutonomousAgent] Dispatching task: ${task.substring(0, 60)}...`);
  
  try {
    const orchestrator = new AgentOrchestrator(apiKey);
    const result = await orchestrator.runTask(task);
    return {
      content: [
        {
          type: "text",
          text: result
        }
      ]
    };
  } catch (error: any) {
    logger.error(`[AutonomousAgent] Execution error: ${error.message}`);
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Autonomous Agent Error: ${error.message}`
        }
      ]
    };
  }
}

export async function handleCompileAgentPrompt(args: Record<string, unknown>) {
  const builder = new PromptBuilder();
  const masterPrompt = await builder.buildMasterSystemPrompt();
  return {
    content: [
      {
        type: "text",
        text: masterPrompt
      }
    ]
  };
}
