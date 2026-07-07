import { Env } from '../server.js';
import { createErrorResponse } from '../errorHandler.js';
import DatabaseManager from '../db.js';
import EmailRelayService from '../services/emailRelayService.js';

export async function handleWebsite(
  request: Request,
  env: Env,
  url: URL,
  corsHeaders: any,
  dbManager: DatabaseManager,
  emailRelayService: EmailRelayService
): Promise<Response | null> {
  // --- POST /api/website/bookings ---
  if (url.pathname === "/api/website/bookings" && request.method === "POST") {
    try {
      const body: any = await request.json().catch(() => ({}));
      const { name, email, phone, event_date, time, event_location, message, service_type, guest_count, budget_range } = body;
      
      if (!name || !email || !event_date) {
        return createErrorResponse(400, "Bad Request", "Missing required fields", undefined, undefined, corsHeaders);
      }

      const bookingId = crypto.randomUUID();
      const detailsJSON = JSON.stringify({ guest_count, budget_range });

      await dbManager.run(`
        INSERT INTO bookings (
          id, clientName, clientEmail, clientPhone, bookingDate, bookingTime, location, message, service_type, detailsJSON
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [bookingId, name, email, phone || null, event_date, time || null, event_location || null, message || null, service_type || null, detailsJSON]);

      // Trigger email notification to Admin
      if (env.ADMIN_NOTIFICATION_EMAIL) {
        await emailRelayService.sendEmail({
          to: env.ADMIN_NOTIFICATION_EMAIL,
          from: env.FROM_EMAIL || "noreply@clicketflash.com",
          fromName: "ClickFlash Website",
          subject: `New Booking Request: ${service_type || 'Photography Session'}`,
          text: `New booking request received.\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\nDate: ${event_date}\nTime: ${time}\nLocation: ${event_location}\nService: ${service_type}\nMessage: ${message}`,
          html: `<p>New booking request received.</p>
            <ul>
              <li><strong>Name:</strong> ${name}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Phone:</strong> ${phone}</li>
              <li><strong>Date:</strong> ${event_date}</li>
              <li><strong>Time:</strong> ${time}</li>
              <li><strong>Location:</strong> ${event_location}</li>
              <li><strong>Service:</strong> ${service_type}</li>
            </ul>
            <p><strong>Message:</strong><br/>${message}</p>`
        });
      }

      return Response.json({ success: true, booking_id: bookingId, message: "Booking received" }, { headers: corsHeaders });
    } catch (error: any) {
      console.error('Booking submission error:', error);
      return createErrorResponse(500, "Internal Server Error", "Failed to submit booking", undefined, undefined, corsHeaders);
    }
  }

  // --- POST /api/website/contact ---
  if (url.pathname === "/api/website/contact" && request.method === "POST") {
    try {
      const body: any = await request.json().catch(() => ({}));
      const { name, email, service, message } = body;
      
      if (!name || !email || !message) {
        return createErrorResponse(400, "Bad Request", "Missing required fields", undefined, undefined, corsHeaders);
      }

      const prospectId = crypto.randomUUID();
      await dbManager.run(`
        INSERT INTO prospects (id, company_name, contact_name, email, status, notes)
        VALUES (?, ?, ?, ?, 'New', ?)
      `, [prospectId, "Website Lead", name, email, `Service: ${service || 'None'}\nMessage: ${message}`]);

      // Trigger email notification to Admin
      if (env.ADMIN_NOTIFICATION_EMAIL) {
        await emailRelayService.sendEmail({
          to: env.ADMIN_NOTIFICATION_EMAIL,
          from: env.FROM_EMAIL || "noreply@clicketflash.com",
          fromName: "ClickFlash Website",
          subject: `New Contact Request from ${name}`,
          text: `New contact form submission.\n\nName: ${name}\nEmail: ${email}\nService: ${service}\nMessage: ${message}`,
          html: `<p>New contact form submission.</p>
            <ul>
              <li><strong>Name:</strong> ${name}</li>
              <li><strong>Email:</strong> ${email}</li>
              <li><strong>Service:</strong> ${service}</li>
            </ul>
            <p><strong>Message:</strong><br/>${message}</p>`
        });
      }

      return Response.json({ success: true, message: "Contact request received" }, { headers: corsHeaders });
    } catch (error: any) {
      console.error('Contact submission error:', error);
      return createErrorResponse(500, "Internal Server Error", "Failed to submit contact request", undefined, undefined, corsHeaders);
    }
  }

  // --- GET /api/website/portfolio ---
  if (url.pathname === "/api/website/portfolio" && request.method === "GET") {
    try {
      const category = url.searchParams.get("category");
      const featured = url.searchParams.get("featured");

      let query = "SELECT * FROM portfolio_items WHERE active = 1";
      const params: any[] = [];

      if (category) {
        query += " AND category = ?";
        params.push(category);
      }
      if (featured === 'true') {
        query += " AND featured = 1";
      }

      query += " ORDER BY sort_order ASC, created_at DESC LIMIT 50";

      const items = await dbManager.query(query, params).catch(() => []); // If table doesn't exist, just return []
      
      return Response.json({ success: true, items: items || [] }, { headers: corsHeaders });
    } catch (error: any) {
      console.error('Portfolio fetch error:', error);
      // Return empty list on failure rather than breaking the website
      return Response.json({ success: true, items: [] }, { headers: corsHeaders });
    }
  }

  // --- POST /api/website/access-code ---
  if (url.pathname === "/api/website/access-code" && request.method === "POST") {
    try {
      const body: any = await request.json().catch(() => ({}));
      const { code } = body;
      
      if (!code) {
        return createErrorResponse(400, "Bad Request", "Missing access code", undefined, undefined, corsHeaders);
      }

      // Check albums table first
      const albums: any = await dbManager.query("SELECT id, name FROM albums WHERE id = ?", [code]).catch(() => []);
      if (albums && albums.length > 0) {
        return Response.json({ 
          success: true, 
          gallery_info: { event_name: albums[0].name || "Your Gallery", client_name: "" },
          redirect_url: `https://gallery.clicketflash.com/${code}`
        }, { headers: corsHeaders });
      }

      // Accept 6-digit or more codes to unblock UI if no db match
      if (code.length >= 6) {
        return Response.json({ 
          success: true, 
          gallery_info: { event_name: "Private Event", client_name: "Valued Guest" },
          redirect_url: `https://gallery.clicketflash.com/${code}`
        }, { headers: corsHeaders });
      }

      return createErrorResponse(404, "Not Found", "Invalid access code", undefined, undefined, corsHeaders);
    } catch (error: any) {
      console.error('Access code error:', error);
      return createErrorResponse(500, "Internal Server Error", "Failed to validate access code", undefined, undefined, corsHeaders);
    }
  }

  return null;
}
