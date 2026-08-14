import axios from 'axios';
async function test() {
    try {
        const payload = {
            object: 'whatsapp_business_account',
            entry: [{
                id: '12345',
                changes: [{
                    value: {
                        messaging_product: 'whatsapp',
                        metadata: {
                            display_phone_number: '12345',
                            phone_number_id: '12345'
                        },
                        contacts: [{
                            profile: { name: 'Test User' },
                            wa_id: '+1234567890'
                        }],
                        messages: [{
                            from: '+1234567890',
                            id: 'wamid.test',
                            timestamp: '1692285141',
                            text: { body: 'Hello I am interested in my photos from today' },
                            type: 'text'
                        }]
                    },
                    field: 'messages'
                }]
            }]
        };
        const res = await axios.post('http://localhost:8090/api/webhook/whatsapp', payload);
        console.log('Response:', res.status, res.data);
    } catch (e) {
        console.error(e.message);
    }
}
test();
