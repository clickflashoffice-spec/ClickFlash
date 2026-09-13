import { handleYieldSimulator, handleAbandonedCartScan } from './apps/backend/mcp-server/src/revenue.js';
import { handleCompetitorScan } from './apps/backend/mcp-server/src/competitor.js';

async function run() {
    console.log(await handleCompetitorScan({ targetCompetitor: 'all' }));
    console.log(await handleCompetitorScan({ targetCompetitor: 'disney' }));
    console.log(await handleCompetitorScan({ targetCompetitor: 'pomvom' }));

    console.log(await handleYieldSimulator({ basePrice: 20.00, crowdDensity: 'high', timeOfDay: 'midday', weather: 'sunny' }));
    console.log(await handleYieldSimulator({ basePrice: 20.00, crowdDensity: 'peak', timeOfDay: 'evening', weather: 'sunny' }));
}

run();
