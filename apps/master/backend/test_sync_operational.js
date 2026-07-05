import { logger } from "@/utils/logger";
const fetch = require('node-fetch');

const HUB_URL = 'http://localhost:8092';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXNrX2lkIjoiTUFTVEVSX1RFU1RfMDEiLCJpYXQiOjE3NDE5NjMzODJ9.D9v2sF7yYpLp_uP--axWIi3--FNqAQZz5G7KzAbMhE8';

async function testSync() {
    logger.info('Testing Diagnostic Sync...');
    
    // 1. Test Yield
    const yieldRes = await fetch(`${HUB_URL}/api/sync/cloud/sync/yield`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
            stats: [{
                date: new Date().toISOString().split('T')[0],
                total_orders: 10,
                paid_orders: 8,
                avg_order_value: 125.5
            }]
        })
    });
    logger.info('Yield Sync Status:', yieldRes.status);

    // 2. Test Triage
    const triageRes = await fetch(`${HUB_URL}/api/sync/cloud/sync/triage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
            timestamp: new Date().toISOString(),
            metrics: {
                cpu_temp: 55,
                disk_io: "Normal",
                latency: 12,
                memory_pressure: 45
            }
        })
    });
    logger.info('Triage Sync Status:', triageRes.status);
    
    if (yieldRes.ok && triageRes.ok) {
        logger.info('SUCCESS: Diagnostic Bridge is Operational');
    } else {
        logger.info('FAILURE: Diagnostic Bridge Issues Detected');
        if (yieldRes.status === 401 || triageRes.status === 401) {
            logger.info('Reason: Authorization Failed (401). Check JWT_SECRET match.');
        }
    }
}

testSync();
