/**
 * FOTIQO KIOSK — FULL LOCAL DIAGNOSTIC (run ON the hotel PC)
 * Read-only. Answers: is the kiosk's OWN offline database complete, or does it
 * still depend on the internet? Where are photos/currency/prints breaking?
 *
 * HOW TO RUN (on the hotel kiosk PC):
 *   1. Save this file somewhere, e.g. C:\Users\dell\Desktop\kiosk-full-diag.mjs
 *   2. Open PowerShell in that folder and run:
 *        npm init -y ; npm i pg
 *        node kiosk-full-diag.mjs
 *   (If `node` isn't on PATH, use the one bundled with the kiosk, or install Node LTS.)
 */
import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

const HOME = os.homedir();
const ROAMING = process.env.APPDATA || join(HOME, "AppData", "Roaming");
const APP_DIR = join(ROAMING, "fotiqo-kiosk-app");
const line = (s = "") => console.log(s);
const hr = () => line("=".repeat(64));

hr();
line("FOTIQO KIOSK — FULL LOCAL DIAGNOSTIC");
hr();
line(`app data dir: ${APP_DIR}  ${existsSync(APP_DIR) ? "(found)" : "*** NOT FOUND ***"}`);

// ── 1. .env + config.json ──────────────────────────────────────────────
function parseEnv(p) {
  const o = {};
  if (!existsSync(p)) return o;
  for (const raw of readFileSync(p, "utf8").split(/\r?\n/)) {
    const l = raw.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf("=");
    if (i < 0) continue;
    let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    o[l.slice(0, i).trim()] = v;
  }
  return o;
}
const env = parseEnv(join(APP_DIR, ".env"));
let cfg = {};
try {
  cfg = JSON.parse(readFileSync(join(APP_DIR, "config.json"), "utf8"));
} catch {}

line("\n--- config.json ---");
line(`  role:            ${cfg.kioskRole || cfg.role || "?"}`);
line(`  locationId:      ${cfg.locationId || "*** MISSING ***"}`);
line(`  deviceToken:     ${cfg.deviceToken ? cfg.deviceToken.slice(0, 12) + "… (present)" : "*** MISSING ***"}`);
line(`  serverIp:        ${cfg.serverIp || "(none — this PC is the sale-point)"}`);
line(`  orgSlug/venue:   ${cfg.venueSlug || cfg.orgSlug || "?"}`);

line("\n--- key .env flags ---");
for (const k of [
  "FEATURE_DEFERRED_KIOSK_EDIT",
  "FOTIQO_OFFLINE_ONLY",
  "FOTIQO_LOCAL_PG",
  "NEXT_PUBLIC_KIOSK_MODE",
  "NEXT_PUBLIC_APP_URL",
  "SYNC_CLOUD_URL",
  "R2_BUCKET_NAME",
])
  line(`  ${k.padEnd(28)} = ${env[k] ?? "(unset)"}`);

// ── 2. Local embedded Postgres ─────────────────────────────────────────
const PG_URL = "postgresql://postgres:postgres@127.0.0.1:54329/fotiqo?schema=public";
let pg;
try {
  pg = (await import("pg")).default;
} catch {
  line("\n*** 'pg' package not installed — run `npm i pg` in this folder first. ***");
  process.exit(1);
}
const db = new pg.Client({ connectionString: PG_URL });
try {
  await db.connect();
} catch (e) {
  line(`\n*** Cannot connect to the kiosk's embedded Postgres at :54329 — ${e.message}`);
  line("    Is the Fotiqo Kiosk app running? The DB only runs while the app is open.");
  process.exit(1);
}
line("\n" + "=".repeat(64));
line("LOCAL EMBEDDED POSTGRES (:54329) — the kiosk's OWN offline database");
hr();

async function q(sql, args = []) {
  try {
    return (await db.query(sql, args)).rows;
  } catch (e) {
    return [{ __err: e.message }];
  }
}

// 2a. Location + CURRENCY (the €/TND flicker)
line("\n--- Locations in the LOCAL db (currency flicker check) ---");
const locs = await q(`SELECT id, name, currency FROM "Location" ORDER BY name`);
for (const l of locs)
  line(
    l.__err
      ? `  ERR ${l.__err}`
      : `  ${l.name?.padEnd(26)} currency=${l.currency ?? "*** NULL → defaults to EUR ***"}  id=${l.id?.slice(0, 12)}`,
  );
line("  >>> If the venue's currency is NULL or EUR here (should be TND), THAT is why");
line("      the kiosk shows EUR offline and only shows TND when it reaches the cloud.");

// 2b. counts
const gCount = (await q(`SELECT count(*)::int n FROM "Gallery"`))[0]?.n;
const pCount = (await q(`SELECT count(*)::int n FROM "Photo"`))[0]?.n;
line(`\n--- Local content: ${gCount} galleries, ${pCount} photos ---`);

// 2c. SyncQueue health
line("\n--- SyncQueue (local → cloud outbox) by status ---");
const sq = await q(
  `SELECT type, status, count(*)::int n FROM "SyncQueue" GROUP BY type, status ORDER BY n DESC LIMIT 20`,
);
for (const r of sq) line(r.__err ? `  ERR ${r.__err}` : `  ${String(r.type).padEnd(12)} ${String(r.status).padEnd(10)} ${r.n}`);

// 2d. STRANDED PHOTOS — the empty-online-gallery root cause
line("\n--- STRANDED photos: on local disk but NEVER queued to the cloud ---");
const stranded = await q(`
  SELECT p."editStatus", count(*)::int n
    FROM "Photo" p
   WHERE NOT EXISTS (SELECT 1 FROM "SyncQueue" s WHERE s.type='photo' AND s."localId"=p.id)
   GROUP BY p."editStatus" ORDER BY n DESC`);
let strandedTotal = 0;
for (const r of stranded) {
  if (r.__err) { line(`  ERR ${r.__err}`); continue; }
  strandedTotal += r.n;
  line(`  editStatus=${String(r.editStatus).padEnd(18)} ${r.n}  (no SyncQueue row → invisible online)`);
}
line(`  >>> ${strandedTotal} photos have NO cloud sync row. These are the empty-gallery photos.`);
line("      PENDING_AUTO + no sync row = the deferred-edit strand (fixed in kiosk v1.2.108).");

// 2e. Photos edited but not yet uploaded to R2 (s3Key_r2 still empty in the outbox)
line("\n--- SyncQueue photo rows still missing their R2 key (bytes not uploaded) ---");
const noKey = await q(`
  SELECT status, count(*)::int n
    FROM "SyncQueue"
   WHERE type='photo' AND (payload::text NOT LIKE '%gallery-photos/%')
   GROUP BY status ORDER BY n DESC`);
for (const r of noKey) line(r.__err ? `  ERR ${r.__err}` : `  ${String(r.status).padEnd(10)} ${r.n} (s3Key_r2 empty)`);

// 2f. A sample gallery's photos + whether the local FILE exists on disk
line("\n--- Sample: newest gallery's photos + local file presence ---");
const g = (await q(`SELECT id, "roomNumber", status FROM "Gallery" ORDER BY "createdAt" DESC LIMIT 1`))[0];
if (g && !g.__err) {
  line(`  gallery ${g.id.slice(0, 12)} room=${g.roomNumber} status=${g.status}`);
  const ph = await q(`SELECT id, "editStatus", "s3Key_highRes" FROM "Photo" WHERE "galleryId"=$1 LIMIT 5`, [g.id]);
  // locate the photo data root (best-effort common locations)
  const roots = [
    join(APP_DIR, "photos"),
    join(APP_DIR, "data", "photos"),
    env.FOTIQO_DATA_ROOT || "",
    join(APP_DIR, "local-storage"),
  ].filter(Boolean);
  line(`  (searching for photo files under: ${roots.join(" | ")})`);
  for (const p of ph) {
    if (p.__err) { line(`    ERR ${p.__err}`); continue; }
    let found = "NOT FOUND on disk";
    for (const root of roots) {
      const cand = join(root, g.id, `${p.id}.jpg`);
      if (existsSync(cand)) { found = `${cand} (${statSync(cand).size}b)`; break; }
    }
    line(`    photo ${p.id.slice(0, 12)} edit=${p.editStatus} key=${(p.s3Key_highRes || "<null>").slice(0, 30)} | file: ${found}`);
  }
}

// ── 3. Local API endpoints (does the kiosk serve currency/prices/sync offline?) ──
hr();
line("LOCAL API (does the offline server answer without the cloud?)");
hr();
const PORT = cfg.localPort || cfg.port || 3000;
const base = `http://127.0.0.1:${PORT}`;
const tok = cfg.deviceToken || "";
async function hit(path, opts = {}) {
  try {
    const r = await fetch(base + path, { headers: tok ? { "x-device-token": tok } : {}, ...opts });
    const t = await r.text();
    return { status: r.status, body: t.slice(0, 200) };
  } catch (e) {
    return { status: "ERR", body: e.message };
  }
}
const locId = cfg.locationId || locs[0]?.id;
line(`\n(base = ${base})`);
const prices = await hit(`/api/local/prices?locationId=${locId}`);
line(`  GET /api/local/prices  -> ${prices.status}  ${prices.body}`);
const syncStat = await hit(`/api/local/sync`);
line(`  GET /api/local/sync    -> ${syncStat.status}  ${syncStat.body}`);

await db.end();
hr();
line("DONE. Send this whole output back.");
hr();
