import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./logger.js";

/**
 * Swarm Orchestration Tools
 * 
 * Exposes atomic tools for planning, delegating, and synthesizing work 
 * across a multi-agent swarm. Follows MCP best practices:
 * 1. Atomic actions (plan vs synthesize)
 * 2. Strict Zod-like JSON schemas
 * 3. Actionable errors
 */

export const getSwarmTools = (): Tool[] => [
  {
    name: "swarm_plan_task",
    description: "Breaks down a complex objective into a structured execution plan for multiple specialized agents. Use this to determine which agents to spawn and what their specific instructions should be.",
    inputSchema: {
      type: "object",
      properties: {
        objective: { 
          type: "string", 
          description: "The high-level goal to accomplish (e.g. 'Refactor auth system to use JWT')" 
        },
        maxAgents: { 
          type: "number", 
          description: "Maximum number of parallel agents to deploy (default: 3, max: 10)",
          minimum: 1,
          maximum: 10
        }
      },
      required: ["objective"]
    }
  },
  {
    name: "swarm_synthesize_results",
    description: "Reviews and synthesizes the outputs of multiple sub-agents into a final, cohesive summary or codebase update plan. Use this after your sub-agents complete their tasks.",
    inputSchema: {
      type: "object",
      properties: {
        originalObjective: {
          type: "string",
          description: "The original goal the swarm was trying to achieve."
        },
        agentOutputs: {
          type: "array",
          items: {
            type: "object",
            properties: {
              role: { type: "string" },
              result: { type: "string" }
            },
            required: ["role", "result"]
          },
          description: "Array of results from each agent."
        }
      },
      required: ["originalObjective", "agentOutputs"]
    }
  }
];

export async function handleSwarmPlanTask(args: Record<string, unknown>) {
  const objective = args.objective as string;
  if (!objective || typeof objective !== 'string') {
    throw new Error("Invalid input: 'objective' is required and must be a string.");
  }
  const maxAgents = typeof args.maxAgents === 'number' ? Math.min(args.maxAgents, 10) : 3;

  logger.info(`[Swarm] Planning task: ${objective.substring(0, 50)}...`);

  // In a full implementation, this might call an LLM to generate the plan.
  // For now, we use a heuristic/template approach based on the objective.
  const agents = [];

  if (objective.toLowerCase().includes("refactor") || objective.toLowerCase().includes("harden")) {
    agents.push({
      role: "Security & Architecture Reviewer",
      instruction: `Analyze the codebase for vulnerabilities related to: ${objective}. Identify files to change and provide strict guidelines.`,
      modelTier: "pro"
    });
    agents.push({
      role: "Implementation Engineer",
      instruction: `Execute the codebase changes for: ${objective}. Follow the guidelines from the Reviewer.`,
      modelTier: "pro"
    });
    agents.push({
      role: "QA Automation Engineer",
      instruction: `Write tests and verify the implementation for: ${objective}. Ensure no regressions.`,
      modelTier: "flash"
    });
  } else {
    // Generic Swarm
    agents.push({
      role: "Research Agent",
      instruction: `Gather all necessary context, documentation, and file locations for: ${objective}.`,
      modelTier: "flash"
    });
    agents.push({
      role: "Execution Agent",
      instruction: `Complete the core work for: ${objective} based on the research provided.`,
      modelTier: "pro"
    });
  }

  const plan = {
    objective,
    recommendedSwarmSize: agents.slice(0, maxAgents).length,
    agents: agents.slice(0, maxAgents),
    nextStep: "Use your platform's sub-agent invocation tool (e.g. invoke_subagent) to spawn these agents."
  };

  return { content: [{ type: "text", text: JSON.stringify(plan, null, 2) }] };
}

export async function handleSwarmSynthesize(args: Record<string, unknown>) {
  const originalObjective = args.originalObjective as string;
  const agentOutputs = args.agentOutputs as Array<{role: string, result: string}>;
  
  if (!originalObjective || !Array.isArray(agentOutputs) || agentOutputs.length === 0) {
    throw new Error("Invalid input: Provide originalObjective and a non-empty agentOutputs array. This helps the LLM synthesize correctly.");
  }

  logger.info(`[Swarm] Synthesizing ${agentOutputs.length} results for: ${originalObjective.substring(0, 50)}...`);

  // Basic synthesis logic - ideally this would pipe to a summarization LLM
  let synthesis = `=== SWARM SYNTHESIS REPORT ===\n`;
  synthesis += `Objective: ${originalObjective}\n`;
  synthesis += `Total Agents Responded: ${agentOutputs.length}\n\n`;

  let hasErrors = false;
  
  for (const out of agentOutputs) {
    synthesis += `--- Agent: ${out.role} ---\n`;
    
    // Sniff out failures
    if (out.result.toLowerCase().includes('error') || out.result.toLowerCase().includes('fail')) {
      hasErrors = true;
      synthesis += `⚠️ Warning: Agent reported potential issues.\n`;
    }
    
    // Truncate long results for the summary
    const truncated = out.result.length > 500 ? out.result.substring(0, 500) + '... [truncated]' : out.result;
    synthesis += `${truncated}\n\n`;
  }

  synthesis += `--- Final Conclusion ---\n`;
  if (hasErrors) {
    synthesis += `Status: NEEDS_REVIEW\nThe swarm encountered errors or blockers. Review the warnings above before proceeding.\n`;
  } else {
    synthesis += `Status: SUCCESS\nAll agents completed their tasks. The objective appears to be met.\n`;
  }

  return { content: [{ type: "text", text: synthesis }] };
}
