/**
 * Create Test Order Script
 * Creates a test order with sample photos for testing the customer gallery
 */

const DatabaseManager = require('./db');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../pb_data');
const DB_FILE = path.join(DATA_DIR, 'data.db');

// Sample photo URLs (using placeholder images)
const SAMPLE_PHOTOS = [
    { id: 'photo1', title: 'Beautiful Sunset', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800' },
    { id: 'photo2', title: 'Mountain Landscape', url: 'https://images.unsplash.com/photo-1464822759844-d150ad8496f5?w=800' },
    { id: 'photo3', title: 'Ocean View', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=800' },
    { id: 'photo4', title: 'Forest Path', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800' },
    { id: 'photo5', title: 'City Skyline', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800' },
    { id: 'photo6', title: 'Desert Dunes', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=800' },
    { id: 'photo7', title: 'Lakeside View', url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800' },
    { id: 'photo8', title: 'Mountain Peak', url: 'https://images.unsplash.com/photo-1464822759844-d150ad8496f5?w=800' },
];

async function createTestOrder() {
    const dbManager = new DatabaseManager(DB_FILE);
    dbManager.connect(); // Initialize database connection
    
    try {
        // Check if order already exists
        const existingOrder = dbManager.get('SELECT * FROM orders WHERE id = ?', ['ORD-001']);
        
        if (existingOrder) {
            console.log('Test order ORD-001 already exists. Skipping creation.');
            return;
        }

        // Create order items with photos
        const orderItems = SAMPLE_PHOTOS.map((photo, index) => ({
            id: `item-${index + 1}`,
            name: `Digital Download - ${photo.title}`,
            format: 'Digital',
            quantity: 1,
            price: 15.00,
            photo: {
                id: photo.id,
                albumId: 'test-album',
                title: photo.title,
                url: photo.url,
                photographerId: 1,
            }
        }));

        const total = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Insert order
        const orderSql = `INSERT INTO orders (id, date, clientName, email, status, total, photographerId, destinationId, items, appliedDiscount)
                          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        
        const orderDate = new Date().toISOString().split('T')[0];
        
        dbManager.run(orderSql, [
            'ORD-001',
            orderDate,
            'John Doe',
            'john@example.com',
            'Completed',
            total,
            1,
            'dest1',
            JSON.stringify(orderItems),
            0
        ]);

        console.log('✅ Test order created successfully!');
        console.log('   Order ID: ORD-001');
        console.log('   Email: john@example.com');
        console.log('   Photos: ' + SAMPLE_PHOTOS.length);
        console.log('\nYou can now login to the customer portal with:');
        console.log('   Order ID: ORD-001');
        console.log('   Email: john@example.com');
        
    } catch (error) {
        console.error('❌ Error creating test order:', error);
        throw error;
    }
}

// Run the script
createTestOrder()
    .then(() => {
        console.log('\n✨ Test data setup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Failed to create test order:', error);
        process.exit(1);
    });

