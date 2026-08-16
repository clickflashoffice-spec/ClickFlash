import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ListResourcesRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ListPromptsRequestSchema, GetPromptRequestSchema } from "@modelcontextprotocol/sdk/types.js";

import { registerTools, handleToolCall } from "./tools.js";
import { registerResources, handleReadResource } from "./resources.js";
import { registerPrompts, handleGetPrompt } from "./prompts.js";
import { discoverExternalTools, dispatchExternalTool, shutdownGateway } from "./gateway.js";
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

// Tools — Native + Gateway (external MCP servers)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  const nativeTools = registerTools();
  let externalTools: unknown[] = [];
  try {
    externalTools = await discoverExternalTools();
  } catch (err: unknown) {
    logger.warn(`[MCP] Failed to discover external tools: ${(err as Error).message}`);
  }
  return { tools: [...nativeTools, ...externalTools] };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name } = request.params;
  const args = request.params.arguments || {};

  // Try external gateway first (prefixed tools like code_*, notebook_*)
  const externalResult = await dispatchExternalTool(name, args);
  if (externalResult !== null) {
    return externalResult;
  }

  // Fall through to native ClickFlash tools
  return await handleToolCall(name, args);
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
  logger.error("ClickFlash Unified MCP Server running on stdio (Native + Gateway)");

  // Graceful shutdown
  process.on('SIGINT', async () => {
    await shutdownGateway();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await shutdownGateway();
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error("Server error:", error);
  process.exit(1);
});
