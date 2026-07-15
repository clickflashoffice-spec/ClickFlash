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
  }
  
  throw new Error(`Unknown prompt: ${name}`);
}
