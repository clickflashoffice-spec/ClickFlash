async function runTests() {
    console.log('--- ClickFlash Meta Webhook Test ---');
    console.log('Testing WhatsApp Webhook Delivery (Negotiator Agent)...');
    
    const mockWebhookPayload = {
        object: "whatsapp_business_account",
        entry: [{
            id: "1234567890",
            changes: [{
                value: {
                    messaging_product: "whatsapp",
                    metadata: {
                        display_phone_number: "16505551111",
                        phone_number_id: "123456123456"
                    },
                    contacts: [{
                        profile: {
                            name: "John Doe"
                        },
                        wa_id: "1234567890"
                    }],
                    messages: [{
                        from: "1234567890",
                        id: "wamid.HBgLMTY1MDU1NTExMTEVAgASGCQzNTQ2QUJDREUwMTIzNDU2Nzg5QQ==",
                        timestamp: "1603059201",
                        text: {
                            body: "Are the photos high resolution? I might buy them."
                        },
                        type: "text"
                    }]
                },
                field: "messages"
            }]
        }]
    };

    console.log('Sending mock webhook payload to http://localhost:8090/webhook/whatsapp ...');
    
    try {
        const response = await fetch('http://localhost:8090/webhook/whatsapp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mockWebhookPayload)
        });

        if (response.ok) {
            console.log('Webhook delivered successfully! Status:', response.status);
            const text = await response.text();
            console.log('Response body:', text);
        } else {
            console.log('Webhook failed. Status:', response.status);
            console.log('Ensure the Master App backend is running on port 8090.');
        }
    } catch (e) {
        console.log('Error delivering webhook. Make sure the server is running on port 8090:', e instanceof Error ? e.message : String(e));
    }

    console.log('\n--- Tests Finished ---');
}

runTests();
