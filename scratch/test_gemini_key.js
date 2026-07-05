const https = require('https');
const fs = require('fs');

let apiKey = process.env.GEMINI_API_KEY;
if (!apiKey && fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const match = envContent.match(/^GEMINI_API_KEY=(.*)$/m);
    if (match) {
        apiKey = match[1].trim();
    }
}

if (!apiKey) {
    console.error('Error: GEMINI_API_KEY is not defined in .env');
    process.exit(1);
}

const data = JSON.stringify({
    contents: [{
        parts: [{ text: 'Hello, are you online? Respond with a very short yes.' }]
    }]
});

const options = {
    hostname: 'generativelanguage.googleapis.com',
    port: 443,
    path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

console.log('Testing Gemini API key connection...');

const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        if (res.statusCode === 200) {
            console.log('\n✅ SUCCESS: API Key is valid and working!');
            try {
                const json = JSON.parse(responseData);
                console.log('Gemini says:', json.candidates[0].content.parts[0].text.trim());
            } catch (e) {
                console.log('Raw response:', responseData);
            }
        } else {
            console.error(`\n❌ ERROR: API returned status ${res.statusCode}`);
            console.error('Details:', responseData);
        }
    });
});

req.on('error', (error) => {
    console.error('\n❌ ERROR: Request failed');
    console.error(error);
});

req.write(data);
req.end();
