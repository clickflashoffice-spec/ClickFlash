// Test photos API endpoint directly
const baseUrl = 'http://localhost:8090';

async function testPhotosAPI() {
    try {
        // First, get an album ID
        const albumsResp = await fetch(`${baseUrl}/api/collections/albums/records?perPage=1&sort=-created`);
        const albumsData = await albumsResp.json();

        if (!albumsData.items || albumsData.items.length === 0) {
            console.log('No albums found');
            return;
        }

        const albumId = albumsData.items[0].id;
        console.log(`Testing with album ID: ${albumId}`);
        console.log(`Album name: ${albumsData.items[0].name || 'Unnamed'}`);

        // Fetch photos for this album
        const photosResp = await fetch(`${baseUrl}/api/collections/photos/records?filter=albumId="${albumId}"&perPage=5&sort=-created`);
        const photosData = await photosResp.json();

        console.log(`\nPhotos API Response:`);
        console.log(`Total photos: ${photosData.totalItems || 0}`);
        console.log(`Returned: ${photosData.items?.length || 0} photos`);

        if (photosData.items && photosData.items.length > 0) {
            const photo = photosData.items[0];
            console.log(`\nFirst photo:`);
            console.log(`  id: ${photo.id}`);
            console.log(`  url: ${photo.url}`);
            console.log(`  thumbnailUrl: ${photo.thumbnailUrl || 'NULL'}`);
            console.log(`  tinyUrl: ${photo.tinyUrl || 'NULL'}`);
            console.log(`  previewUrl: ${photo.previewUrl || 'NULL'}`);

            // Test if thumbnail file exists
            if (photo.thumbnailUrl) {
                const thumbUrl = `${baseUrl}/api/files/photos/${photo.id}/${photo.thumbnailUrl}`;
                console.log(`\nTesting thumbnail URL: ${thumbUrl}`);
                const thumbResp = await fetch(thumbUrl);
                console.log(`Thumbnail response: ${thumbResp.status} ${thumbResp.statusText}`);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testPhotosAPI();
