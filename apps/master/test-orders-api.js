// Quick test to check orders API response
const baseUrl = 'http://localhost:8090';

async function testOrders() {
    try {
        const response = await fetch(`${baseUrl}/api/collections/orders/records?page=1&perPage=50&sort=-created`);
        const data = await response.json();

        console.log('Orders API Response:');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2).substring(0, 500));
        console.log('\nTotal Items:', data.totalItems || data.length || 'unknown');
        console.log('Items array:', data.items ? `${data.items.length} items` : 'No items array');

        if (data.items && data.items.length > 0) {
            console.log('\nFirst item:', JSON.stringify(data.items[0], null, 2));
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testOrders();
