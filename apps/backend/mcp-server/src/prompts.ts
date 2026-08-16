import { Prompt } from "@modelcontextprotocol/sdk/types.js";

export function registerPrompts(): Prompt[] {
  return [
    {
      name: "debug_issue",
      description: "A prompt for debugging a ClickFlash app issue, pre-loads context about the project.",
      arguments: [
        {
          name: "appName",
          description: "Name of the app (e.g. master, touch)",
          required: true
        },
        {
          name: "issueDescription",
          description: "Brief description of the issue to debug",
          required: true
        }
      ]
    },
    {
      name: "plan_mode_init",
      description: "Initialize an AI agent to operate in Plan Mode for ClickFlash.",
      arguments: []
    },
    {
      name: "flagship_protocol",
      description: "Forces the AI to adopt the Flagship-Class AI Agent Protocol with 4-phase reasoning.",
      arguments: []
    }
  ];
}

export async function handleGetPrompt(name: string, args: any) {
  if (name === "debug_issue") {
    return {
      description: `Debug an issue in the ${args.appName} app`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Please help me debug the following issue in the ClickFlash ${args.appName} app:\n\n${args.issueDescription}\n\nYou can use the clickflash://architecture resource to understand the project structure, and the clickflash://logs/${args.appName} resource to view recent logs. Let me know if you need to run any local DB queries.`
          }
        }
      ]
    };
  } else if (name === "plan_mode_init") {
    return {
      description: `Initialize Plan Mode`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are now operating in **Plan Mode** for the ClickFlash ecosystem. You have tools to manage implementation plans and track progress autonomously. 

Here is your workflow:
1. When asked to perform a complex task, first use \`create_plan\` to scaffold your planning artifacts.
2. Review your active plan via the \`clickflash://plans/implementation\` resource.
3. Track your checklist via the \`clickflash://plans/tasks\` resource.
4. As you complete tasks, use \`update_task_status\` to mark them as "IN_PROGRESS" or "DONE".
5. Upon completion, use \`append_walkthrough\` to document your accomplishments.

Please acknowledge that you are ready to begin Plan Mode.`
          }
        }
      ]
    };
  } else if (name === "flagship_protocol") {
    return {
      description: `Initialize Flagship Protocol`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are now operating under the Flagship-Class AI Agent Protocol. Your core directive is to prioritize deep reasoning, long-horizon task execution, offline-first context management, and extreme accuracy over immediate, superficial responses.

For every request given to you, you must strictly follow this 4-step internal protocol before providing your final answer. You will explicitly output the text for each phase using these XML tags:

<protocol>
<phase_1_planning>
- Deconstruct the user's request into atomic, manageable sub-tasks.
- Identify the core constraints, edge cases, and potential pitfalls.
- Determine the resources, logic, or step-by-step algorithms needed.
</phase_1_planning>

<phase_2_deep_reasoning>
- Execute a Chain-of-Thought (CoT) internal monologue.
- Debate multiple approaches.
- Draft initial logic/code.
</phase_2_deep_reasoning>

<phase_3_critique_and_refine>
- Step back and review the output from Phase 2. Play the role of a harsh, senior reviewer.
- Apply necessary corrections.
</phase_3_critique_and_refine>

<phase_4_final_output>
- Deliver the final, polished response.
</phase_4_final_output>
</protocol>`
          }
        }
      ]
    };
  }
  
  throw new Error(`Unknown prompt: ${name}`);
}
