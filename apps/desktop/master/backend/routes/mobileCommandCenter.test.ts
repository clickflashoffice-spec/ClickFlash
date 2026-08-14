import crypto from "crypto";
import express from "express";
import fs from "fs";
import path from "path";
import request from "supertest";
import Database from "better-sqlite3-multiple-ciphers";
import { PhotographerCommandCenterV1Schema } from "@clickflash/types";

import type { DatabaseManager } from "../database/db";
import {
  MOBILE_CAPTURE_MASTER_ID,
  MOBILE_COMMAND_CENTER_RESPONSE_PROTOCOL,
  MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
  canonicalMobileCommandCenterEncryptionKeyInfo,
  canonicalMobileCommandCenterRequest,
  canonicalMobileCommandCenterResponse,
  canonicalMobileCommandCenterResponseAad,
  type MobileCommandCenterPeriod,
  type MobileCommandCenterRequestIdentity,
} from "../services/mobileCaptureProtocol";
import {
  decryptMobileAeadUtf8,
  type MobileAeadEnvelope,
} from "../services/mobileTransportEncryption";
import {
  mobileCapturePublicRoutes,
  resetMobileCapturePairingCodesForTest,
} from "./mobileCapture";

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe("Paired Android photographer command center", () => {
  let app: express.Application;
  let database: Database.Database;
  const deviceId = "android-command-center-0001";
  const secretBase64 = crypto.randomBytes(32).toString("base64");
  let pairedAt: number;

  beforeAll(() => {
    database = new Database(":memory:");
    database.pragma("foreign_keys = ON");
    database.exec(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
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
    for (const migrationName of [
      "068_mobile_capture_ingest.sql",
      "069_mobile_capture_photographer_binding.sql",
    ]) {
      database.exec(
        fs.readFileSync(
          path.join(__dirname, "..", "database", "migrations", migrationName),
          "utf8"
        )
      );
    }
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
    app.use(express.json());
    app.use(
      "/api/v1/mobile-capture",
      mobileCapturePublicRoutes({ dbManager, logger: mockLogger as never })
    );
  });

  afterAll(() => database.close());

  beforeEach(() => {
    pairedAt = Date.now();
    resetMobileCapturePairingCodesForTest();
    database.exec(`
      DELETE FROM mobile_capture_processing_queue;
      DELETE FROM mobile_capture_uploads;
      DELETE FROM mobile_capture_request_nonces;
      DELETE FROM mobile_capture_devices;
      DELETE FROM photographer_ledger;
      DELETE FROM photographer_performance;
      DELETE FROM photos;
      DELETE FROM orders;
      DELETE FROM settings;
      DELETE FROM users;
    `);
    database.prepare(
      `INSERT INTO users (
         id, name, role, monthlyTarget, dailyPhotoTarget
       ) VALUES (?, ?, ?, ?, ?)`
    ).run(1, "Bound Photographer", "Photographer", 6000, 350);
    database.prepare(
      `INSERT INTO users (
         id, name, role, monthlyTarget, dailyPhotoTarget
       ) VALUES (?, ?, ?, ?, ?)`
    ).run(2, "Other Photographer", "Photographer", 9000, 500);
    for (const [key, value] of [
      ["desk_id", "DESK_TUNIS_01"],
      ["currency", "TND"],
      ["timezone", "Africa/Tunis"],
      ["last_hub_sync_at", "2026-08-03T08:00:00.000Z"],
    ]) {
      database.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(
        key,
        JSON.stringify(value)
      );
    }
    database.prepare(
      `INSERT INTO mobile_capture_devices (
         device_id, display_name, hmac_secret, master_id,
         paired_at, last_seen_at, revoked_at, photographer_id
       ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
    ).run(
      deviceId,
      "Command Center Android",
      secretBase64,
      MOBILE_CAPTURE_MASTER_ID,
      pairedAt,
      Date.now(),
      "1"
    );
    jest.clearAllMocks();
  });

  function signedHeaders(
    period: MobileCommandCenterPeriod = "30D",
    options: {
      timestamp?: number;
      nonce?: string;
      secret?: string;
      keyEpoch?: string;
    } = {}
  ): { identity: MobileCommandCenterRequestIdentity; headers: Record<string, string> } {
    const identity: MobileCommandCenterRequestIdentity = {
      masterId: MOBILE_CAPTURE_MASTER_ID,
      deviceId,
      encryptionProtocol: MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
      keyEpoch: options.keyEpoch ?? String(pairedAt),
      timestamp: String(options.timestamp ?? Date.now()),
      nonce: options.nonce ?? crypto.randomBytes(18).toString("base64url"),
      period,
    };
    return {
      identity,
      headers: {
        "X-ClickFlash-Device-Id": identity.deviceId,
        "X-ClickFlash-Encryption": identity.encryptionProtocol,
        "X-ClickFlash-Key-Epoch": identity.keyEpoch,
        "X-ClickFlash-Timestamp": identity.timestamp,
        "X-ClickFlash-Nonce": identity.nonce,
        "X-ClickFlash-Signature": crypto
          .createHmac(
            "sha256",
            Buffer.from(options.secret ?? secretBase64, "base64")
          )
          .update(canonicalMobileCommandCenterRequest(identity))
          .digest("base64"),
      },
    };
  }

  it("returns only the bound photographer snapshot with a nonce-bound signature", async () => {
    const now = new Date();
    const currentIso = now.toISOString();
    database.prepare(
      `INSERT INTO orders (
         id, photographerId, status, total, tip_amount, items, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("self-order", 1, "Completed", 12.5, 1, "[]", currentIso, currentIso);
    database.prepare(
      `INSERT INTO orders (
         id, photographerId, status, total, tip_amount, items, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run("other-order", 2, "Completed", 999, 0, "[]", currentIso, currentIso);

    const signed = signedHeaders();
    const response = await request(app)
      .get("/api/v1/mobile-capture/photographer/me/command-center?period=30D")
      .set(signed.headers);

    expect(response.status).toBe(200);
    expect(response.headers["cache-control"]).toBe("private, no-store");
    expect(response.headers["x-clickflash-response-protocol"]).toBe(
      MOBILE_COMMAND_CENTER_RESPONSE_PROTOCOL
    );
    expect(response.headers["x-clickflash-encryption"]).toBe(
      MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL
    );
    expect(response.headers["x-clickflash-key-epoch"]).toBe(String(pairedAt));
    expect(response.text).not.toContain("Bound Photographer");
    expect(response.text).not.toContain("grossMinor");
    expect(response.text).not.toContain("999000");
    const plaintext = decryptMobileAeadUtf8(
      secretBase64,
      canonicalMobileCommandCenterEncryptionKeyInfo(signed.identity),
      canonicalMobileCommandCenterResponseAad(signed.identity),
      response.body as MobileAeadEnvelope
    );
    const snapshot = PhotographerCommandCenterV1Schema.parse(
      JSON.parse(plaintext)
    );
    expect(snapshot.scope).toMatchObject({
      photographerId: "1",
      currency: "TND",
      currencyExponent: 3,
    });
    expect(snapshot.sales).toMatchObject({
      completedOrders: 1,
      grossMinor: 12500,
      tipsMinor: 1000,
    });
    const bodySha256 = crypto
      .createHash("sha256")
      .update(response.text, "utf8")
      .digest("hex");
    expect(response.headers["x-clickflash-content-sha256"]).toBe(bodySha256);
    expect(response.headers["x-clickflash-signature"]).toBe(
      crypto
        .createHmac("sha256", Buffer.from(secretBase64, "base64"))
        .update(canonicalMobileCommandCenterResponse(signed.identity, bodySha256))
        .digest("base64")
    );
    expect(() =>
      decryptMobileAeadUtf8(
        secretBase64,
        canonicalMobileCommandCenterEncryptionKeyInfo(signed.identity),
        canonicalMobileCommandCenterResponseAad(signed.identity),
        {
          ...(response.body as MobileAeadEnvelope),
          tag: `${response.body.tag.startsWith("A") ? "B" : "A"}${response.body.tag.slice(1)}`,
        }
      )
    ).toThrow();

    const replay = await request(app)
      .get("/api/v1/mobile-capture/photographer/me/command-center?period=30D")
      .set(signed.headers);
    expect(replay.status).toBe(409);
  });

  it("rejects client-selected scope, tampering, stale requests, and rotated secrets", async () => {
    const downgrade = signedHeaders("30D");
    delete downgrade.headers["X-ClickFlash-Encryption"];
    const plaintextAttempt = await request(app)
      .get("/api/v1/mobile-capture/photographer/me/command-center?period=30D")
      .set(downgrade.headers);
    expect(plaintextAttempt.status).toBe(426);
    expect(plaintextAttempt.headers["x-clickflash-required-encryption"]).toBe(
      MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL
    );

    const wrongEpoch = signedHeaders("30D", {
      keyEpoch: String(pairedAt + 1),
    });
    expect(
      (
        await request(app)
          .get("/api/v1/mobile-capture/photographer/me/command-center?period=30D")
          .set(wrongEpoch.headers)
      ).status
    ).toBe(401);

    const scoped = signedHeaders("30D");
    const selectedOther = await request(app)
      .get(
        "/api/v1/mobile-capture/photographer/me/command-center" +
          "?period=30D&photographerId=2"
      )
      .set(scoped.headers);
    expect(selectedOther.status).toBe(400);

    const tampered = signedHeaders("TODAY");
    const changedPeriod = await request(app)
      .get("/api/v1/mobile-capture/photographer/me/command-center?period=7D")
      .set(tampered.headers);
    expect(changedPeriod.status).toBe(401);

    const stale = signedHeaders("30D", { timestamp: Date.now() - 6 * 60_000 });
    const expired = await request(app)
      .get("/api/v1/mobile-capture/photographer/me/command-center?period=30D")
      .set(stale.headers);
    expect(expired.status).toBe(401);

    const rotatedSecret = crypto.randomBytes(32).toString("base64");
    database.prepare(
      "UPDATE mobile_capture_devices SET hmac_secret = ? WHERE device_id = ?"
    ).run(rotatedSecret, deviceId);
    const retired = signedHeaders("30D");
    const oldKey = await request(app)
      .get("/api/v1/mobile-capture/photographer/me/command-center?period=30D")
      .set(retired.headers);
    expect(oldKey.status).toBe(401);
  });

  it("fails closed for unassigned, revoked, and role-drifted devices", async () => {
    database.prepare(
      "UPDATE mobile_capture_devices SET photographer_id = NULL WHERE device_id = ?"
    ).run(deviceId);
    const unassigned = signedHeaders();
    expect(
      (
        await request(app)
          .get("/api/v1/mobile-capture/photographer/me/command-center?period=30D")
          .set(unassigned.headers)
      ).status
    ).toBe(403);

    database.prepare(
      `UPDATE mobile_capture_devices
       SET photographer_id = '1', revoked_at = ?
       WHERE device_id = ?`
    ).run(Date.now(), deviceId);
    const revoked = signedHeaders();
    expect(
      (
        await request(app)
          .get("/api/v1/mobile-capture/photographer/me/command-center?period=30D")
          .set(revoked.headers)
      ).status
    ).toBe(401);

    database.prepare(
      "UPDATE mobile_capture_devices SET revoked_at = NULL WHERE device_id = ?"
    ).run(deviceId);
    database.prepare("UPDATE users SET role = 'Admin' WHERE id = 1").run();
    const roleDrifted = signedHeaders();
    expect(
      (
        await request(app)
          .get("/api/v1/mobile-capture/photographer/me/command-center?period=30D")
          .set(roleDrifted.headers)
      ).status
    ).toBe(403);
  });
});
