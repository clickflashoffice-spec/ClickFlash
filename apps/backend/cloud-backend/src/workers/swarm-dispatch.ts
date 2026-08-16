/**
 * ClickFlash Cloud Backend Worker - Swarm Dispatch AI
 * Analyzes park/resort foot traffic, transaction velocity, and historical data 
 * to predictively dispatch photographers to the most profitable locations.
 */
import type { HotspotPrediction } from '@clickflash/types';

export interface LocationData {
    id: string;
    name: string;
    currentFootTraffic: number; // 0 to 100
    recentTransactions: number; // Count in the last 15 mins
    activePhotographers: number;
}

export class SwarmDispatchAI {
    
    /**
     * Calculates the optimal dispatch strategy and generates HotspotPredictions.
     */
    public calculateOptimalDispatch(locations: LocationData[], availablePhotographers: string[]): HotspotPrediction[] {
        console.log(`[SwarmDispatchAI] Analyzing ${locations.length} locations and ${availablePhotographers.length} idle photographers...`);
        
        const predictions: HotspotPrediction[] = [];
        
        // Calculate a "profitability score" for each location
        const scoredLocations = locations.map(loc => {
            // Profitability = High foot traffic + High transactions - Already saturated with photographers
            const saturationPenalty = loc.activePhotographers * 20;
            const score = (loc.currentFootTraffic * 0.6) + (loc.recentTransactions * 2.0) - saturationPenalty;
            return { ...loc, score };
        }).sort((a, b) => b.score - a.score); // Highest score first

        // Generate predictive hotspots for top scoring locations
        for (const location of scoredLocations) {
            if (location.score > 50) {
                const recommendedCount = Math.ceil(location.currentFootTraffic / 50);
                
                const prediction: HotspotPrediction = {
                    destinationId: 'DEFAULT_DEST',
                    predictionId: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `pred-${Date.now()}-${Math.random()}`,
                    generatedAt: new Date().toISOString(),
                    predictedHotZones: [{
                        zoneId: location.id,
                        predictedCrowdDensity: location.currentFootTraffic > 80 ? 'High' : 'Medium',
                        confidenceScore: Math.min(location.score / 100, 0.99),
                        startTime: new Date().toISOString(),
                        endTime: new Date(Date.now() + 60 * 60000).toISOString(),
                        recommendedPhotographers: recommendedCount
                    }],
                    aiModelVersion: 'v2.1'
                };
                
                predictions.push(prediction);
            }
        }

        console.log(`[SwarmDispatchAI] Generated ${predictions.length} HotspotPredictions.`);
        
        if (predictions.length > 0) {
            this.pushPredictions(predictions).catch(err => console.error(err));
        }
        
        return predictions;
    }

    /**
     * Pushes HotspotPredictions to the edge node Webhook (simulating Cloudflare Queue/MQTT dispatch)
     */
    private async pushPredictions(predictions: HotspotPrediction[]) {
        console.log(`[SwarmDispatchAI] Pushing ${predictions.length} predictions to stream...`);
        
        const edgeWebhookUrl = (typeof process !== 'undefined' && process.env?.EDGE_WEBHOOK_URL) || 'http://localhost:8090/api/webhooks/dispatch';

        for (const p of predictions) {
            try {
                const response = await fetch(edgeWebhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event: 'hotspot_prediction', data: p })
                });

                if (!response.ok) {
                    console.error(`[SwarmDispatchAI] Failed to push prediction ${p.predictionId}. HTTP Status: ${response.status}`);
                } else {
                    console.log(`[SwarmDispatchAI] Pushed prediction ${p.predictionId} for zone ${p.predictedHotZones[0].zoneId}`);
                }
            } catch (err: any) {
                console.error(`[SwarmDispatchAI] Exception pushing prediction ${p.predictionId}: ${err.message}`);
            }
        }
    }
}

export const swarmDispatchAI = new SwarmDispatchAI();
