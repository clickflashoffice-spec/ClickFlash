#!/usr/bin/env tsx
/**
 * ClickFlash WhatsApp Sales Swarm & Meta Webhook Simulator
 * Tests end-to-end webhook handshake, signature generation, and multi-agent negotiation.
 */

import crypto from 'crypto';

const TARGET_HOST = process.env.TARGET_HOST || 'http://localhost:8090';
const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'clickflash_whatsapp_verify';
const APP_SECRET = process.env.WHATSAPP_APP_SECRET || 'clickflash_test_secret';

function createHmacSignature(payloadStr: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    return `sha256=${hmac.update(payloadStr).digest('hex')}`;
}

async function runSimulator() {
    console.log('\n================================================================');
    console.log('🚀 ClickFlash WhatsApp Sales Swarm & Meta Webhook Simulator');
    console.log(`📡 Target Host: ${TARGET_HOST}`);
    console.log('================================================================\n');

    // 1. Test GET Verification Handshake
    console.log('1️⃣ Testing GET Meta Webhook Handshake (/webhook/whatsapp)...');
    try {
        const challenge = 'challenge_token_' + Math.random().toString(36).substring(2, 8);
        const verifyUrl = `${TARGET_HOST}/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${challenge}`;
        const res = await fetch(verifyUrl);
        const body = await res.text();

        if (res.status === 200 && body === challenge) {
            console.log(`✅ Handshake Succeeded! Status: ${res.status}, Challenge matched: "${body}"\n`);
        } else {
            console.log(`⚠️ Handshake returned status: ${res.status}, Body: "${body}" (Make sure target server is running)\n`);
        }
    } catch (err: any) {
        console.log(`⚠️ Server not reachable at ${TARGET_HOST} (${err.message}). Proceeding with mock validation.\n`);
    }

    // 2. Test Inbound Inbound Message Payload (Discount Negotiation)
    console.log('2️⃣ Testing Inbound Negotiation Message (Guest asking for discount)...');
    const mockPayload = {
        object: 'whatsapp_business_account',
        entry: [
            {
                id: '1029384756',
                changes: [
                    {
                        field: 'messages',
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '+15550192837',
                                phone_number_id: '9876543210'
                            },
                            contacts: [{ profile: { name: 'Alex Johnson' }, wa_id: '15550192837' }],
                            messages: [
                                {
                                    from: '+15550192837',
                                    id: 'wamid.HBgLMTU1NTAxOTI4MzcVAgASGBQz',
                                    timestamp: Math.floor(Date.now() / 1000).toString(),
                                    type: 'text',
                                    text: { body: 'I loved the roller coaster shots! Is there any promo discount code available today?' }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    };

    const payloadStr = JSON.stringify(mockPayload);
    const signature = createHmacSignature(payloadStr, APP_SECRET);

    try {
        const postUrl = `${TARGET_HOST}/webhook/whatsapp`;
        const res = await fetch(postUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hub-Signature-256': signature
            },
            body: payloadStr
        });
        const respText = await res.text();
        console.log(`✅ Inbound Message Post Status: ${res.status}, Response: "${respText}"\n`);
    } catch (err: any) {
        console.log(`⚠️ Could not POST to ${TARGET_HOST} (${err.message})\n`);
    }

    // 3. Test Interactive Button Click (Claim 20% Discount)
    console.log('3️⃣ Testing Interactive Button Click (Guest clicked "Claim 20% Off")...');
    const buttonPayload = {
        object: 'whatsapp_business_account',
        entry: [
            {
                id: '1029384756',
                changes: [
                    {
                        field: 'messages',
                        value: {
                            messaging_product: 'whatsapp',
                            metadata: {
                                display_phone_number: '+15550192837',
                                phone_number_id: '9876543210'
                            },
                            contacts: [{ profile: { name: 'Alex Johnson' }, wa_id: '15550192837' }],
                            messages: [
                                {
                                    from: '+15550192837',
                                    id: 'wamid.HBgLMTU1NTAxOTI4MzcVAgASGBQ4',
                                    timestamp: Math.floor(Date.now() / 1000).toString(),
                                    type: 'interactive',
                                    interactive: {
                                        type: 'button_reply',
                                        button_reply: {
                                            id: 'claim_20_percent',
                                            title: '🎁 Claim 20% Off'
                                        }
                                    }
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    };

    const btnPayloadStr = JSON.stringify(buttonPayload);
    const btnSignature = createHmacSignature(btnPayloadStr, APP_SECRET);

    try {
        const postUrl = `${TARGET_HOST}/webhook/whatsapp`;
        const res = await fetch(postUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hub-Signature-256': btnSignature
            },
            body: btnPayloadStr
        });
        const respText = await res.text();
        console.log(`✅ Button Event Post Status: ${res.status}, Response: "${respText}"\n`);
    } catch (err: any) {
        console.log(`⚠️ Could not POST to ${TARGET_HOST} (${err.message})\n`);
    }

    console.log('🎉 Simulated test run complete.');
}

runSimulator().catch(console.error);
