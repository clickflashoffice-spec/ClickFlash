const fetch = require('node-fetch');

const HUB_URL = 'http://localhost:8092';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkZXNrX2lkIjoiTUFTVEVSX1RFU1RfMDEiLCJpYXQiOjE3NDE5NjMzODJ9.D9v2sF7yYpLp_uP--axWIi3--FNqAQZz5G7KzAbMhE8';

async function testSync() {
    console.log('Testing Diagnostic Sync...');
    
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
    console.log('Yield Sync Status:', yieldRes.status);

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
    console.log('Triage Sync Status:', triageRes.status);
    
    if (yieldRes.ok && triageRes.ok) {
        console.log('SUCCESS: Diagnostic Bridge is Operational');
    } else {
        console.log('FAILURE: Diagnostic Bridge Issues Detected');
        if (yieldRes.status === 401 || triageRes.status === 401) {
            console.log('Reason: Authorization Failed (401). Check JWT_SECRET match.');
        }
    }
}

testSync();
