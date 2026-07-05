// scripts/mock_guest_traffic.ts
import { randomUUID } from 'crypto';

const MASTER_API = 'http://127.0.0.1:8090/api';

async function triggerHardware() {
    try {
        const payload = {
            sensorId: `SN-${Math.floor(Math.random() * 100)}`,
            rideId: `RIDE-${Math.floor(Math.random() * 5)}`,
            timestamp: new Date().toISOString()
        };
        const res = await fetch(`${MASTER_API}/hardware/trigger`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            console.log(`[Hardware] Triggered ${payload.rideId} via ${payload.sensorId}`);
        } else {
            console.error(`[Hardware] Failed:`, await res.text());
        }
    } catch (e: any) {
        console.error(`[Hardware] Error:`, e.message);
    }
}

async function uploadMockPhoto() {
    try {
        const payload = {
            id: randomUUID(),
            albumId: null,
            originalFilename: `DSC_${Math.floor(Math.random() * 9999)}.JPG`,
            url: `/uploads/mock/DSC_${Math.floor(Math.random() * 9999)}.JPG`
        };
        const res = await fetch(`${MASTER_API}/collections/photos/records`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            console.log(`[Photos] Uploaded metadata for ${payload.originalFilename}`);
        } else {
            console.error(`[Photos] Failed:`, await res.text());
        }
    } catch (e: any) {
        console.error(`[Photos] Error:`, e.message);
    }
}

async function startSimulation() {
    console.log("===================================");
    console.log("  CLICKFLASH SYNTHETIC TRAFFIC GEN ");
    console.log("===================================");
    
    // Simulate 1 trigger every 2 seconds
    setInterval(triggerHardware, 2000);
    
    // Simulate 1 photo upload metadata every 5 seconds
    setInterval(uploadMockPhoto, 5000);
}

startSimulation();
