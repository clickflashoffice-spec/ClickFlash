import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "@clickflash/logger";

export interface CompetitorProfile {
  name: string;
  strengths: string[];
  weaknesses: string[];
  clickflashAdvantage: string[];
  threatLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export const COMPETITORS: Record<string, CompetitorProfile> = {
  dei: {
    name: "DEI (DigiPhoto Entertainment Imaging)",
    threatLevel: "HIGH",
    strengths: ["Massive global resort footprint (Atlantis, Universal, Burj Khalifa)", "Deep enterprise contracts"],
    weaknesses: ["Heavy human labor dependency", "Slow cloud sync", "Outdated QR/wristband linking", "High operational overhead"],
    clickflashAdvantage: ["Autonomous AI culling replaces editors", "Zero-friction biometric selfie linking", "Dynamic yield pricing"]
  },
  pomvom: {
    name: "Pomvom",
    threatLevel: "HIGH",
    strengths: ["High-speed roller coaster recognition", "Strong UK/US theme park presence"],
    weaknesses: ["Requires app download or QR linking", "Inflexible pricing tiers", "Cloud-dependent latency"],
    clickflashAdvantage: ["Offline-first C++ VP-Tree vector search (<2s)", "WhatsApp Magic Link delivery without app install"]
  },
  fotiqo: {
    name: "Fotiqo",
    threatLevel: "MEDIUM",
    strengths: ["Modern management dashboard UI", "Multi-venue gallery portal"],
    weaknesses: ["No embedded edge AI", "Lacks WhatsApp negotiation swarm", "Standard photo booth model"],
    clickflashAdvantage: ["Autonomous WhatsApp sales agents (Negotiator/Closer)", "MoneyTrash VLM photo salvage"]
  },
  disney: {
    name: "Disney PhotoPass",
    threatLevel: "MEDIUM",
    strengths: ["MagicBand ecosystem integration", "Iconic IP character magic shots"],
    weaknesses: ["Walled garden closed ecosystem", "Extremely expensive proprietary infrastructure", "Zero exportability to third-party resorts"],
    clickflashAdvantage: ["Turnkey monorepo deployment for any resort/park", "Low-cost edge compute running on consumer hardware"]
  }
};

export const getCompetitorTools = (): Tool[] => [
  {
    name: "competitor_scan",
    description: "Competitor Analyser: Audits the ClickFlash ecosystem against major industry rivals (DEI, Pomvom, Fotiqo, Disney PhotoPass) and returns actionable competitive gaps, feature moats, and strategic battlecards.",
    inputSchema: {
      type: "object",
      properties: {
        targetCompetitor: {
          type: "string",
          enum: ["all", "dei", "pomvom", "fotiqo", "disney"],
          description: "Specific competitor to benchmark against, or 'all' for full ecosystem analysis."
        }
      },
      required: []
    }
  },
  {
    name: "competitor_moat_plan",
    description: "Generates an actionable technical feature plan specifically designed to surpass a competitor's key advantage.",
    inputSchema: {
      type: "object",
      properties: {
        competitor: {
          type: "string",
          enum: ["dei", "pomvom", "fotiqo", "disney"],
          description: "Target competitor to out-compete."
        },
        focusArea: {
          type: "string",
          enum: ["linking_speed", "yield_revenue", "edge_offline", "hardware_cost", "ai_culling"],
          description: "Strategic vector to attack."
        }
      },
      required: ["competitor", "focusArea"]
    }
  },
  {
    name: "find_better_ideas",
    description: "Mocks scraping competitor changelogs to find better features we should build.",
    inputSchema: {
      type: "object",
      properties: {
        competitor: {
          type: "string",
          enum: ["dei", "pomvom", "fotiqo", "disney"],
          description: "Target competitor to scrape."
        }
      },
      required: ["competitor"]
    }
  }
];

export async function handleCompetitorScan(args: Record<string, unknown>) {
  const target = (args.targetCompetitor as string) || "all";
  logger.info(`[CompetitorAnalyser] Running scan for target: ${target}`);

  if (target !== "all" && COMPETITORS[target]) {
    const comp = COMPETITORS[target];
    const report = [
      `=== COMPETITIVE BATTLECARD: ${comp.name.toUpperCase()} ===`,
      `Threat Level: ${comp.threatLevel}`,
      ``,
      `--- Competitor Strengths ---`,
      ...comp.strengths.map(s => `• ${s}`),
      ``,
      `--- Competitor Vulnerabilities ---`,
      ...comp.weaknesses.map(w => `• ${w}`),
      ``,
      `--- ClickFlash Moat & Differentiators ---`,
      ...comp.clickflashAdvantage.map(a => `⭐ ${a}`)
    ].join("\n");

    return { content: [{ type: "text", text: report }] };
  }

  const allReport = [
    `=== CLICKFLASH GLOBAL COMPETITIVE INTELLIGENCE REPORT ===`,
    `Evaluation Date: ${new Date().toISOString().split("T")[0]}`,
    ``,
    `1. DEI (DigiPhoto): Leading on enterprise venue count, failing on AI automation and labor costs.`,
    `   → ClickFlash Attack: Pitch zero-labor AI culling (MoneyTrash) and biometric linking to park operators.`,
    ``,
    `2. POMVOM: Leading on high-speed coaster capture, failing on friction (app download required).`,
    `   → ClickFlash Attack: Deliver instant WhatsApp magic links with C++ VP-Tree sub-second indexing.`,
    ``,
    `3. FOTIQO: Leading on clean management UI, failing on edge intelligence and revenue recovery.`,
    `   → ClickFlash Attack: Leverage ClickFlash WhatsApp Closer/Negotiator Swarm to achieve 35%+ higher yield.`,
    ``,
    `4. DISNEY PHOTOPASS: High customer attachment, but locked into proprietary $100M infrastructure.`,
    `   → ClickFlash Attack: Offer resort operators equivalent Magic Shots and automated linking for 1/10th the Capex.`
  ].join("\n");

  return { content: [{ type: "text", text: allReport }] };
}

export async function handleFindBetterIdeas(args: Record<string, unknown>) {
  const competitor = args.competitor as string;
  const mockChangelogs: Record<string, string[]> = {
    dei: [
      "Released: Basic AI framing assistant (still requires human editor).",
      "We should build: Fully autonomous AI culling pipeline that completely eliminates the human editor."
    ],
    pomvom: [
      "Released: New iOS app update with slightly faster photo sync.",
      "We should build: WebRTC-based instant preview directly to browser without any app installation."
    ],
    fotiqo: [
      "Released: Improved dashboard metrics for park managers.",
      "We should build: Autonomous AI CEO dashboard that automatically runs yield optimization experiments."
    ],
    disney: [
      "Released: MagicBand+ integration for automatic ride photo linking.",
      "We should build: UWB and BLE passive linking using standard smartphones, requiring no proprietary hardware."
    ]
  };

  const ideas = mockChangelogs[competitor.toLowerCase()] || ["No recent changelogs found.", "We should build: Something fundamentally better."];
  
  const report = [
    `=== Competitor Changelog Scraping: ${competitor.toUpperCase()} ===`,
    ...ideas.map(idea => `• ${idea}`)
  ].join("\n");

  return { content: [{ type: "text", text: report }] };
}
