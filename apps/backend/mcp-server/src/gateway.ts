/**
 * Unified MCP Gateway — Combines all external MCP server capabilities
 * into the ClickFlash MCP Server.
 *
 * External servers integrated:
 * 1. alaeddine-mcp  → Codebase exploration, architecture analysis, linting
 * 2. notebooklm    → Research notebooks, AI queries, content generation
 * 3. clickflash    → CEO tools, database ops, fleet management (native)
 *
 * This module re-exports unified tool definitions and a dispatcher
 * that routes calls to the correct underlying MCP server via stdio.
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { logger } from "@clickflash/logger";

// ─── External MCP Server Definitions ────────────────────────────────────────

interface ExternalServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
  toolPrefix: string;
}

const EXTERNAL_SERVERS: ExternalServer[] = [
  {
    name: "alaeddine-mcp",
    command: "node",
    args: [process.env.ALAEDDINE_MCP_PATH || ""],
    env: {},
    toolPrefix: "code_",
  },
  {
    name: "notebooklm",
    command: "node",
    args: [process.env.NOTEBOOKLM_MCP_PATH || ""],
    env: {
      NOTEBOOKLM_AUTH_TOKEN: process.env.NOTEBOOKLM_AUTH_TOKEN || "",
    },
    toolPrefix: "notebook_",
  },
];

// ─── Client Pool ─────────────────────────────────────────────────────────────

const clientPool: Map<string, Client> = new Map();

async function getClient(server: ExternalServer): Promise<Client | null> {
  if (clientPool.has(server.name)) {
    return clientPool.get(server.name)!;
  }

  // Skip if path not configured
  if (!server.args[0]) {
    logger.debug(`[MCPGateway] Skipping ${server.name}: path not configured.`);
    return null;
  }

  try {
    const transport = new StdioClientTransport({
      command: server.command,
      args: server.args,
      env: { ...process.env, ...server.env } as Record<string, string>,
    });

    const client = new Client(
      { name: `clickflash-gateway-${server.name}`, version: "1.0.0" },
      { capabilities: {} }
    );

    await client.connect(transport);
    clientPool.set(server.name, client);
    logger.info(`[MCPGateway] Connected to external server: ${server.name}`);
    return client;
  } catch (err: unknown) {
    const msg = err instanceof Error ? (err as Error).message : String(err);
    logger.warn(`[MCPGateway] Failed to connect to ${server.name}: ${msg}`);
    return null;
  }
}

// ─── Tool Discovery ──────────────────────────────────────────────────────────

/**
 * Discover tools from all external MCP servers and return them
 * with prefixed names to avoid collisions.
 */
export async function discoverExternalTools(): Promise<Tool[]> {
  const allTools: Tool[] = [];

  for (const server of EXTERNAL_SERVERS) {
    const client = await getClient(server);
    if (!client) continue;

    try {
      const result = await client.listTools();
      for (const tool of result.tools) {
        allTools.push({
          ...tool,
          name: `${server.toolPrefix}${tool.name}`,
          description: `[${server.name}] ${tool.description}`,
        });
      }
      logger.info(`[MCPGateway] Discovered ${result.tools.length} tools from ${server.name}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? (err as Error).message : String(err);
      logger.warn(`[MCPGateway] Failed to list tools from ${server.name}: ${msg}`);
    }
  }

  return allTools;
}

// ─── Tool Dispatch ───────────────────────────────────────────────────────────

/**
 * Route a tool call to the correct external MCP server.
 * Returns null if the tool doesn't belong to any external server.
 */
export async function dispatchExternalTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> } | null> {
  for (const server of EXTERNAL_SERVERS) {
    if (name.startsWith(server.toolPrefix)) {
      const originalName = name.slice(server.toolPrefix.length);
      const client = await getClient(server);

      if (!client) {
        return {
          content: [
            {
              type: "text",
              text: `[MCPGateway] Server ${server.name} is not available. Set ${server.name === "alaeddine-mcp" ? "ALAEDDINE_MCP_PATH" : "NOTEBOOKLM_MCP_PATH"} environment variable.`,
            },
          ],
        };
      }

      try {
        const result = await client.callTool({ name: originalName, arguments: args });
        return result as { content: Array<{ type: string; text: string }> };
      } catch (err: unknown) {
        const msg = err instanceof Error ? (err as Error).message : String(err);
        return {
          content: [{ type: "text", text: `[MCPGateway] Error from ${server.name}/${originalName}: ${msg}` }],
        };
      }
    }
  }

  return null; // Not an external tool
}

// ─── Shutdown ────────────────────────────────────────────────────────────────

export async function shutdownGateway(): Promise<void> {
  for (const [name, client] of clientPool.entries()) {
    try {
      await client.close();
      logger.info(`[MCPGateway] Disconnected from ${name}`);
    } catch {
      // Best-effort cleanup
    }
  }
  clientPool.clear();
}
