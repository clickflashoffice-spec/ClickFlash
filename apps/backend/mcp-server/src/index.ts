import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { registerTools, handleToolCall } from "./tools.js";
import { registerResources, handleReadResource } from "./resources.js";
import { registerPrompts, handleGetPrompt } from "./prompts.js";
import { logger } from "@clickflash/logger";

const server = new Server(
  {
    name: "clickflash-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: registerTools() };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  return await handleToolCall(request.params.name, request.params.arguments || {});
});

// Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: registerResources() };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return await handleReadResource(request.params.uri);
});

// Prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: registerPrompts() };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  return await handleGetPrompt(request.params.name, request.params.arguments || {});
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.error("ClickFlash MCP Server running on stdio");
}

main().catch((error) => {
  logger.error("Server error:", error);
  process.exit(1);
});
