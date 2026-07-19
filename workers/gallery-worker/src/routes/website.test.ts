import { jest } from "@jest/globals";

import { escapeEmailHtml, handleWebsiteApi } from "./website.js";

const statement: any = {
  bind: jest.fn(),
  all: jest.fn(),
  first: jest.fn(),
  run: jest.fn(),
};
statement.bind.mockReturnValue(statement);

const websiteDb = {
  prepare: jest.fn(() => statement),
};

const createEnv = (overrides: Record<string, unknown> = {}): any => ({
  WEBSITE_DB: websiteDb,
  GALLERY_PUBLIC_URL: "https://gallery.clickflash.com/gallery/",
  ...overrides,
});

const corsHeaders = { "Access-Control-Allow-Origin": "https://clickflash.com" };
const allowRequest = jest.fn(async () => true);

describe("canonical Website API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    statement.bind.mockReturnValue(statement);
    allowRequest.mockResolvedValue(true);
  });

  it("returns the portfolio contract consumed by the Website", async () => {
    statement.all.mockResolvedValueOnce({
      results: [{ id: 1, title: "Sunset", featured: 1 }],
    });
    const request = new Request("https://api.example/api/website/portfolio?featured=true");

    const response = await handleWebsiteApi(
      request,
      "/api/website/portfolio",
      createEnv(),
      corsHeaders,
      allowRequest,
    );
    const data = await response?.json() as any;

    expect(response?.status).toBe(200);
    expect(data).toEqual({ success: true, items: [{ id: 1, title: "Sunset", featured: 1 }] });
  });

  it("rejects malformed access codes before querying access records", async () => {
    const request = new Request("https://api.example/api/website/access-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "../bad" }),
    });

    const response = await handleWebsiteApi(
      request,
      "/api/website/access-code",
      createEnv(),
      corsHeaders,
      allowRequest,
    );

    expect(response?.status).toBe(400);
    expect(websiteDb.prepare).not.toHaveBeenCalled();
  });

  it("rejects unknown or expired access codes", async () => {
    statement.first.mockResolvedValueOnce(null);
    const request = new Request("https://api.example/api/website/access-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "vip-2026-ch" }),
    });

    const response = await handleWebsiteApi(
      request,
      "/api/website/access-code",
      createEnv(),
      corsHeaders,
      allowRequest,
    );

    expect(response?.status).toBe(404);
    expect(statement.bind).toHaveBeenCalledWith("VIP-2026-CH");
  });

  it("returns only the configured online Gallery URL for a valid access code", async () => {
    statement.first.mockResolvedValueOnce({
      album_id: "album 42",
      redirect_url: "https://evil.example/redirect",
    });
    const request = new Request("https://api.example/api/website/access-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "VIP-2026-CH" }),
    });

    const response = await handleWebsiteApi(
      request,
      "/api/website/access-code",
      createEnv(),
      corsHeaders,
      allowRequest,
    );
    const data = await response?.json() as any;

    expect(response?.status).toBe(200);
    expect(data).toEqual({
      success: true,
      gallery_info: { event_name: "Your Gallery", client_name: "Guest" },
      redirect_url: "https://gallery.clickflash.com/gallery/album%2042",
    });
  });

  it("rate limits public access-code attempts", async () => {
    allowRequest.mockResolvedValueOnce(false);
    const request = new Request("https://api.example/api/website/access-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "VIP-2026-CH" }),
    });

    const response = await handleWebsiteApi(
      request,
      "/api/website/access-code",
      createEnv(),
      corsHeaders,
      allowRequest,
    );

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("600");
    expect(websiteDb.prepare).not.toHaveBeenCalled();
  });

  it("validates contact email before persistence", async () => {
    const request = new Request("https://api.example/api/website/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Guest", email: "invalid", message: "Hello" }),
    });

    const response = await handleWebsiteApi(
      request,
      "/api/website/contact",
      createEnv(),
      corsHeaders,
      allowRequest,
    );

    expect(response?.status).toBe(400);
    expect(websiteDb.prepare).not.toHaveBeenCalled();
  });

  it("escapes customer-controlled booking fields in notification email", async () => {
    statement.run.mockResolvedValueOnce({ meta: { last_row_id: 42 } });
    const fetchSpy = jest.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ id: "email-1" }), { status: 200 }),
    );
    const request = new Request("https://api.example/api/website/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Guest",
        email: "guest@example.com",
        service_type: "Portrait",
        event_date: "2026-08-01",
        message: '<img src=x onerror="alert(1)">',
      }),
    });

    const response = await handleWebsiteApi(
      request,
      "/api/website/bookings",
      createEnv({
        RESEND_API_KEY: "test-key",
        ADMIN_NOTIFICATION_EMAIL: "office@example.com",
        FROM_EMAIL: "bookings@example.com",
      }),
      corsHeaders,
      allowRequest,
    );
    const data = await response?.json() as any;
    const requestBody = JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body));

    expect(response?.status).toBe(201);
    expect(data.booking_id).toBe("42");
    expect(requestBody.html).not.toContain("<img");
    expect(requestBody.html).toContain("&lt;img");
  });

  it("escapes every HTML-sensitive character", () => {
    expect(escapeEmailHtml(`<>&"'\`/`)).toBe("&lt;&gt;&amp;&quot;&#x27;&#96;&#x2F;");
  });
});
