import { vi, describe, it, test, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { PhotographerCommandCenterV1Schema } from "@clickflash/types";
import Database from "better-sqlite3-multiple-ciphers";
import express from "express";
import request from "supertest";

import type { DatabaseManager } from "../database/db";
import photographerCommandCenterRoutes from "./photographerCommandCenter";

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe("Photographer self command center", () => {
  let app: express.Application;
  let database: Database.Database;

  beforeAll(() => {
    database = new Database(":memory:");
    database.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        monthlyTarget REAL,
        dailyPhotoTarget INTEGER
      );
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
      CREATE TABLE orders (
        id TEXT PRIMARY KEY,
        photographerId INTEGER,
        status TEXT,
        total REAL,
        tip_amount REAL,
        items TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE photos (
        id TEXT PRIMARY KEY,
        photographerId INTEGER,
        quality_score INTEGER,
        quality_flags TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE photographer_performance (
        photographer_id INTEGER,
        date TEXT,
        meetings_taken INTEGER,
        meetings_made INTEGER,
        total_session_seconds INTEGER,
        session_count INTEGER,
        updated_at TEXT
      );
      CREATE TABLE photographer_ledger (
        photographer_id TEXT,
        sync_status TEXT
      );
    `);
    const dbManager = {
      get: (sql: string, params: unknown[] = []) =>
        database.prepare(sql).get(...params),
      query: (sql: string, params: unknown[] = []) =>
        database.prepare(sql).all(...params),
      run: (sql: string, params: unknown[] = []) =>
        database.prepare(sql).run(...params),
      transaction: <T>(fn: () => T) => database.transaction(fn)(),
    } as DatabaseManager;

    app = express();
    app.use((req, _res, next) => {
      const id = req.header("x-test-user-id");
      if (id) req.user = { id, role: req.header("x-test-role") ?? "Photographer" };
      next();
    });
    app.use(
      "/api/v1/photographer/me",
      photographerCommandCenterRoutes({
        dbManager,
        logger: mockLogger as never,
      })
    );
  });

  afterAll(() => database.close());

  beforeEach(() => {
    database.exec(`
      DELETE FROM photographer_ledger;
      DELETE FROM photographer_performance;
      DELETE FROM photos;
      DELETE FROM orders;
      DELETE FROM settings;
      DELETE FROM users;
    `);
    database.prepare(
      "INSERT INTO users (id, monthlyTarget, dailyPhotoTarget) VALUES (?, ?, ?)"
    ).run(1, 6000, 350);
    database.prepare(
      "INSERT INTO users (id, monthlyTarget, dailyPhotoTarget) VALUES (?, ?, ?)"
    ).run(2, 9000, 500);
    database.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "desk_id",
      JSON.stringify("DESK_TUNIS_01")
    );
    database.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "currency",
      JSON.stringify("TND")
    );
    database.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "timezone",
      JSON.stringify("Africa/Tunis")
    );
    database.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
      "last_hub_sync_at",
      JSON.stringify("2000-01-01T00:00:00.000Z")
    );
    vi.clearAllMocks();
  });

  it("returns only authenticated self data with explicit unavailable financial states", async () => {
    const insertOrder = database.prepare(
      `INSERT INTO orders (
         id, photographerId, status, total, tip_amount, items, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    insertOrder.run(
      "order-completed",
      1,
      "Completed",
      19.99,
      2.5,
      JSON.stringify([{ photoId: "photo-1" }]),
      "2026-07-31T23:30:00.000Z",
      "2026-07-31T23:31:00.000Z"
    );
    insertOrder.run(
      "order-delivered",
      1,
      "Delivered",
      10.01,
      0,
      JSON.stringify([{ photoId: "photo-1" }, { photo_id: "photo-2" }]),
      "2026-08-01T08:00:00.000Z",
      "2026-08-01T08:01:00.000Z"
    );
    insertOrder.run(
      "order-pending",
      1,
      "Pending",
      1000,
      100,
      "[]",
      "2026-08-01T09:00:00.000Z",
      "2026-08-01T09:00:00.000Z"
    );
    insertOrder.run(
      "other-photographer",
      2,
      "Completed",
      500,
      0,
      "[]",
      "2026-08-01T10:00:00.000Z",
      "2026-08-01T10:00:00.000Z"
    );

    const insertPhoto = database.prepare(
      `INSERT INTO photos (
         id, photographerId, quality_score, quality_flags, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?)`
    );
    insertPhoto.run(
      "photo-1",
      1,
      90,
      "[]",
      "2026-08-01T07:00:00.000Z",
      "2026-08-01T07:01:00.000Z"
    );
    insertPhoto.run(
      "photo-2",
      1,
      40,
      "[]",
      "2026-08-01T07:05:00.000Z",
      "2026-08-01T07:06:00.000Z"
    );
    insertPhoto.run(
      "other-photo",
      2,
      10,
      '["blurry"]',
      "2026-08-01T07:10:00.000Z",
      "2026-08-01T07:11:00.000Z"
    );
    database.prepare(
      `INSERT INTO photographer_performance (
         photographer_id, date, meetings_taken, meetings_made,
         total_session_seconds, session_count, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(1, "2026-08-01", 10, 4, 900, 3, "2026-08-01T20:00:00.000Z");
    database.prepare(
      "INSERT INTO photographer_ledger (photographer_id, sync_status) VALUES (?, ?)"
    ).run("1", "pending");

    const response = await request(app)
      .get(
        "/api/v1/photographer/me/command-center" +
          "?from=2026-08-01&to=2026-08-02&timezone=Africa%2FTunis"
      )
      .set("x-test-user-id", "1");

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(PhotographerCommandCenterV1Schema.parse(response.body)).toEqual(
      response.body
    );
    expect(response.body.scope).toMatchObject({
      photographerId: "1",
      deskId: "DESK_TUNIS_01",
      currency: "TND",
      currencyExponent: 3,
      timezone: "Africa/Tunis",
      from: "2026-08-01",
      toExclusive: "2026-08-02",
    });
    expect(response.body.sales).toEqual({
      completedOrders: 2,
      grossMinor: 30000,
      tipsMinor: 2500,
      averageOrderMinor: 15000,
      settledMinor: null,
      refundMinor: null,
      netMinor: null,
    });
    expect(response.body.activity).toMatchObject({
      capturesReceived: null,
      photosCatalogued: 2,
      distinctPhotosSold: 2,
      qualityFlagged: 1,
    });
    expect(response.body.performance).toEqual({
      revenueTargetMinor: 6000000,
      photoTarget: 350,
      meetingsTaken: 10,
      meetingsMade: 4,
      meetingConversionBps: 4000,
      photoSellThroughBps: 10000,
      averageSessionSeconds: 300,
    });
    expect(response.body.earnings.payableMinor).toBeNull();
    expect(response.body.shift.verification).toBe("UNAVAILABLE");
    expect(response.body.sync).toMatchObject({ stale: true, pendingEventCount: 1 });
    expect(response.body.daily).toEqual([
      {
        date: "2026-08-01",
        grossMinor: 30000,
        orders: 2,
        photosCatalogued: 2,
        distinctPhotosSold: 2,
        workedSeconds: null,
      },
    ]);
    expect(response.body.completeness).toMatchObject({
      sales: "PROVISIONAL",
      settlement: "UNAVAILABLE",
      earnings: "UNAVAILABLE",
      shifts: "UNAVAILABLE",
    });
  });

  it("uses the configured currency minor-unit exponent", async () => {
    database.prepare("UPDATE settings SET value = ? WHERE key = 'currency'").run(
      JSON.stringify("JPY")
    );
    database.prepare(
      `INSERT INTO orders (
         id, photographerId, status, total, tip_amount, items, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      "order-jpy",
      1,
      "Completed",
      123,
      4,
      "[]",
      "2026-08-01T08:00:00.000Z",
      "2026-08-01T08:01:00.000Z"
    );

    const response = await request(app)
      .get(
        "/api/v1/photographer/me/command-center" +
          "?from=2026-08-01&to=2026-08-02&timezone=Africa%2FTunis"
      )
      .set("x-test-user-id", "1");

    expect(response.status).toBe(200);
    expect(response.body.scope.currency).toBe("JPY");
    expect(response.body.scope.currencyExponent).toBe(0);
    expect(response.body.sales).toMatchObject({
      grossMinor: 123,
      tipsMinor: 4,
      averageOrderMinor: 123,
    });
    expect(response.body.performance.revenueTargetMinor).toBe(6000);
  });

  it("rejects client-selected photographer scope and unauthenticated reads", async () => {
    const scoped = await request(app)
      .get(
        "/api/v1/photographer/me/command-center" +
          "?from=2026-08-01&to=2026-08-02&timezone=Africa%2FTunis&photographerId=2"
      )
      .set("x-test-user-id", "1");
    expect(scoped.status).toBe(400);

    const anonymous = await request(app).get(
      "/api/v1/photographer/me/command-center" +
        "?from=2026-08-01&to=2026-08-02&timezone=Africa%2FTunis"
    );
    expect(anonymous.status).toBe(401);
  });

  it("fails closed when the desk currency is not configured", async () => {
    database.prepare("DELETE FROM settings WHERE key = 'currency'").run();
    const response = await request(app)
      .get(
        "/api/v1/photographer/me/command-center" +
          "?from=2026-08-01&to=2026-08-02&timezone=Africa%2FTunis"
      )
      .set("x-test-user-id", "1");
    expect(response.status).toBe(503);
    expect(response.body.error).toContain("currency");
  });

  it("rejects invalid dates and a timezone outside the configured site boundary", async () => {
    const invalidDate = await request(app)
      .get(
        "/api/v1/photographer/me/command-center" +
          "?from=2026-02-31&to=2026-03-02&timezone=Africa%2FTunis"
      )
      .set("x-test-user-id", "1");
    expect(invalidDate.status).toBe(400);

    const wrongTimezone = await request(app)
      .get(
        "/api/v1/photographer/me/command-center" +
          "?from=2026-08-01&to=2026-08-02&timezone=UTC"
      )
      .set("x-test-user-id", "1");
    expect(wrongTimezone.status).toBe(422);
    expect(wrongTimezone.body.error).toContain("site timezone");
  });
});
