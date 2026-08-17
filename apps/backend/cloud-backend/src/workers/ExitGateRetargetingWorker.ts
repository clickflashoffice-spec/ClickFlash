export interface Env {
  DB: D1Database;
  WHATSAPP_API_TOKEN: string;
  WHATSAPP_PHONE_NUMBER_ID: string;
}

export interface GeofenceEvent {
  guestId: string;
  gateId: string;
  timestamp: number;
  unpurchasedPhotosCount: number;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const event = (await request.json()) as GeofenceEvent;

      if (!event.guestId || !event.gateId) {
        return new Response('Invalid event data', { status: 400 });
      }

      // Calculate dynamic discount based on unpurchased photos
      let discountPercentage = 0;
      if (event.unpurchasedPhotosCount > 10) {
        discountPercentage = 30; // 30% off for high volume
      } else if (event.unpurchasedPhotosCount > 0) {
        discountPercentage = 15; // 15% off for low volume
      } else {
        return new Response('No unpurchased photos, no retargeting needed', { status: 200 });
      }

      // Fetch guest phone number from D1 Database
      // Using type 'any' for D1Database mock type if it doesn't exist
      const guestRecord = await (env.DB as any).prepare(
        'SELECT phone_number FROM guests WHERE id = ?'
      ).bind(event.guestId).first();

      if (!guestRecord || !guestRecord.phone_number) {
        return new Response('Guest phone number not found', { status: 404 });
      }

      // Generate Magic Link
      const magicLink = `https://clickflash.app/gallery/${event.guestId}?discount=${discountPercentage}`;

      // Push Magic Link to WhatsApp CRM
      const whatsappPayload = {
        messaging_product: 'whatsapp',
        to: guestRecord.phone_number,
        type: 'template',
        template: {
          name: 'exit_gate_retargeting',
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: `${discountPercentage}%` },
                { type: 'text', text: magicLink }
              ]
            }
          ]
        }
      };

      const whatsappResponse = await fetch(
        `https://graph.facebook.com/v17.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.WHATSAPP_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(whatsappPayload)
        }
      );

      if (!whatsappResponse.ok) {
        const errorText = await whatsappResponse.text();
        console.error('WhatsApp API Error:', errorText);
        return new Response('Failed to send WhatsApp message', { status: 500 });
      }

      return new Response('Retargeting payload sent successfully', { status: 200 });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
};
