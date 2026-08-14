// backend/tests/shared/orphanScanner.test.ts
// Unit test for P0-1 bidirectional orphan scanner.

import fs from "fs";
import path from "path";
import os from "os";
import Database from "better-sqlite3-multiple-ciphers";
import { runOrphanScan, ensureOrphanAuditSchema, getRecentOrphanReports } from '../../services/orphanScanner';
import { Logger } from '../../utils/logger';

const mockLogger: Logger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
} as any;

describe("OrphanScanner (P0-1)", () => {
    let testDir: string;
    let uploadDir: string;
    let dbPath: string;
    let db: any;

    beforeAll(() => {
        testDir = path.join(os.tmpdir(), `orphan-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
        uploadDir = path.join(testDir, "uploads");
        dbPath = path.join(testDir, "test.db");
        fs.mkdirSync(uploadDir, { recursive: true });

        db = new Database(dbPath);
        db.pragma("journal_mode = WAL");
        db.exec(`
            CREATE TABLE photos (
                id TEXT PRIMARY KEY,
                albumId TEXT NOT NULL,
                fileHash TEXT NOT NULL,
                originalFilename TEXT NOT NULL,
                url TEXT,
                storagePath TEXT,
                previewUrl TEXT,
                thumbnailUrl TEXT,
                tinyUrl TEXT,
                watermarked_url TEXT,
                UNIQUE(albumId, fileHash)
            );
        `);
    });

    afterAll(() => {
        if (db) db.close();
        try { fs.rmSync(testDir, { recursive: true, force: true }); } catch {}
    });

    test("ensureOrphanAuditSchema creates the table and indexes", () => {
        const adapter = {
            exec: (sql: string) => db.exec(sql),
            run: (sql: string, params: any[] = []) => db.prepare(sql).run(params),
            get: (sql: string, params: any[] = []) => db.prepare(sql).get(params),
            query: (sql: string, params: any[] = []) => db.prepare(sql).all(params),
        };
        ensureOrphanAuditSchema(adapter as any);

        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='orphan_audit'").all();
        expect(tables.length).toBe(1);
        const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='orphan_audit'").all();
        expect(indexes.length).toBeGreaterThanOrEqual(2);
    });

    test("DB→FS scan: row with missing high-res is flagged as critical", async () => {
        const adapter = {
            exec: (sql: string) => db.exec(sql),
            run: (sql: string, params: any[] = []) => db.prepare(sql).run(params),
            get: (sql: string, params: any[] = []) => db.prepare(sql).get(params),
            query: (sql: string, params: any[] = []) => db.prepare(sql).all(params),
        };
        ensureOrphanAuditSchema(adapter as any);

        // Insert a photo row with a storage path that does NOT exist on disk
        db.prepare(`
            INSERT INTO photos (id, albumId, fileHash, originalFilename, url, previewUrl)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            "missing-hires",
            "album-1",
            "deadbeef0001",
            "DSC_0001.jpg",
            "uploads/album-1/highres/ghost.jpg",  // does not exist
            "uploads/album-1/thumbs/ghost_preview.jpg",
        );

        // Stub the UPLOAD_DIR by creating a file then deleting it
        const ghostDir = path.join(testDir, "uploads", "album-1", "highres");
        fs.mkdirSync(ghostDir, { recursive: true });
        // Don't create the actual file — that's the test condition.

        // The scan only needs dbManager; UPLOAD_DIR resolution is from the photo's absolute path
        // The test will report missing files because they don't exist
        const report = await runOrphanScan(adapter as any, mockLogger, uploadDir);

        expect(report.dbToFs.scanned).toBeGreaterThanOrEqual(1);
        expect(report.dbToFs.missingHighres).toBeGreaterThanOrEqual(1);

        // Audit row exists
        const audit = db.prepare(
            "SELECT * FROM orphan_audit WHERE photo_id = ? AND direction = 'db_to_fs' AND severity = 'critical'"
        ).get("missing-hires");
        expect(audit).toBeDefined();
        expect(audit.issue).toMatch(/missing/i);
    });

    test("DB→FS scan: row with all files present is NOT flagged", async () => {
        const adapter = {
            exec: (sql: string) => db.exec(sql),
            run: (sql: string, params: any[] = []) => db.prepare(sql).run(params),
            get: (sql: string, params: any[] = []) => db.prepare(sql).get(params),
            query: (sql: string, params: any[] = []) => db.prepare(sql).all(params),
        };

        // Create a real file on disk
        const realDir = path.join(testDir, "uploads", "album-1", "highres");
        fs.mkdirSync(realDir, { recursive: true });
        const realPath = path.join(realDir, "real.jpg");
        fs.writeFileSync(realPath, Buffer.from("fake jpeg content"));

        // Insert a row pointing to the real file
        db.prepare(`
            INSERT INTO photos (id, albumId, fileHash, originalFilename, url, previewUrl)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            "real-photo",
            "album-1",
            "deadbeef0002",
            "DSC_0002.jpg",
            realPath,  // exists
            "uploads/album-1/thumbs/real_preview.jpg",  // missing
        );

        // Preview tier is not required, so should not flag critical
        // Run scan
        await runOrphanScan(adapter as any, mockLogger, uploadDir);

        // Real photo should not be in critical orphan_audit
        const criticalForReal = db.prepare(
            "SELECT * FROM orphan_audit WHERE photo_id = ? AND severity = 'critical'"
        ).get("real-photo");
        expect(criticalForReal).toBeUndefined();
    });

    test("getRecentOrphanReports returns audit entries", () => {
        const adapter = {
            exec: (sql: string) => db.exec(sql),
            run: (sql: string, params: any[] = []) => db.prepare(sql).run(params),
            get: (sql: string, params: any[] = []) => db.prepare(sql).get(params),
            query: (sql: string, params: any[] = []) => db.prepare(sql).all(params),
        };
        const reports = getRecentOrphanReports(adapter as any, 10);
        expect(Array.isArray(reports)).toBe(true);
        expect(reports.length).toBeGreaterThan(0);
    });

    test("Scan returns valid ScanReport shape", async () => {
        const adapter = {
            exec: (sql: string) => db.exec(sql),
            run: (sql: string, params: any[] = []) => db.prepare(sql).run(params),
            get: (sql: string, params: any[] = []) => db.prepare(sql).get(params),
            query: (sql: string, params: any[] = []) => db.prepare(sql).all(params),
        };
        const report = await runOrphanScan(adapter as any, mockLogger, uploadDir);
        expect(report).toMatchObject({
            scanId: expect.stringMatching(/^scan-/),
            startedAt: expect.any(String),
            finishedAt: expect.any(String),
            durationMs: expect.any(Number),
            fsToDb: expect.objectContaining({
                candidates: expect.any(Number),
                recovered: expect.any(Number),
                skipped: expect.any(Number),
                failed: expect.any(Number),
            }),
            dbToFs: expect.objectContaining({
                scanned: expect.any(Number),
                missingHighres: expect.any(Number),
                missingDerivatives: expect.any(Number),
                flagged: expect.any(Number),
            }),
            errors: expect.any(Array),
        });
    });
});
