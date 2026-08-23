# ADR-007: Autonomous Swarm Multi-Agent Orchestration Architecture

## Status
Accepted

## Context
Resort photography operations operate in high-velocity, dynamic environments with fluctuating guest foot traffic, varying photo quality, diverse purchasing habits, and multi-location field photographers. Traditional static pricing and manual sales desks suffer from low conversion (typically 12-18%), high abandoned cart rates, and inefficient staff allocation.

## Decision
ClickFlash implements an autonomous 8-Agent Swarm operating across the Edge Node (`apps/desktop/master`) and the Executive Command Center (`apps/management`):

1. **CEO Agent (`CeoAgent.ts`)**: Top-level executive synthesis agent that ingests telemetry from all subordinate agents and produces concise 3-sentence director briefings and automated high-impact directives.
2. **Sales Analyst Agent (`aiSalesOrchestrator.ts`)**: Evaluates guest engagement metrics (album opens, favorites, duration) to score lead purchase intent and trigger automated outreach.
3. **Closer Agent (`aiSalesOrchestrator.ts`)**: Crafts hyper-personalized, urgency-driven WhatsApp and transactional email pitches with dynamic discount codes (e.g., `MEMORIES20`) and instant magic gallery links.
4. **Negotiator Agent (`NegotiatorAgent.ts`)**: Real-time conversational agent that handles incoming guest replies via WhatsApp Business API, negotiates counter-offers based on photo `aiSalvageScore`, and handles pricing objections.
5. **Dynamic Pricing Agent (`PricingAgent.ts`)**: Computes real-time yield curves and surge pricing adjustments based on crowd density, weather conditions, time-of-day, and park throughput.
6. **Hotspot Agent (`HotspotAgent.ts`)**: Analyzes BLE/UWB beacon telemetry and queue dwell times to detect crowd bottlenecks and dispatch photographers dynamically.
7. **Staffing Agent (`StaffingAgent.ts`)**: Plans photographer shifts, balances capture volume across zones, and monitors fatigue/throughput metrics.
8. **Spy / Compliance Agent (`SpyAgent.ts`)**: Scans concession operations for revenue leakage, off-book transactions, and competitor pricing differentials.

## Consequences
- **Positive**:
  - Boosts album conversion rates from ~15% to 45%+ through zero-friction WhatsApp magic links and AI-driven conversational negotiation.
  - Reallocates field photographers in real-time to peak-density attractions without manual supervisor oversight.
  - Automatically recovers abandoned carts with dynamic time-limited incentives.
- **Negative**:
  - Requires strict guardrails on LLM discount limits (e.g. max 50% discount cap) to avoid margin erosion.
  - Requires integration with WhatsApp Cloud API and webhook infrastructure.
