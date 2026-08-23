import { PromptBuilder } from './PromptBuilder.js';
import { AgentTools } from './AgentTools.js';
import { GoogleGenAI, Type } from '@google/genai';

/**
 * Master Agent Orchestrator
 * Connects the PromptBuilder to the Gemini API and handles the tool execution loop.
 */
export class AgentOrchestrator {
  private builder: PromptBuilder;
  private ai: GoogleGenAI;
  
  constructor(apiKey: string) {
    this.builder = new PromptBuilder();
    // Initialize the official Gemini SDK
    this.ai = new GoogleGenAI({ apiKey });
  }

  async runTask(userPrompt: string) {
    console.log("🤖 Booting ClickFlash Autonomous Agent (Gemini Engine)...");
    
    // 1. Compile the System Prompt
    const systemPrompt = await this.builder.buildMasterSystemPrompt();
    console.log(`[System Prompt Loaded: ${systemPrompt.length} characters]`);
    
    // 2. Define MCP-style tools for Gemini
    const agentTools: any[] = [{
      functionDeclarations: [
        {
          name: "executeCommand",
          description: "Executes shell commands. Use this to run npm run typecheck:all or other Turborepo commands.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              command: { type: Type.STRING, description: "The shell command to run" },
              cwd: { type: Type.STRING, description: "The directory to run it in (default: project root)" }
            },
            required: ["command"]
          }
        },
        {
          name: "readTurborepoFile",
          description: "Reads a file within the Turborepo securely.",
          parameters: {
            type: Type.OBJECT,
            properties: {
              filePath: { type: Type.STRING, description: "Relative path to the file" }
            },
            required: ["filePath"]
          }
        },
        {
          name: "querySQLiteQueue",
          description: "Queries the local Edge SQLite Queue (DbWriteQueue.ts backend).",
          parameters: {
            type: Type.OBJECT,
            properties: {
              query: { type: Type.STRING, description: "The SQL query to execute" }
            },
            required: ["query"]
          }
        }
      ]
    }];

    console.log(`[Task Received]: ${userPrompt}`);
    console.log("⚙️  Sending task to Gemini (Model: gemini-2.5-pro)...");

    try {
      // 3. Initialize Chat Session with Tools and System Instructions
      const chat = this.ai.chats.create({
        model: 'gemini-2.5-pro', 
        config: {
          systemInstruction: systemPrompt,
          tools: agentTools,
          temperature: 0.2, // Low temp for analytical coding tasks
        }
      });

      // 4. Send Message and handle tool calls
      let response = await chat.sendMessage({ message: userPrompt });

      // Execution loop (handles up to 5 consecutive tool calls)
      let loopCount = 0;
      while (response.functionCalls && response.functionCalls.length > 0 && loopCount < 5) {
        loopCount++;
        
        for (const call of response.functionCalls) {
          console.log(`🛠️  Agent called tool: ${call.name}(${JSON.stringify(call.args)})`);
          
          let toolResult = "";
          if (call.name === "executeCommand") {
            const args = call.args as { command: string; cwd?: string };
            toolResult = await AgentTools.executeCommand(args.command, args.cwd);
          } else if (call.name === "readTurborepoFile") {
            const args = call.args as { filePath: string };
            toolResult = await AgentTools.readTurborepoFile(args.filePath);
          } else if (call.name === "querySQLiteQueue") {
            const args = call.args as { query: string };
            toolResult = await AgentTools.querySQLiteQueue(args.query);
          }

          console.log(`✅ Tool returned ${toolResult.length} bytes of data.`);
          
          // 5. Send the tool result back to Gemini so it can continue thinking
          response = await chat.sendMessage({
            message: [{
              functionResponse: {
                name: call.name,
                response: { result: toolResult }
              }
            }]
          });
        }
      }

      if (loopCount >= 5) {
        console.log("⚠️ Reached maximum tool loop limit (5). Forcing final answer.");
      }

      return response.text;
    } catch (error) {
      console.error("❌ LLM Execution Error:", error);
      throw error;
    }
  }
}
