import { vi, describe, it, test, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import crypto from "crypto";
import express from "express";
import fs from "fs";
import os from "os";
import path from "path";
import request from "supertest";
import Database from "better-sqlite3-multiple-ciphers";
import { redisCache } from "../services/redisCacheService";

import {
  mobileCaptureAdminRoutes,
  mobileCapturePublicRoutes,
  resetMobileCapturePairingCodesForTest,
} from "./mobileCapture";
import {
  EMPTY_SHA256,
  MOBILE_CAPTURE_MASTER_ID,
  canonicalMasterCaptureReceipt,
  canonicalMobileCaptureRequest,
  canonicalMobileCaptureEncryptionKeyInfo,
  canonicalMobileCaptureAad,
  type MobileCaptureOperation,
  type MobileCaptureRequestIdentity,
} from "../services/mobileCaptureProtocol";
import type { DatabaseManager } from "../database/db";

vi.mock("../services/redisCacheService", () => ({
  redisCache: {
    publishEvent: vi.fn().mockResolvedValue(true)
  }
}));

const _dirname = __dirname;

const mockLogger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn(),
};

describe("Android mobile capture ingest", () => {
  let app: express.Application;
  let database: Database.Database;
  let dbManager: DatabaseManager;
  let temporaryRoot: string;

  beforeAll(() => {
    temporaryRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "clickflash-mobile-capture-")
    );
    database = new Database(":memory:");
    database.pragma("foreign_keys = ON");
    database.exec(
      "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, role TEXT NOT NULL)"
    );
    for (const migrationName of [
      "068_mobile_capture_ingest.sql",
      "069_mobile_capture_photographer_binding.sql",
    ]) {
      database.exec(
        fs.readFileSync(
          path.join(_dirname, "..", "database", "migrations", migrationName),
          "utf8"
        )
      );
    }
    dbManager = {
      get: (sql: string, params: unknown[] = []) =>
        database.prepare(sql).get(...params),
      run: (sql: string, params: unknown[] = []) =>
        database.prepare(sql).run(...params),
      query: (sql: string, params: unknown[] = []) =>
        database.prepare(sql).all(...params),
      transaction: <T>(fn: () => T) => database.transaction(fn)(),
    } as DatabaseManager;

    const context = {
      dbManager,
      logger: mockLogger,
      mobileCaptureImportDir: path.join(temporaryRoot, "processing"),
      mobileCaptureUploadDir: path.join(temporaryRoot, "uploads"),
    };
    app = express();
    app.use(express.json());
    app.use(
      "/admin",
      (req, _res, next) => {
        (req as express.Request & { user: { role: string } }).user = {
          role: "Admin",
        };
        next();
      },
      mobileCaptureAdminRoutes(context as never)
    );
    app.use("/public", mobileCapturePublicRoutes(context as never));
  });

  afterAll(() => {
    database.close();
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.clearAllMocks();
    resetMobileCapturePairingCodesForTest();
    database.exec(`
      DELETE FROM mobile_capture_processing_queue;
      DELETE FROM mobile_capture_uploads;
      DELETE FROM mobile_capture_request_nonces;
      DELETE FROM mobile_capture_devices;
      DELETE FROM users;
    `);
    database.prepare("INSERT INTO users (id, name, role) VALUES (?, ?, ?)").run(
      101,
      "Test Photographer",
      "Photographer"
    );
    vi.clearAllMocks();
  });

  it("pairs once, rejects replay/tampering, resumes chunks, and signs a durable receipt", async () => {
    const issued = await request(app)
      .post("/admin/pairing-codes")
      .send({ photographerId: "101" });
    expect(issued.status).toBe(201);
    expect(issued.body.masterId).toBe(MOBILE_CAPTURE_MASTER_ID);
    expect(issued.body).toMatchObject({
      photographerId: "101",
      photographerName: "Test Photographer",
    });
    const photographers = await request(app).get("/admin/photographers");
    expect(photographers.status).toBe(200);
    expect(photographers.body).toEqual({
      photographers: [
        { id: "101", name: "Test Photographer", role: "Photographer" },
      ],
    });
    const [, codeId, code] = String(issued.body.token).split(".");

    const client = crypto.createECDH("prime256v1");
    client.generateKeys();
    const clientPublicKey = client.getPublicKey("base64", "uncompressed");
    const deviceId = "android-test-device-0001";
    const pairMessage = [
      "CF-PAIR-V1",
      codeId,
      deviceId,
      clientPublicKey,
    ].join("\n");
    const pairProof = crypto
      .createHmac("sha256", code)
      .update(pairMessage)
      .digest("base64");
    const pairBody = {
      codeId,
      deviceId,
      displayName: "Test Android",
      clientPublicKey,
      proof: pairProof,
    };

    const paired = await request(app).post("/public/pair").send(pairBody);
    expect(paired.status).toBe(200);
    const devices = await request(app).get("/admin/devices");
    expect(devices.status).toBe(200);
    expect(devices.body.devices).toEqual([
      expect.objectContaining({
        deviceId,
        photographerId: "101",
        photographerName: "Test Photographer",
      }),
    ]);
    const responseMessage = [
      "CF-PAIR-RESPONSE-V1",
      codeId,
      deviceId,
      clientPublicKey,
      paired.body.serverPublicKey,
      paired.body.masterId,
    ].join("\n");
    expect(
      crypto
        .createHmac("sha256", code)
        .update(responseMessage)
        .digest("base64")
    ).toBe(paired.body.proof);
    const sharedSecret = client.computeSecret(
      Buffer.from(paired.body.serverPublicKey, "base64")
    );
    const secretBase64 = Buffer.from(
      crypto.hkdfSync(
        "sha256",
        sharedSecret,
        Buffer.from(code, "utf8"),
        Buffer.from(responseMessage, "utf8"),
        32
      )
    ).toString("base64");

    const reused = await request(app).post("/public/pair").send(pairBody);
    expect(reused.status).toBe(404);

    const asset = Buffer.from("clickflash-d7000-resumable-capture");
    const assetSha256 = crypto.createHash("sha256").update(asset).digest("hex");
    const idempotencyKey = `cf2:capture:MASTER:ORIGINAL:${assetSha256}`;
    const baseIdentity = {
      deviceId,
      idempotencyKey,
      assetSha256,
      assetByteSize: String(asset.length),
      assetRole: "ORIGINAL",
    } as const;
    const signedHeaders = (
      operation: MobileCaptureOperation,
      contentSha256: string,
      offset: number,
      nonce = crypto.randomBytes(18).toString("base64url"),
      signingSecret = secretBase64,
      signingDeviceId = deviceId,
      keyEpoch = String(paired.body.pairedAt)
    ) => {
      const identity: MobileCaptureRequestIdentity = {
        ...baseIdentity,
        operation,
        deviceId: signingDeviceId,
        timestamp: String(Date.now()),
        nonce,
        contentSha256,
        offset: String(offset),
        encryptionProtocol: "CF-AEAD-V1",
        keyEpoch,
      };
      return {
        identity,
        headers: {
          "X-ClickFlash-Device-Id": identity.deviceId,
          "X-ClickFlash-Timestamp": identity.timestamp,
          "X-ClickFlash-Nonce": identity.nonce,
          "X-ClickFlash-Idempotency-Key": identity.idempotencyKey,
          "X-ClickFlash-Content-Sha256": identity.contentSha256,
          "X-ClickFlash-Asset-Sha256": identity.assetSha256,
          "X-ClickFlash-Asset-Size": identity.assetByteSize,
          "X-ClickFlash-Offset": identity.offset,
          "X-ClickFlash-Asset-Role": identity.assetRole,
          "X-ClickFlash-Encryption": identity.encryptionProtocol,
          "X-ClickFlash-Key-Epoch": identity.keyEpoch,
          "X-ClickFlash-Signature": crypto
            .createHmac("sha256", Buffer.from(signingSecret, "base64"))
            .update(canonicalMobileCaptureRequest(identity))
            .digest("base64"),
        },
      };
    };

    const encryptChunk = (chunk: Buffer, identity: MobileCaptureRequestIdentity, secretBase64: string) => {
      const keyInfo = canonicalMobileCaptureEncryptionKeyInfo(identity, MOBILE_CAPTURE_MASTER_ID, "MOBILE_TO_MASTER");
      const aad = canonicalMobileCaptureAad(identity, MOBILE_CAPTURE_MASTER_ID, "MOBILE_TO_MASTER");
      const key = Buffer.from(crypto.hkdfSync("sha256", Buffer.from(secretBase64, "base64"), Buffer.alloc(0), Buffer.from(keyInfo, "utf8"), 32));
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv, { authTagLength: 16 });
      cipher.setAAD(Buffer.from(aad, "utf8"));
      const ciphertext = Buffer.concat([cipher.update(chunk), cipher.final()]);
      const tag = cipher.getAuthTag();
      return { ciphertext, iv: iv.toString("base64"), tag: tag.toString("base64") };
    };

    const decryptResponse = (encryptedJson: any, identity: MobileCaptureRequestIdentity, secretBase64: string) => {
      const keyInfo = canonicalMobileCaptureEncryptionKeyInfo(identity, MOBILE_CAPTURE_MASTER_ID, "MASTER_TO_MOBILE");
      const aad = canonicalMobileCaptureAad(identity, MOBILE_CAPTURE_MASTER_ID, "MASTER_TO_MOBILE");
      const key = Buffer.from(crypto.hkdfSync("sha256", Buffer.from(secretBase64, "base64"), Buffer.alloc(0), Buffer.from(keyInfo, "utf8"), 32));
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(encryptedJson.iv, "base64"), { authTagLength: 16 });
      decipher.setAAD(Buffer.from(aad, "utf8"));
      decipher.setAuthTag(Buffer.from(encryptedJson.tag, "base64"));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(encryptedJson.ciphertext, "base64")),
        decipher.final(),
      ]);
      return JSON.parse(plaintext.toString("utf8"));
    };

    const statusRequest = signedHeaders("STATUS", EMPTY_SHA256, 0);
    const missing = await request(app)
      .get(`/public/uploads/${encodeURIComponent(idempotencyKey)}/status`)
      .set(statusRequest.headers);
    expect(missing.status).toBe(200);
    const missingDecrypted = decryptResponse(missing.body, statusRequest.identity, secretBase64);
    expect(missingDecrypted).toEqual({ state: "MISSING", expectedOffset: 0 });

    const firstChunk = asset.subarray(0, 12);
    const firstIdentity = signedHeaders(
      "CHUNK",
      crypto.createHash("sha256").update(firstChunk).digest("hex"),
      0
    );
    const firstEncrypted = encryptChunk(firstChunk, firstIdentity.identity, secretBase64);
    const first = await request(app)
      .put(`/public/uploads/${encodeURIComponent(idempotencyKey)}/chunks`)
      .set(firstIdentity.headers)
      .set("X-ClickFlash-Aead-Iv", firstEncrypted.iv)
      .set("X-ClickFlash-Aead-Tag", firstEncrypted.tag)
      .set("Content-Type", "application/octet-stream")
      .set("X-ClickFlash-Filename", encodeURIComponent("DSC_0001.JPG"))
      .send(firstEncrypted.ciphertext);
    expect(first.status).toBe(200);
    const firstDecrypted = decryptResponse(first.body, firstIdentity.identity, secretBase64);
    expect(firstDecrypted.expectedOffset).toBe(firstChunk.length);

    const replay = await request(app)
      .put(`/public/uploads/${encodeURIComponent(idempotencyKey)}/chunks`)
      .set(firstIdentity.headers)
      .set("X-ClickFlash-Aead-Iv", firstEncrypted.iv)
      .set("X-ClickFlash-Aead-Tag", firstEncrypted.tag)
      .set("Content-Type", "application/octet-stream")
      .set("X-ClickFlash-Filename", encodeURIComponent("DSC_0001.JPG"))
      .send(firstEncrypted.ciphertext);
    expect(replay.status).toBe(409);
    expect(replay.body.error).toContain("nonce");

    const secondChunk = asset.subarray(firstChunk.length);
    const wrongOffset = signedHeaders(
      "CHUNK",
      crypto.createHash("sha256").update(secondChunk).digest("hex"),
      0
    );
    const wrongEncrypted = encryptChunk(secondChunk, wrongOffset.identity, secretBase64);
    const rejectedOffset = await request(app)
      .put(`/public/uploads/${encodeURIComponent(idempotencyKey)}/chunks`)
      .set(wrongOffset.headers)
      .set("X-ClickFlash-Aead-Iv", wrongEncrypted.iv)
      .set("X-ClickFlash-Aead-Tag", wrongEncrypted.tag)
      .set("Content-Type", "application/octet-stream")
      .set("X-ClickFlash-Filename", encodeURIComponent("DSC_0001.JPG"))
      .send(wrongEncrypted.ciphertext);
    expect(rejectedOffset.status).toBe(409);
    expect(rejectedOffset.body.expectedOffset).toBe(firstChunk.length);

    const secondIdentity = signedHeaders(
      "CHUNK",
      crypto.createHash("sha256").update(secondChunk).digest("hex"),
      firstChunk.length
    );
    const secondEncrypted = encryptChunk(secondChunk, secondIdentity.identity, secretBase64);
    const second = await request(app)
      .put(`/public/uploads/${encodeURIComponent(idempotencyKey)}/chunks`)
      .set(secondIdentity.headers)
      .set("X-ClickFlash-Aead-Iv", secondEncrypted.iv)
      .set("X-ClickFlash-Aead-Tag", secondEncrypted.tag)
      .set("Content-Type", "application/octet-stream")
      .set("X-ClickFlash-Filename", encodeURIComponent("DSC_0001.JPG"))
      .send(secondEncrypted.ciphertext);
    expect(second.status).toBe(200);
    const secondDecrypted = decryptResponse(second.body, secondIdentity.identity, secretBase64);
    expect(secondDecrypted.complete).toBe(true);

    const commitIdentity = signedHeaders("COMMIT", EMPTY_SHA256, 0);
    const committed = await request(app)
      .post(`/public/uploads/${encodeURIComponent(idempotencyKey)}/commit`)
      .set(commitIdentity.headers);
    if (committed.status !== 200) {
      throw new Error(
        JSON.stringify({
          status: committed.status,
          body: committed.body,
          errors: mockLogger.error.mock.calls,
        })
      );
    }
    const committedDecrypted = decryptResponse(committed.body, commitIdentity.identity, secretBase64);
    expect(committedDecrypted.receipt).toMatchObject({
      destination: "MASTER",
      idempotencyKey,
      assetSha256,
      assetByteSize: asset.length,
      persisted: true,
      checksumVerified: true,
      metadataCommitted: true,
      processingQueued: true,
    });
    expect(
      crypto
        .createHmac("sha256", Buffer.from(secretBase64, "base64"))
        .update(canonicalMasterCaptureReceipt(committedDecrypted.receipt))
        .digest("base64")
    ).toBe(committedDecrypted.signature);

    // A phone can lose power after Master commits but before its local receipt
    // transaction. Both status recovery and a repeated commit must return the
    // exact durable receipt without duplicating downstream processing work.
    const readyStatusIdentity = signedHeaders("STATUS", EMPTY_SHA256, 0);
    const readyStatus = await request(app)
      .get(`/public/uploads/${encodeURIComponent(idempotencyKey)}/status`)
      .set(readyStatusIdentity.headers);
    expect(readyStatus.status).toBe(200);
    const readyStatusDecrypted = decryptResponse(readyStatus.body, readyStatusIdentity.identity, secretBase64);
    expect(readyStatusDecrypted).toEqual({
      state: "READY",
      expectedOffset: asset.length,
      receipt: committedDecrypted.receipt,
      signature: committedDecrypted.signature,
    });

    const repeatedCommitIdentity = signedHeaders("COMMIT", EMPTY_SHA256, 0);
    const repeatedCommit = await request(app)
      .post(`/public/uploads/${encodeURIComponent(idempotencyKey)}/commit`)
      .set(repeatedCommitIdentity.headers);
    expect(repeatedCommit.status).toBe(200);
    const repeatedCommitDecrypted = decryptResponse(repeatedCommit.body, repeatedCommitIdentity.identity, secretBase64);
    expect(repeatedCommitDecrypted).toEqual(committedDecrypted);

    // Re-pairing rotates this device's key. Durable receipt facts must remain
    // recoverable under the new credential while the old credential stops
    // authenticating immediately.
    const reissued = await request(app)
      .post("/admin/pairing-codes")
      .send({ photographerId: "101" });
    expect(reissued.status).toBe(201);
    const [, rotatedCodeId, rotatedCode] = String(reissued.body.token).split(".");
    const rotatedClient = crypto.createECDH("prime256v1");
    rotatedClient.generateKeys();
    const rotatedClientPublicKey = rotatedClient.getPublicKey(
      "base64",
      "uncompressed"
    );
    const rotatedPairMessage = [
      "CF-PAIR-V1",
      rotatedCodeId,
      deviceId,
      rotatedClientPublicKey,
    ].join("\n");
    const rotatedPair = await request(app)
      .post("/public/pair")
      .send({
        codeId: rotatedCodeId,
        deviceId,
        displayName: "Test Android re-paired",
        clientPublicKey: rotatedClientPublicKey,
        proof: crypto
          .createHmac("sha256", rotatedCode)
          .update(rotatedPairMessage)
          .digest("base64"),
      });
    expect(rotatedPair.status).toBe(200);
    const rotatedResponseMessage = [
      "CF-PAIR-RESPONSE-V1",
      rotatedCodeId,
      deviceId,
      rotatedClientPublicKey,
      rotatedPair.body.serverPublicKey,
      rotatedPair.body.masterId,
    ].join("\n");
    const rotatedSecretBase64 = Buffer.from(
      crypto.hkdfSync(
        "sha256",
        rotatedClient.computeSecret(
          Buffer.from(rotatedPair.body.serverPublicKey, "base64")
        ),
        Buffer.from(rotatedCode, "utf8"),
        Buffer.from(rotatedResponseMessage, "utf8"),
        32
      )
    ).toString("base64");

    const rotatedStatusIdentity = signedHeaders(
      "STATUS",
      EMPTY_SHA256,
      0,
      undefined,
      rotatedSecretBase64,
      deviceId,
      String(rotatedPair.body.pairedAt)
    );
    const rotatedStatus = await request(app)
      .get(`/public/uploads/${encodeURIComponent(idempotencyKey)}/status`)
      .set(rotatedStatusIdentity.headers);
    expect(rotatedStatus.status).toBe(200);
    const rotatedStatusDecrypted = decryptResponse(rotatedStatus.body, rotatedStatusIdentity.identity, rotatedSecretBase64);
    expect(rotatedStatusDecrypted.receipt).toEqual(committedDecrypted.receipt);
    expect(
      crypto
        .createHmac("sha256", Buffer.from(rotatedSecretBase64, "base64"))
        .update(canonicalMasterCaptureReceipt(rotatedStatusDecrypted.receipt))
        .digest("base64")
    ).toBe(rotatedStatusDecrypted.signature);
    expect(rotatedStatusDecrypted.signature).not.toBe(committedDecrypted.signature);

    const retiredStatusIdentity = signedHeaders("STATUS", EMPTY_SHA256, 0);
    const retiredStatus = await request(app)
      .get(`/public/uploads/${encodeURIComponent(idempotencyKey)}/status`)
      .set(retiredStatusIdentity.headers);
    expect(retiredStatus.status).toBe(401);

    const rotatedCommitIdentity = signedHeaders(
      "COMMIT",
      EMPTY_SHA256,
      0,
      undefined,
      rotatedSecretBase64,
      deviceId,
      String(rotatedPair.body.pairedAt)
    );
    const rotatedCommit = await request(app)
      .post(`/public/uploads/${encodeURIComponent(idempotencyKey)}/commit`)
      .set(rotatedCommitIdentity.headers);
    expect(rotatedCommit.status).toBe(200);
    const rotatedCommitDecrypted = decryptResponse(rotatedCommit.body, rotatedCommitIdentity.identity, rotatedSecretBase64);
    expect(rotatedCommitDecrypted).toEqual({
      receipt: rotatedStatusDecrypted.receipt,
      signature: rotatedStatusDecrypted.signature,
    });

    const upload = database
      .prepare(
        `SELECT final_path AS finalPath, state
         FROM mobile_capture_uploads
         WHERE idempotency_key = ?`
      )
      .get(idempotencyKey) as { finalPath: string; state: string };
    expect(upload.state).toBe("READY");
    expect(fs.readFileSync(upload.finalPath)).toEqual(asset);
    
    expect(redisCache.publishEvent).toHaveBeenCalledWith(
      "mobile_capture_processing_queue",
      expect.objectContaining({
        asset_sha256: expect.any(String),
        id: expect.any(String),
        local_path: expect.any(String),
      })
    );

    const rogueSecret = crypto.randomBytes(32).toString("base64");
    const roguePairedAt = Date.now();
    database
      .prepare(
        `INSERT INTO mobile_capture_devices (
           device_id, display_name, hmac_secret, master_id, paired_at, last_seen_at
         ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        "android-rogue-device-0002",
        "Rogue",
        rogueSecret,
        MOBILE_CAPTURE_MASTER_ID,
        roguePairedAt,
        roguePairedAt
      );
    const rogueCommit = signedHeaders(
      "COMMIT",
      EMPTY_SHA256,
      0,
      undefined,
      rogueSecret,
      "android-rogue-device-0002",
      String(roguePairedAt)
    );
    const rejectedDevice = await request(app)
      .post(`/public/uploads/${encodeURIComponent(idempotencyKey)}/commit`)
      .set(rogueCommit.headers);
    console.log("ROGUE DEVICE REJECTED:", rejectedDevice.status, rejectedDevice.body, rejectedDevice.text);
    expect(rejectedDevice.status).toBe(409);
    expect(rejectedDevice.body.error).toContain("identity");

    const tampered = signedHeaders(
      "STATUS",
      EMPTY_SHA256,
      0,
      undefined,
      rotatedSecretBase64,
      deviceId,
      String(rotatedPair.body.pairedAt)
    );
    tampered.headers["X-ClickFlash-Signature"] = Buffer.alloc(32).toString(
      "base64"
    );
    const rejectedSignature = await request(app)
      .get(`/public/uploads/${encodeURIComponent(idempotencyKey)}/status`)
      .set(tampered.headers);
    expect(rejectedSignature.status).toBe(401);

    database
      .prepare(
        `UPDATE mobile_capture_uploads
         SET receipt_json = ?
         WHERE idempotency_key = ?`
      )
      .run(
        JSON.stringify({
          ...committedDecrypted.receipt,
          remoteReceiptId: "master-corrupted-receipt",
        }),
        idempotencyKey
      );
    const corruptedStatusIdentity = signedHeaders(
      "STATUS",
      EMPTY_SHA256,
      0,
      undefined,
      rotatedSecretBase64,
      deviceId,
      String(rotatedPair.body.pairedAt)
    );
    const corruptedStatus = await request(app)
      .get(`/public/uploads/${encodeURIComponent(idempotencyKey)}/status`)
      .set(corruptedStatusIdentity.headers);
    expect(corruptedStatus.status).toBe(500);
    expect(corruptedStatus.body).toEqual({
      error: "Ready receipt integrity check failed.",
    });

    const corruptedCommitIdentity = signedHeaders(
      "COMMIT",
      EMPTY_SHA256,
      0,
      undefined,
      rotatedSecretBase64,
      deviceId,
      String(rotatedPair.body.pairedAt)
    );
    const corruptedCommit = await request(app)
      .post(`/public/uploads/${encodeURIComponent(idempotencyKey)}/commit`)
      .set(corruptedCommitIdentity.headers);
    expect(corruptedCommit.status).toBe(500);
    expect(corruptedCommit.body).toEqual({
      error: "Ready receipt integrity check failed.",
    });
    expect(
      database
        .prepare(
          "SELECT COUNT(*) AS count FROM mobile_capture_processing_queue WHERE idempotency_key = ?"
        )
        .get(idempotencyKey)
    ).toEqual({ count: 1 });
  }, 30000);
});
