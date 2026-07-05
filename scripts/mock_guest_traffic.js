/**
 * Mock Guest Traffic Generator
 * Simulates random bookings and photo uploads to test the ClickFlash ecosystem under load.
 */

const crypto = require('crypto');
const fs = require('fs');

const NUM_GUESTS = 5;

console.log(`[Simulator] Generating ${NUM_GUESTS} mock guest bookings...`);

function generateMockBooking() {
    return {
        id: crypto.randomUUID(),
        guestName: `Guest_${Math.floor(Math.random() * 1000)}`,
        email: `guest${Math.floor(Math.random() * 1000)}@example.com`,
        phone: `+1555${Math.floor(Math.random() * 9000000 + 1000000)}`,
        bookingId: `RES-${Math.floor(Math.random() * 90000 + 10000)}`,
        timestamp: new Date().toISOString()
    };
}

const bookings = [];
for (let i = 0; i < NUM_GUESTS; i++) {
    bookings.push(generateMockBooking());
}

// Write the mock data so the backend could pick it up if it was listening to a mock directory
fs.writeFileSync('mock_bookings.json', JSON.stringify(bookings, null, 2));
console.log('[Simulator] Mock bookings saved to mock_bookings.json');

console.log('[Simulator] Simulating photo uploads every 5 seconds...');
let count = 0;
const interval = setInterval(() => {
    count++;
    const photoId = `IMG_${Math.floor(Math.random() * 9000 + 1000)}.jpg`;
    console.log(`[Simulator] 📸 Captured photo ${photoId} for booking ${bookings[Math.floor(Math.random() * bookings.length)].bookingId}`);
    
    if (count >= 10) {
        clearInterval(interval);
        console.log('[Simulator] Traffic generation complete.');
    }
}, 5000);
