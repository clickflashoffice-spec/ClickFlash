import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { 
  PromptBuilder, 
  AgentOrchestrator, 
  YieldArbitrageEngine, 
  VisionBridge, 
  EdgeSentinel,
  type GuestCart,
  type PhotoQualityMetrics
} from "@clickflash/ai";
import { logger } from "./logger.js";

/**
 * ClickFlash Autonomous Agent & Extensions MCP Tools
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
  },
  {
    name: "calculate_yield_offer",
    description: "Calculates time-decay dynamic discounts and generates high-converting WhatsApp recovery pitches for abandoned guest carts.",
    inputSchema: {
      type: "object",
      properties: {
        guestId: { type: "string", description: "Unique identifier for the guest." },
        guestName: { type: "string", description: "Name of the guest." },
        resortName: { type: "string", description: "Resort or park location name." },
        photoCount: { type: "number", description: "Number of photos captured." },
        basePrice: { type: "number", description: "Original base price of album." },
        hoursSinceAbandonment: { type: "number", description: "Hours elapsed since cart abandonment." },
        activityType: { type: "string", description: "Resort activity or ride name." },
        isVip: { type: "boolean", description: "Whether the guest is VIP." }
      },
      required: ["guestId", "guestName", "resortName", "photoCount", "basePrice", "hoursSinceAbandonment"]
    }
  },
  {
    name: "match_face_embedding",
    description: "Calculates cosine similarity and verifies if a guest selfie embedding matches a photo album embedding using ArcFace thresholds.",
    inputSchema: {
      type: "object",
      properties: {
        selfieEmbedding: {
          type: "array",
          items: { type: "number" },
          description: "512-dimensional floating point embedding of the guest selfie."
        },
        candidateEmbedding: {
          type: "array",
          items: { type: "number" },
          description: "512-dimensional floating point embedding of the candidate photo."
        },
        threshold: {
          type: "number",
          description: "Optional threshold for match verification (defaults to 0.68)."
        }
      },
      required: ["selfieEmbedding", "candidateEmbedding"]
    }
  },
  {
    name: "evaluate_photo_culling",
    description: "Evaluates photo quality (sharpness, exposure, blink detection, composition) and assigns a professional grade (A+, A, B, C, REJECT).",
    inputSchema: {
      type: "object",
      properties: {
        photoId: { type: "string", description: "Photo identifier." },
        sharpnessScore: { type: "number", description: "Sharpness score (0-100)." },
        exposureScore: { type: "number", description: "Exposure score (0-100)." },
        compositionScore: { type: "number", description: "Composition score (0-100)." },
        eyesOpenConfidence: { type: "number", description: "Confidence eyes are open (0.0 - 1.0)." },
        smileConfidence: { type: "number", description: "Confidence smile is detected (0.0 - 1.0)." },
        faceCount: { type: "number", description: "Number of faces detected in photo." }
      },
      required: ["photoId", "sharpnessScore", "exposureScore", "compositionScore", "eyesOpenConfidence", "smileConfidence", "faceCount"]
    }
  },
  {
    name: "get_edge_sentinel_status",
    description: "Inspects the real-time health and self-healing state of the Edge Sentinel daemon.",
    inputSchema: {
      type: "object",
      properties: {}
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

export async function handleCalculateYieldOffer(args: Record<string, unknown>) {
  const cart: GuestCart = {
    guestId: String(args.guestId || ""),
    guestName: String(args.guestName || ""),
    resortName: String(args.resortName || ""),
    photoCount: Number(args.photoCount || 0),
    basePrice: Number(args.basePrice || 0),
    hoursSinceAbandonment: Number(args.hoursSinceAbandonment || 0),
    activityType: args.activityType ? String(args.activityType) : undefined,
    isVip: Boolean(args.isVip)
  };

  const offer = YieldArbitrageEngine.calculateOffer(cart);
  const pitch = YieldArbitrageEngine.formatWhatsAppPitch(cart, offer);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify({ offer, whatsAppPitch: pitch }, null, 2)
      }
    ]
  };
}

export async function handleMatchFaceEmbedding(args: Record<string, unknown>) {
  const selfie = (args.selfieEmbedding as number[]) || [];
  const candidate = (args.candidateEmbedding as number[]) || [];
  const threshold = typeof args.threshold === 'number' ? args.threshold : 0.68;

  const result = VisionBridge.matchFace(selfie, candidate, threshold);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

export async function handleEvaluatePhotoCulling(args: Record<string, unknown>) {
  const metrics: PhotoQualityMetrics = {
    photoId: String(args.photoId || ""),
    sharpnessScore: Number(args.sharpnessScore || 0),
    exposureScore: Number(args.exposureScore || 0),
    compositionScore: Number(args.compositionScore || 0),
    eyesOpenConfidence: Number(args.eyesOpenConfidence || 0),
    smileConfidence: Number(args.smileConfidence || 0),
    faceCount: Number(args.faceCount || 0)
  };

  const result = VisionBridge.evaluateCulling(metrics);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

export async function handleGetEdgeSentinelStatus(args: Record<string, unknown>) {
  const sentinel = new EdgeSentinel();
  await sentinel.checkHealth();
  const status = sentinel.getStatus();

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(status, null, 2)
      }
    ]
  };
}
