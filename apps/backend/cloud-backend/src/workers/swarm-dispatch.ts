/**
 * ClickFlash Cloud Backend Worker - Swarm Dispatch AI
 * Analyzes park/resort foot traffic, transaction velocity, and historical data 
 * to predictively dispatch photographers to the most profitable locations.
 */

export interface LocationData {
    id: string;
    name: string;
    currentFootTraffic: number; // 0 to 100
    recentTransactions: number; // Count in the last 15 mins
    activePhotographers: number;
}

export interface DispatchAction {
    photographerId: string;
    targetLocationId: string;
    reason: string;
}

export class SwarmDispatchAI {
    
    /**
     * Calculates the optimal dispatch strategy for a fleet of photographers.
     */
    public calculateOptimalDispatch(locations: LocationData[], availablePhotographers: string[]): DispatchAction[] {
        console.log(`[SwarmDispatchAI] Analyzing ${locations.length} locations and ${availablePhotographers.length} idle photographers...`);
        
        const actions: DispatchAction[] = [];
        
        // Calculate a "profitability score" for each location
        const scoredLocations = locations.map(loc => {
            // Profitability = High foot traffic + High transactions - Already saturated with photographers
            const saturationPenalty = loc.activePhotographers * 20;
            const score = (loc.currentFootTraffic * 0.6) + (loc.recentTransactions * 2.0) - saturationPenalty;
            return { ...loc, score };
        }).sort((a, b) => b.score - a.score); // Highest score first

        // Dispatch idle photographers to the top scoring locations
        let photographerIndex = 0;
        
        for (const location of scoredLocations) {
            // If the location has a high score (> 50) and needs more coverage
            if (location.score > 50 && photographerIndex < availablePhotographers.length) {
                const photographerId = availablePhotographers[photographerIndex];
                
                actions.push({
                    photographerId,
                    targetLocationId: location.id,
                    reason: `High profitability score (${location.score.toFixed(1)}). Current traffic: ${location.currentFootTraffic}, Active shooters: ${location.activePhotographers}`
                });
                
                photographerIndex++;
            }
        }

        console.log(`[SwarmDispatchAI] Generated ${actions.length} dispatch actions.`);
        return actions;
    }
}

export const swarmDispatchAI = new SwarmDispatchAI();
