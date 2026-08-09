import {
  PhotographerCommandCenterV1Schema,
  type PhotographerCommandCenterV1,
} from "@clickflash/types";

import type { DatabaseManager } from "../database/db";

interface CommandCenterPeriod {
  photographerId: string;
  from: string;
  toExclusive: string;
  timezone: string;
  now?: Date;
}

export type PhotographerCommandCenterPreset = "TODAY" | "7D" | "30D";

interface PresetCommandCenterPeriod {
  photographerId: string;
  preset: PhotographerCommandCenterPreset;
  now?: Date;
}

interface UserRow {
  monthlyTarget: number | null;
  dailyPhotoTarget: number | null;
}

interface OrderRow {
  id: string;
  total: number;
  tipAmount: number | null;
  items: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface PhotoRow {
  id: string;
  qualityScore: number | null;
  qualityFlags: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface PerformanceRow {
  date: string;
  meetingsTaken: number | null;
  meetingsMade: number | null;
  totalSessionSeconds: number | null;
  sessionCount: number | null;
  updatedAt: string | null;
}

interface DailyAccumulator {
  date: string;
  grossMinor: number;
  orders: number;
  photosCatalogued: number;
  soldPhotoIds: Set<string>;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const STALE_AFTER_MS = 15 * 60 * 1000;

export class PhotographerCommandCenterError extends Error {
  constructor(
    message: string,
    readonly statusCode: 404 | 422 | 500 | 503
  ) {
    super(message);
    this.name = "PhotographerCommandCenterError";
  }
}

export class PhotographerCommandCenterService {
  constructor(private readonly db: DatabaseManager) {}

  buildPresetSnapshot(
    period: PresetCommandCenterPeriod
  ): PhotographerCommandCenterV1 {
    const now = period.now ?? new Date();
    const siteTimezone = this.readIdentitySetting(
      "timezone",
      process.env.CLICKFLASH_TIMEZONE
    );
    const today = dateInTimeZone(now.toISOString(), createDateFormatter(siteTimezone));
    if (!today) {
      throw new PhotographerCommandCenterError(
        "The current site date could not be determined.",
        500
      );
    }
    const days = period.preset === "TODAY" ? 1 : period.preset === "7D" ? 7 : 30;
    return this.buildSnapshot({
      photographerId: period.photographerId,
      from: addIsoDays(today, -(days - 1)),
      toExclusive: addIsoDays(today, 1),
      timezone: siteTimezone,
      now,
    });
  }

  buildSnapshot(period: CommandCenterPeriod): PhotographerCommandCenterV1 {
    const user = this.db.get<UserRow>(
      `SELECT monthlyTarget, dailyPhotoTarget
       FROM users
       WHERE id = ?`,
      [period.photographerId]
    );
    if (!user) {
      throw new PhotographerCommandCenterError(
        "Authenticated photographer record was not found.",
        404
      );
    }

    const deskId = this.readIdentitySetting("desk_id", process.env.DESK_ID);
    const currency = this.readIdentitySetting(
      "currency",
      process.env.CLICKFLASH_CURRENCY
    ).toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new PhotographerCommandCenterError(
        "A valid ISO currency must be configured before financial metrics can be shown.",
        503
      );
    }
    const currencyExponent = currencyMinorUnitExponent(currency);
    const siteTimezone = this.readIdentitySetting(
      "timezone",
      process.env.CLICKFLASH_TIMEZONE
    );
    createDateFormatter(siteTimezone);
    if (period.timezone !== siteTimezone) {
      throw new PhotographerCommandCenterError(
        "Requested timezone must match the configured site timezone.",
        422
      );
    }
    const tenantId = this.readOptionalSetting("tenant_id");
    const now = period.now ?? new Date();
    const issues = new Set<string>([
      "OPERATIONAL_SALES_NOT_SETTLEMENT",
      "SETTLEMENT_EVENTS_UNAVAILABLE",
      "REFUND_EVENTS_UNAVAILABLE",
      "EARNINGS_LEDGER_V2_UNAVAILABLE",
      "PAYOUT_EVENTS_UNAVAILABLE",
      "SHIFT_EVENTS_UNAVAILABLE",
      "CAPTURE_PHOTOGRAPHER_BINDING_UNAVAILABLE",
      "PHOTO_SALES_ATTRIBUTION_PROVISIONAL",
      "PENDING_COUNT_LEDGER_ONLY",
      "REVENUE_TARGET_IS_MONTHLY_CONFIG",
      "PHOTO_TARGET_IS_DAILY_CONFIG",
    ]);
    const formatter = createDateFormatter(period.timezone);
    const daily = createDailyAccumulators(period.from, period.toExclusive);

    const orders = this.db.query<OrderRow>(
      `SELECT id, total, COALESCE(tip_amount, 0) AS tipAmount, items,
              created_at AS createdAt, updated_at AS updatedAt
       FROM orders
       WHERE photographerId = ?
         AND status IN ('Completed', 'Delivered')
         AND date(created_at) >= date(?, '-1 day')
         AND date(created_at) <= date(?, '+1 day')`,
      [period.photographerId, period.from, period.toExclusive]
    );
    let grossMinor = 0;
    let tipsMinor = 0;
    let completedOrders = 0;
    const soldPhotoIds = new Set<string>();
    const watermarks: string[] = [];

    for (const order of orders) {
      const date = dateInTimeZone(order.createdAt, formatter);
      if (!date || date < period.from || date >= period.toExclusive) continue;
      const totalMinor = majorToMinor(order.total, currency, "order total");
      const orderTipMinor = majorToMinor(order.tipAmount ?? 0, currency, "order tip");
      grossMinor = addSafe(grossMinor, totalMinor);
      tipsMinor = addSafe(tipsMinor, orderTipMinor);
      completedOrders += 1;
      const day = daily.get(date);
      if (day) {
        day.grossMinor = addSafe(day.grossMinor, totalMinor);
        day.orders += 1;
      }
      const parsedItems = extractSoldPhotoIds(order.items);
      if (parsedItems.malformed) issues.add("PHOTO_SALES_ATTRIBUTION_PROVISIONAL");
      for (const photoId of parsedItems.ids) {
        soldPhotoIds.add(photoId);
        day?.soldPhotoIds.add(photoId);
      }
      watermarks.push(order.updatedAt ?? order.createdAt);
    }

    const photos = this.db.query<PhotoRow>(
      `SELECT id, quality_score AS qualityScore, quality_flags AS qualityFlags,
              created_at AS createdAt, updated_at AS updatedAt
       FROM photos
       WHERE photographerId = ?
         AND date(created_at) >= date(?, '-1 day')
         AND date(created_at) <= date(?, '+1 day')`,
      [period.photographerId, period.from, period.toExclusive]
    );
    let photosCatalogued = 0;
    let qualityFlagged = 0;
    for (const photo of photos) {
      const date = dateInTimeZone(photo.createdAt, formatter);
      if (!date || date < period.from || date >= period.toExclusive) continue;
      photosCatalogued += 1;
      if (isQualityFlagged(photo)) qualityFlagged += 1;
      const day = daily.get(date);
      if (day) day.photosCatalogued += 1;
      watermarks.push(photo.updatedAt ?? photo.createdAt);
    }

    const performanceRows = this.db.query<PerformanceRow>(
      `SELECT date, meetings_taken AS meetingsTaken, meetings_made AS meetingsMade,
              total_session_seconds AS totalSessionSeconds,
              session_count AS sessionCount, updated_at AS updatedAt
       FROM photographer_performance
       WHERE photographer_id = ? AND date >= ? AND date < ?`,
      [period.photographerId, period.from, period.toExclusive]
    );
    const performance = summarizePerformance(performanceRows);
    for (const row of performanceRows) watermarks.push(row.updatedAt ?? row.date);

    const lastHubSyncAt = normalizeOptionalDate(
      this.readOptionalSetting("last_hub_sync_at")
    );
    if (!lastHubSyncAt) issues.add("HUB_WATERMARK_UNAVAILABLE");
    const pendingEventCount = this.db.get<{ count: number }>(
      `SELECT COUNT(*) AS count
       FROM photographer_ledger
       WHERE photographer_id = ? AND sync_status != 'synced'`,
      [period.photographerId]
    )?.count ?? 0;

    const snapshot: PhotographerCommandCenterV1 = {
      schemaVersion: "1",
      generatedAt: now.toISOString(),
      source: "MASTER",
      scope: {
        photographerId: period.photographerId,
        deskId,
        ...(tenantId ? { tenantId } : {}),
        timezone: period.timezone,
        currency,
        currencyExponent,
        from: period.from,
        toExclusive: period.toExclusive,
      },
      sync: {
        sourceWatermark: sourceWatermark(watermarks, period),
        lastHubSyncAt,
        stale:
          !lastHubSyncAt ||
          now.getTime() - new Date(lastHubSyncAt).getTime() > STALE_AFTER_MS,
        pendingEventCount,
      },
      shift: {
        state: "UNKNOWN",
        clockedInAt: null,
        workedSecondsToday: null,
        verification: "UNAVAILABLE",
      },
      activity: {
        capturesReceived: null,
        photosCatalogued,
        photosEdited: null,
        photosDelivered: null,
        distinctPhotosSold: soldPhotoIds.size,
        qualityFlagged,
      },
      sales: {
        completedOrders,
        grossMinor,
        tipsMinor,
        averageOrderMinor:
          completedOrders > 0 ? Math.round(grossMinor / completedOrders) : 0,
        settledMinor: null,
        refundMinor: null,
        netMinor: null,
      },
      earnings: {
        commissionMinor: null,
        salaryMinor: null,
        bonusMinor: null,
        deductionMinor: null,
        paidOutMinor: null,
        payableMinor: null,
      },
      performance: {
        revenueTargetMinor: positiveMajorToMinor(user.monthlyTarget, currency),
        photoTarget: positiveInteger(user.dailyPhotoTarget),
        meetingsTaken: performance?.meetingsTaken ?? null,
        meetingsMade: performance?.meetingsMade ?? null,
        meetingConversionBps: performance?.meetingConversionBps ?? null,
        photoSellThroughBps:
          photosCatalogued > 0
            ? Math.min(10_000, Math.round((soldPhotoIds.size / photosCatalogued) * 10_000))
            : null,
        averageSessionSeconds: performance?.averageSessionSeconds ?? null,
      },
      daily: [...daily.values()].map((day) => ({
        date: day.date,
        grossMinor: day.grossMinor,
        orders: day.orders,
        photosCatalogued: day.photosCatalogued,
        distinctPhotosSold: day.soldPhotoIds.size,
        workedSeconds: null,
      })),
      completeness: {
        sales: "PROVISIONAL",
        settlement: "UNAVAILABLE",
        earnings: "UNAVAILABLE",
        shifts: "UNAVAILABLE",
        issues: [...issues].sort(),
      },
    };
    return PhotographerCommandCenterV1Schema.parse(snapshot);
  }

  private readIdentitySetting(key: string, fallback?: string): string {
    const value = this.readOptionalSetting(key) ?? fallback?.trim() ?? "";
    if (!value) {
      throw new PhotographerCommandCenterError(
        `Master ${key} is not configured.`,
        503
      );
    }
    return value;
  }

  private readOptionalSetting(key: string): string | null {
    const row = this.db.get<{ value: string | null }>(
      "SELECT value FROM settings WHERE key = ?",
      [key]
    );
    if (row?.value === null || row?.value === undefined) return null;
    const raw = String(row.value).trim();
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as unknown;
      return typeof parsed === "string" && parsed.trim() ? parsed.trim() : raw;
    } catch {
      return raw;
    }
  }
}

function createDateFormatter(timezone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat("en-CA-u-ca-iso8601-nu-latn", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    throw new PhotographerCommandCenterError("Timezone is invalid.", 422);
  }
}

function addIsoDays(value: string, days: number): string {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return new Date(timestamp + days * DAY_MS).toISOString().slice(0, 10);
}

function dateInTimeZone(
  raw: string,
  formatter: Intl.DateTimeFormat
): string | null {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? `${raw.replace(" ", "T")}Z`
    : raw;
  const date = new Date(normalized);
  if (!Number.isFinite(date.getTime())) return null;
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function createDailyAccumulators(
  from: string,
  toExclusive: string
): Map<string, DailyAccumulator> {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${toExclusive}T00:00:00Z`);
  const map = new Map<string, DailyAccumulator>();
  for (let timestamp = start; timestamp < end; timestamp += DAY_MS) {
    const date = new Date(timestamp).toISOString().slice(0, 10);
    map.set(date, {
      date,
      grossMinor: 0,
      orders: 0,
      photosCatalogued: 0,
      soldPhotoIds: new Set<string>(),
    });
  }
  return map;
}

function extractSoldPhotoIds(itemsJson: string | null): {
  ids: Set<string>;
  malformed: boolean;
} {
  if (!itemsJson) return { ids: new Set(), malformed: false };
  try {
    const parsed = JSON.parse(itemsJson) as unknown;
    if (!Array.isArray(parsed)) return { ids: new Set(), malformed: true };
    const ids = new Set<string>();
    for (const item of parsed) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const record = item as Record<string, unknown>;
      const candidate = record.photoId ?? record.photo_id;
      if (typeof candidate === "string" && candidate.trim()) ids.add(candidate.trim());
    }
    return { ids, malformed: false };
  } catch {
    return { ids: new Set(), malformed: true };
  }
}

function isQualityFlagged(photo: PhotoRow): boolean {
  if (typeof photo.qualityScore === "number" && photo.qualityScore < 50) return true;
  if (!photo.qualityFlags) return false;
  try {
    const flags = JSON.parse(photo.qualityFlags) as unknown;
    return Array.isArray(flags) && flags.length > 0;
  } catch {
    return true;
  }
}

function summarizePerformance(rows: PerformanceRow[]): {
  meetingsTaken: number;
  meetingsMade: number;
  meetingConversionBps: number | null;
  averageSessionSeconds: number | null;
} | null {
  if (rows.length === 0) return null;
  const meetingsTaken = rows.reduce((sum, row) => sum + (row.meetingsTaken ?? 0), 0);
  const meetingsMade = rows.reduce((sum, row) => sum + (row.meetingsMade ?? 0), 0);
  const sessionSeconds = rows.reduce(
    (sum, row) => sum + (row.totalSessionSeconds ?? 0),
    0
  );
  const sessions = rows.reduce((sum, row) => sum + (row.sessionCount ?? 0), 0);
  return {
    meetingsTaken,
    meetingsMade,
    meetingConversionBps:
      meetingsTaken > 0
        ? Math.min(10_000, Math.round((meetingsMade / meetingsTaken) * 10_000))
        : null,
    averageSessionSeconds: sessions > 0 ? Math.round(sessionSeconds / sessions) : null,
  };
}

function majorToMinor(value: number, currency: string, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new PhotographerCommandCenterError(`Invalid ${label}.`, 500);
  }
  const exponent = currencyMinorUnitExponent(currency);
  const minor = Math.round(value * 10 ** exponent);
  if (!Number.isSafeInteger(minor)) {
    throw new PhotographerCommandCenterError(`${label} exceeds the safe range.`, 500);
  }
  return minor;
}

function positiveMajorToMinor(value: number | null, currency: string): number | null {
  return typeof value === "number" && value > 0
    ? majorToMinor(value, currency, "revenue target")
    : null;
}

function currencyMinorUnitExponent(currency: string): number {
  try {
    const options = new Intl.NumberFormat("en", {
      style: "currency",
      currency,
    }).resolvedOptions();
    const exponent = options.maximumFractionDigits;
    if (
      typeof exponent !== "number" ||
      exponent !== options.minimumFractionDigits ||
      !Number.isSafeInteger(exponent) ||
      exponent < 0 ||
      exponent > 6
    ) {
      throw new Error("Unsupported currency fraction digits.");
    }
    return exponent;
  } catch {
    throw new PhotographerCommandCenterError(
      "Configured currency minor-unit exponent is unavailable.",
      503
    );
  }
}

function positiveInteger(value: number | null): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : null;
}

function addSafe(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new PhotographerCommandCenterError("Financial aggregate exceeds the safe range.", 500);
  }
  return result;
}

function normalizeOptionalDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function sourceWatermark(
  values: string[],
  period: Pick<CommandCenterPeriod, "from" | "toExclusive">
): string {
  const sorted = values
    .map((value) => normalizeOptionalDate(value))
    .filter((value): value is string => Boolean(value))
    .sort();
  const latest = sorted[sorted.length - 1];
  return latest ? `master:${latest}` : `master:empty:${period.from}:${period.toExclusive}`;
}
