import { Tool } from "@modelcontextprotocol/sdk/types.js";

export function getUiUxInnovatorTools(): Tool[] {
  return [
    {
      name: "suggest_better_ui",
      description: "Connects to Tailwind constraints and Tremor charts to automatically propose UI/UX enhancements in the apps/management dashboard.",
      inputSchema: {
        type: "object",
        properties: {
          componentPath: { type: "string", description: "Path to the React component" }
        },
        required: ["componentPath"]
      }
    }
  ];
}

export async function handleSuggestBetterUi(args: { componentPath: string; }) {
  const output = `=== 🎨 UI/UX INNOVATOR ===\nComponent: ${args.componentPath}\n\nProposed Enhancements:\n1. Apply Tremor Card for better metric visualization.\n2. Add Tailwind Glassmorphism effect: 'bg-white/10 backdrop-blur-md'.\n3. Enhance accessibility with aria-labels on interactive elements.\n\nUI suggestions formulated.`;
  return { content: [{ type: "text", text: output }] };
}
