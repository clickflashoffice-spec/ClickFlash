import { z } from "zod";

import type { Env } from "../server.js";

type RateLimitCheck = (
  db: any,
  ip: string,
  endpoint: string,
  limit: number,
  windowMs: number,
) => Promise<boolean>;

const contactSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  service: z.string().trim().max(120).optional(),
  message: z.string().trim().min(1).max(5_000),
});

const bookingSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254),
  phone: z.string().trim().max(40).optional(),
  service_type: z.string().trim().min(1).max(120),
  event_date: z.string().trim().min(1).max(40),
  event_location: z.string().trim().max(240).optional(),
  guest_count: z.string().trim().max(40).optional(),
  budget_range: z.string().trim().max(80).optional(),
  message: z.string().trim().min(1).max(5_000),
});

const accessCodeSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{6,64}$/),
});

function jsonResponse(
  body: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function escapeEmailHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"'`/]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "`": "&#96;",
    "/": "&#x2F;",
  })[character] || character);
}

function galleryAlbumUrl(env: Env, albumId: string): string {
  const base = String(
    env.GALLERY_PUBLIC_URL || "https://gallery.clickflash.com/gallery/",
  ).replace(/\/+$/, "");
  return `${base}/${encodeURIComponent(albumId)}`;
}

export async function handleWebsiteApi(
  request: Request,
  pathName: string,
  env: Env,
  corsHeaders: Record<string, string>,
  checkRateLimit: RateLimitCheck,
): Promise<Response | null> {
  if (pathName === "/api/website/portfolio" && request.method === "GET") {
    const url = new URL(request.url);
    const category = url.searchParams.get("category");
    const featured = url.searchParams.get("featured") === "true";
    const params: string[] = [];
    let query = `
      SELECT id, title, category, description, image_url, thumbnail_url,
             featured, sort_order
      FROM portfolio_items
      WHERE active = 1`;

    if (category && category !== "All") {
      query += " AND category = ?";
      params.push(category);
    }
    if (featured) query += " AND featured = 1";
    query += " ORDER BY sort_order ASC, created_at DESC LIMIT 50";

    const result = await env.WEBSITE_DB.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, items: result.results || [] }, 200, corsHeaders);
  }

  if (pathName === "/api/website/access-code" && request.method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (!await checkRateLimit(env.WEBSITE_DB, ip, "website-access-code", 10, 600_000)) {
      return jsonResponse(
        { error: "Rate limit exceeded", message: "Too many access attempts. Please try again later." },
        429,
        { ...corsHeaders, "Retry-After": "600" },
      );
    }

    const parsed = accessCodeSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validation Error", message: "Access code must contain 6-64 letters, numbers, or hyphens" },
        400,
        corsHeaders,
      );
    }

    const accessCode = await env.WEBSITE_DB.prepare(
      `SELECT album_id FROM access_codes
       WHERE code = ? AND is_active = 1
         AND (expires_at IS NULL OR expires_at > datetime('now'))`,
    ).bind(parsed.data.code).first() as { album_id?: string } | null;

    const albumId = String(accessCode?.album_id || "").trim();
    if (!albumId) {
      return jsonResponse(
        { error: "Invalid Code", message: "Invalid or expired access code" },
        404,
        corsHeaders,
      );
    }

    return jsonResponse({
      success: true,
      gallery_info: { event_name: "Your Gallery", client_name: "Guest" },
      redirect_url: galleryAlbumUrl(env, albumId),
    }, 200, corsHeaders);
  }

  if (pathName === "/api/website/contact" && request.method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (!await checkRateLimit(env.WEBSITE_DB, ip, "website-contact", 5, 600_000)) {
      return jsonResponse(
        { error: "Rate limit exceeded", message: "Too many requests. Please try again later." },
        429,
        { ...corsHeaders, "Retry-After": "600" },
      );
    }

    const parsed = contactSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validation Error", message: "Enter a valid name, email, and message" },
        400,
        corsHeaders,
      );
    }

    const { name, email, service, message } = parsed.data;
    await env.WEBSITE_DB.prepare(
      `INSERT INTO contact_submissions (name, email, service, message)
       VALUES (?, ?, ?, ?)`,
    ).bind(name, email.toLowerCase(), service || null, message).run();

    return jsonResponse({ success: true, message: "Message received" }, 201, corsHeaders);
  }

  if (pathName === "/api/website/bookings" && request.method === "POST") {
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
    if (!await checkRateLimit(env.WEBSITE_DB, ip, "website-bookings", 3, 600_000)) {
      return jsonResponse(
        { error: "Rate limit exceeded", message: "Too many booking requests. Please try again later." },
        429,
        { ...corsHeaders, "Retry-After": "600" },
      );
    }

    const parsed = bookingSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return jsonResponse(
        { error: "Validation Error", message: "Enter valid booking details" },
        400,
        corsHeaders,
      );
    }

    const booking = parsed.data;
    const result = await env.WEBSITE_DB.prepare(
      `INSERT INTO bookings
       (name, email, phone, service_type, event_date, event_location, message, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    ).bind(
      booking.name,
      booking.email.toLowerCase(),
      booking.phone || null,
      booking.service_type,
      booking.event_date,
      booking.event_location || null,
      booking.message,
    ).run();

    if (env.RESEND_API_KEY && env.ADMIN_NOTIFICATION_EMAIL && env.FROM_EMAIL) {
      const html = `
        <h2>New Booking Request</h2>
        <p><strong>Name:</strong> ${escapeEmailHtml(booking.name)}</p>
        <p><strong>Email:</strong> ${escapeEmailHtml(booking.email)}</p>
        <p><strong>Phone:</strong> ${escapeEmailHtml(booking.phone || "—")}</p>
        <p><strong>Service:</strong> ${escapeEmailHtml(booking.service_type)}</p>
        <p><strong>Date:</strong> ${escapeEmailHtml(booking.event_date)}</p>
        <p><strong>Location:</strong> ${escapeEmailHtml(booking.event_location || "—")}</p>
        <p><strong>Message:</strong> ${escapeEmailHtml(booking.message)}</p>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: env.FROM_EMAIL,
          to: [env.ADMIN_NOTIFICATION_EMAIL],
          reply_to: booking.email,
          subject: `New Booking — ${booking.name} (${booking.service_type})`,
          html,
        }),
      }).catch(() => undefined);
    }

    return jsonResponse({
      success: true,
      booking_id: result.meta?.last_row_id ? String(result.meta.last_row_id) : undefined,
      message: "Booking received",
    }, 201, corsHeaders);
  }

  return null;
}
