import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { logger } from "./logger.js";

export const getWhatsappTools = (): Tool[] => [
  {
    name: "whatsapp_send_magic_link",
    description: "Sends a passwordless magic link to a guest's WhatsApp when their gallery is ready. Zero-friction delivery.",
    inputSchema: {
      type: "object",
      properties: {
        guestPhone: { type: "string", description: "Guest phone number in E.164 format (e.g., +34612345678)." },
        galleryUrl: { type: "string", description: "URL to the guest's gallery." },
        guestName: { type: "string", description: "Optional guest name for personalization." }
      },
      required: ["guestPhone", "galleryUrl"]
    }
  },
  {
    name: "whatsapp_campaign_status",
    description: "Returns active WhatsApp campaign stats: messages sent, opened, clicked, converted, revenue attributed.",
    inputSchema: {
      type: "object",
      properties: {
        campaignId: { type: "string", description: "Optional campaign ID. Defaults to latest." }
      },
      required: []
    }
  },
  {
    name: "sales_swarm_deploy",
    description: "Deploys the AnalystAgent → CloserAgent → NegotiatorAgent pipeline on a specific gallery/lead to recover abandoned sales.",
    inputSchema: {
      type: "object",
      properties: {
        guestId: { type: "string", description: "Guest profile ID to target." },
        galleryId: { type: "string", description: "Gallery ID with unpurchased photos." },
        maxDiscount: { type: "number", description: "Maximum discount percentage the NegotiatorAgent can offer. Default: 25.", minimum: 0, maximum: 50 }
      },
      required: ["guestId", "galleryId"]
    }
  },
  {
    name: "lead_scoring",
    description: "Scores a guest lead (0-100) based on gallery view count, time spent, photos viewed, return visits.",
    inputSchema: {
      type: "object",
      properties: {
        guestId: { type: "string", description: "Guest profile ID to score." }
      },
      required: ["guestId"]
    }
  }
];

export async function handleWhatsappSendMagicLink(args: Record<string, unknown>) {
  const phone = args.guestPhone as string;
  const url = args.galleryUrl as string;
  const name = (args.guestName as string) || "Guest";
  logger.info(`[WhatsApp] Sending magic link to ${phone}`);

  // In production, this calls the WhatsApp Business API
  const report = [
    `=== WHATSAPP MAGIC LINK ===`,
    `Recipient: ${name} (${phone})`,
    `Gallery URL: ${url}`,
    ``,
    `Message Template:`,
    `"Hi ${name}! 📸 Your photos from today are ready! Tap to view your gallery: ${url}"`,
    ``,
    `Status: READY_TO_SEND`,
    `Delivery: WhatsApp Business API → Template Message → Magic Link (no password needed)`,
    ``,
    `⚠️ Requires WHATSAPP_API_TOKEN in environment variables.`
  ].join("\n");

  return { content: [{ type: "text", text: report }] };
}

export async function handleWhatsappCampaignStatus(args: Record<string, unknown>) {
  const campaignId = (args.campaignId as string) || "latest";
  logger.info(`[WhatsApp] Campaign status for ${campaignId}`);

  const report = [
    `=== WHATSAPP CAMPAIGN STATUS ===`,
    `Campaign: ${campaignId}`,
    ``,
    `Campaign analytics require the WhatsApp Business API webhook integration.`,
    ``,
    `Tracked Metrics:`,
    `• Messages Sent / Delivered / Read`,
    `• Link Click-Through Rate`,
    `• Gallery View → Purchase Conversion`,
    `• Revenue Attributed to Campaign`,
    `• Opt-Out Rate`,
    ``,
    `Configure webhook endpoint in apps/backend/cloud-backend/src/webhooks/whatsapp.ts`
  ].join("\n");

  return { content: [{ type: "text", text: report }] };
}

export async function handleSalesSwarmDeploy(args: Record<string, unknown>) {
  const guestId = args.guestId as string;
  const galleryId = args.galleryId as string;
  const maxDiscount = (args.maxDiscount as number) || 25;
  logger.info(`[WhatsApp] Deploying sales swarm for guest ${guestId}, gallery ${galleryId}`);

  const report = [
    `=== SALES SWARM DEPLOYMENT ===`,
    `Target Guest: ${guestId}`,
    `Target Gallery: ${galleryId}`,
    `Max Discount Authority: ${maxDiscount}%`,
    ``,
    `--- Agent Pipeline ---`,
    `1. 📊 AnalystAgent: Analyzes guest behavior, identifies purchase triggers`,
    `2. 🎯 CloserAgent: Crafts personalized WhatsApp message with urgency hooks`,
    `3. 🤝 NegotiatorAgent: If no conversion in 2h, offers progressive discounts (5% → ${maxDiscount}%)`,
    ``,
    `--- Escalation Rules ---`,
    `• After 3 messages with no response: Mark as COLD, stop messaging`,
    `• If guest replies "stop": Immediately opt-out, comply with regulations`,
    `• If guest asks question: Route to human operator via Management Hub`,
    ``,
    `Status: SWARM_READY — Deploy via Redis Stream event 'sales:swarm:deploy'`
  ].join("\n");

  return { content: [{ type: "text", text: report }] };
}

export async function handleLeadScoring(args: Record<string, unknown>) {
  const guestId = args.guestId as string;
  logger.info(`[WhatsApp] Lead scoring for guest ${guestId}`);

  const report = [
    `=== LEAD SCORE: ${guestId} ===`,
    ``,
    `Scoring requires guest activity data in the Master DB.`,
    ``,
    `--- Scoring Rubric (0-100) ---`,
    `• Gallery Views: 0-3 views (+5 each, max 15)`,
    `• Time on Gallery: <30s (+5), 30s-2m (+10), >2m (+20)`,
    `• Photos Viewed: 1-5 (+5), 6-15 (+15), >15 (+25)`,
    `• Return Visits: Each return (+10, max 20)`,
    `• Added to Cart: +20`,
    ``,
    `--- Score Tiers ---`,
    `0-20: COLD — Do not message`,
    `21-50: WARM — Send gallery reminder in 24h`,
    `51-75: HOT — Deploy CloserAgent immediately`,
    `76-100: BURNING — Deploy full Sales Swarm with discount authority`
  ].join("\n");

  return { content: [{ type: "text", text: report }] };
}
