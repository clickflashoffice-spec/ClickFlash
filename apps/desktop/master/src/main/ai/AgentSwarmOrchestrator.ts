import { logger } from '@/utils/logger';
import { masterDb } from '../db/MasterDatabase';

/**
 * ClickFlash Autonomous Agent Swarm (Pillar 2)
 * 
 * The Orchestrator manages a decentralized swarm of AI agents that run
 * the business operations of the theme park photography ecosystem.
 * It removes human operators from routing, pricing, and dispatch.
 */

interface AgentState {
  id: string;
  role: 'dispatch' | 'pricing' | 'maintenance' | 'support';
  status: 'idle' | 'thinking' | 'acting' | 'error';
  lastActionAt: number;
}

export class AgentSwarmOrchestrator {
  private agents: Map<string, AgentState> = new Map();
  private loopInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.registerAgent('agent-dispatch-01', 'dispatch');
    this.registerAgent('agent-pricing-01', 'pricing');
    this.registerAgent('agent-maintenance-01', 'maintenance');
  }

  private registerAgent(id: string, role: AgentState['role']) {
    this.agents.set(id, {
      id,
      role,
      status: 'idle',
      lastActionAt: Date.now()
    });
  }

  /**
   * Starts the autonomous background evaluation loop.
   * Agents will continuously read park APIs (weather, queues, hardware status)
   * and take autonomous actions.
   */
  public async startSwarm() {
    if (this.loopInterval) return;
    
    logger.info('[AgentSwarmOrchestrator] Waking up autonomous agent swarm...');
    
    // Ensure DB is initialized before agents start logging
    await masterDb.initialize();

    this.loopInterval = setInterval(() => {
      this.evaluateEnvironment();
    }, 15000); // 15-second tick rate for the swarm
  }

  public stopSwarm() {
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
  }

  /**
   * Main evaluation tick for the agent swarm.
   */
  private async evaluateEnvironment() {
    for (const [id, agent] of this.agents.entries()) {
      if (agent.status === 'thinking' || agent.status === 'acting') continue;

      agent.status = 'thinking';
      
      try {
        switch (agent.role) {
          case 'dispatch':
            await this.runDispatchAgent(agent);
            break;
          case 'pricing':
            await this.runPricingAgent(agent);
            break;
          case 'maintenance':
            await this.runMaintenanceAgent(agent);
            break;
        }
      } catch (err) {
        logger.error(`[AgentSwarmOrchestrator] Agent ${id} failed:`, err);
        agent.status = 'error';
      } finally {
        if (agent.status !== 'error') agent.status = 'idle';
        agent.lastActionAt = Date.now();
      }
    }
  }

  // --- Deepened Agent Implementations ---

  private async runDispatchAgent(agent: AgentState) {
    // 1. Evaluate local attraction zones based on simulated/live sensor telemetry and photo capture velocity
    const zones = [
      { id: 'zone-castle-plaza', name: 'Castle Plaza', crowdDensity: 0.85, activePhotographers: 2, recommendedPhotographers: 4 },
      { id: 'zone-splash-rapids', name: 'Splash Rapids Exit', crowdDensity: 0.45, activePhotographers: 3, recommendedPhotographers: 2 },
      { id: 'zone-roller-coaster', name: 'Apex Coaster Entrance', crowdDensity: 0.92, activePhotographers: 1, recommendedPhotographers: 4 }
    ];

    const criticalZones = zones.filter(z => z.crowdDensity > 0.80 && z.activePhotographers < z.recommendedPhotographers);

    if (criticalZones.length > 0) {
      const targetZone = criticalZones[0];
      const deficit = targetZone.recommendedPhotographers - targetZone.activePhotographers;
      logger.info(`[DispatchAgent] High crowd density (${(targetZone.crowdDensity * 100).toFixed(0)}%) at ${targetZone.name}. Dispatching ${deficit} roving photographer(s).`);
      
      masterDb.logAgentAction(agent.id, 'dispatch_action', {
        action: 'rebalance_roving_units',
        target_zone: targetZone.id,
        zone_name: targetZone.name,
        density_score: targetZone.crowdDensity,
        dispatched_units: deficit,
        status: 'dispatched'
      });
    } else {
      logger.info(`[DispatchAgent] Evaluating crowd flow across ${zones.length} zones... All zones optimally staffed.`);
      masterDb.logAgentAction(agent.id, 'evaluation', { status: 'no_action', reason: 'crowds_and_staffing_balanced', zones_checked: zones.length });
    }
  }

  private async runPricingAgent(agent: AgentState) {
    // 1. Evaluate local environmental drivers (weather sensor, queue wait times, and time of day)
    const currentHour = new Date().getHours();
    const isGoldenHour = currentHour >= 17 && currentHour <= 19;
    
    // Simulated local weather & queue state
    const localTelemetry = {
      weather: Math.random() > 0.85 ? 'rain' : 'clear',
      averageQueueWaitMinutes: Math.floor(Math.random() * 45) + 25
    };

    let baseDigitalPrice = 25.00;
    let multiplier = 1.0;
    const appliedFactors: string[] = [];

    if (localTelemetry.weather === 'rain') {
      multiplier *= 0.80; // 20% discount during rain to boost indoor/kiosk conversions
      appliedFactors.push('weather_rain_discount_20pct');
    } else if (isGoldenHour && localTelemetry.weather === 'clear') {
      multiplier *= 1.15; // 15% surge during peak sunset scenic lighting
      appliedFactors.push('golden_hour_scenic_surge_15pct');
    }

    if (localTelemetry.averageQueueWaitMinutes > 50) {
      appliedFactors.push('high_queue_wait_bundle_incentive');
    }

    const calculatedPrice = Math.round(baseDigitalPrice * multiplier * 100) / 100;

    if (multiplier !== 1.0) {
      logger.info(`[PricingAgent] Dynamic pricing active: $${calculatedPrice} (${appliedFactors.join(', ')}).`);
      masterDb.logAgentAction(agent.id, 'pricing_update', {
        base_price: baseDigitalPrice,
        new_price: calculatedPrice,
        multiplier,
        factors: appliedFactors,
        queue_wait_mins: localTelemetry.averageQueueWaitMinutes
      });
    } else {
      logger.info(`[PricingAgent] Environmental conditions standard ($${baseDigitalPrice}). Holding price.`);
      masterDb.logAgentAction(agent.id, 'pricing_hold', {
        current_price: baseDigitalPrice,
        reason: 'standard_conditions',
        queue_wait_mins: localTelemetry.averageQueueWaitMinutes
      });
    }
  }

  private async runMaintenanceAgent(agent: AgentState) {
    // 1. Ping local touch kiosks and update telemetry in MasterDatabase
    const sampleKiosks = [
      { id: 'kiosk-01', status: 'nominal', paperLevel: Math.floor(Math.random() * 60) + 40, temp: Math.floor(Math.random() * 15) + 45 },
      { id: 'kiosk-02', status: 'nominal', paperLevel: Math.floor(Math.random() * 20) + 10, temp: Math.floor(Math.random() * 10) + 52 }, // low paper
      { id: 'kiosk-03', status: 'nominal', paperLevel: Math.floor(Math.random() * 50) + 50, temp: Math.floor(Math.random() * 10) + 76 }  // high temp
    ];

    const warnings: Array<{ kiosk_id: string; issue: string; severity: 'warning' | 'critical' }> = [];

    for (const kiosk of sampleKiosks) {
      let finalStatus = kiosk.status;
      if (kiosk.paperLevel < 15) {
        finalStatus = 'warning_low_paper';
        warnings.push({ kiosk_id: kiosk.id, issue: `Paper level at ${kiosk.paperLevel}%`, severity: 'warning' });
      }
      if (kiosk.temp > 75) {
        finalStatus = 'warning_high_temp';
        warnings.push({ kiosk_id: kiosk.id, issue: `CPU temp at ${kiosk.temp}°C`, severity: 'critical' });
      }

      masterDb.updateKioskHealth(kiosk.id, finalStatus, kiosk.paperLevel, kiosk.temp);
    }

    if (warnings.length > 0) {
      logger.warn(`[MaintenanceAgent] Detected ${warnings.length} hardware warnings across ${sampleKiosks.length} kiosks.`);
      masterDb.logAgentAction(agent.id, 'hardware_alert', {
        kiosks_checked: sampleKiosks.length,
        warnings_count: warnings.length,
        warnings
      });
    } else {
      logger.info(`[MaintenanceAgent] All ${sampleKiosks.length} kiosks checked and nominal.`);
      masterDb.logAgentAction(agent.id, 'health_check', {
        kiosks_checked: sampleKiosks.length,
        status: 'all_nominal'
      });
    }
  }
}

export const swarmOrchestrator = new AgentSwarmOrchestrator();
