import type { TokenPayload } from "../jwt.js";

export interface CustomerOrderRecord {
  id: string;
  date?: string;
  clientName?: string;
  email?: string;
  status?: string;
  total?: number;
  totalAmount?: number;
  photographerId?: string | number;
  destinationId?: string;
  appliedDiscount?: number;
  albumId?: string;
  items?: unknown;
  [key: string]: unknown;
}

export interface DownloadablePhotoRecord {
  id: string;
  albumId?: string;
  url?: string;
  storagePath?: string;
}

export type ProofingStatus = "approved" | "rejected" | "pending";

const PIN_MIN = 100_000;
const PIN_RANGE = 900_000;
const UINT32_RANGE = 0x1_0000_0000;
const UNBIASED_PIN_LIMIT = UINT32_RANGE - (UINT32_RANGE % PIN_RANGE);

const STAFF_ROLES = new Set([
  "admin",
  "manager",
  "owner",
  "photographer",
  "super-admin",
  "super_admin",
]);

const PAID_ORDER_STATUSES = new Set([
  "paid",
  "completed",
  "delivered",
  "fulfilled",
]);

export function isStaffToken(payload: TokenPayload): boolean {
  return typeof payload.role === "string" && STAFF_ROLES.has(payload.role.toLowerCase());
}

export function isCustomerToken(payload: TokenPayload): boolean {
  return payload.role === "customer" || payload.type === "order";
}

export function parseOrderItems(items: unknown): Record<string, unknown>[] {
  if (Array.isArray(items)) {
    return items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object");
  }

  if (typeof items !== "string") return [];

  try {
    const parsed = JSON.parse(items);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      : [];
  } catch {
    return [];
  }
}

export function generateCustomerAccessPin(): string {
  const sample = new Uint32Array(1);
  let value: number;

  do {
    crypto.getRandomValues(sample);
    value = sample[0];
  } while (value >= UNBIASED_PIN_LIMIT);

  return String(PIN_MIN + (value % PIN_RANGE));
}

export function isValidCartSessionId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function isValidStripeCheckoutSessionId(value: unknown): value is string {
  return typeof value === "string" && /^cs_(?:test_)?[A-Za-z0-9]{8,200}$/.test(value);
}

export function updateOrderPhotoProofingStatus(
  items: unknown,
  photoId: string,
  status: ProofingStatus,
): { found: boolean; items: Record<string, unknown>[] } {
  let found = false;
  const updatedItems = parseOrderItems(items).map((item) => {
    if (!itemReferencesPhoto(item, photoId)) return item;

    found = true;
    const photo = item.photo;
    if (!photo || typeof photo !== "object") return item;

    return {
      ...item,
      photo: {
        ...(photo as Record<string, unknown>),
        proofingStatus: status,
      },
    };
  });

  return { found, items: updatedItems };
}

export function toCustomerOrder(order: CustomerOrderRecord): CustomerOrderRecord {
  const items = parseOrderItems(order.items).map((item) => {
    const photo = item.photo;
    const safePhoto = photo && typeof photo === "object"
      ? (() => {
          const value = photo as Record<string, unknown>;
          const previewUrl = value.watermarkUrl || value.previewUrl || value.thumbnailUrl || value.url;
          return {
            id: value.id,
            albumId: value.albumId,
            title: value.title,
            photographerId: value.photographerId,
            url: previewUrl,
            previewUrl: value.previewUrl,
            thumbnailUrl: value.thumbnailUrl,
            watermarkUrl: value.watermarkUrl,
            proofingStatus: value.proofingStatus,
          };
        })()
      : undefined;

    return {
      id: item.id,
      photoId: item.photoId || safePhoto?.id,
      name: item.name || item.title,
      format: item.format,
      quantity: item.quantity,
      price: item.price,
      deliveryType: item.deliveryType,
      productId: item.productId,
      type: item.type,
      ...(safePhoto ? { photo: safePhoto } : {}),
    };
  });

  return {
    id: order.id,
    date: order.date,
    clientName: order.clientName,
    email: order.email,
    status: order.status,
    total: order.total ?? order.totalAmount ?? 0,
    photographerId: order.photographerId,
    destinationId: order.destinationId,
    appliedDiscount: order.appliedDiscount ?? 0,
    albumId: order.albumId,
    items,
  };
}

function itemReferencesPhoto(item: Record<string, unknown>, photoId: string): boolean {
  if (item.photoId === photoId || item.id === photoId) return true;

  const photo = item.photo;
  return Boolean(photo && typeof photo === "object" && (photo as Record<string, unknown>).id === photoId);
}

function itemGrantsAlbum(item: Record<string, unknown>): boolean {
  const identifiers = [item.type, item.productId, item.id, item.name]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  return identifiers.some((value) =>
    value === "album_full" ||
    value === "digital_package" ||
    value.includes("full album") ||
    value.includes("all high-res")
  );
}

export function canOrderDownloadPhoto(
  order: CustomerOrderRecord,
  photo: DownloadablePhotoRecord,
): boolean {
  if (!PAID_ORDER_STATUSES.has(String(order.status || "").toLowerCase())) return false;

  const items = parseOrderItems(order.items);
  if (items.some((item) => itemReferencesPhoto(item, photo.id))) return true;

  return Boolean(
    order.albumId &&
    photo.albumId &&
    order.albumId === photo.albumId &&
    items.some(itemGrantsAlbum),
  );
}

export function canOrderViewPhoto(
  order: CustomerOrderRecord,
  photo: DownloadablePhotoRecord,
): boolean {
  if (order.albumId && photo.albumId && order.albumId === photo.albumId) return true;
  return parseOrderItems(order.items).some((item) => itemReferencesPhoto(item, photo.id));
}

export function getPhotoStorageKey(photo: DownloadablePhotoRecord): string | null {
  const candidate = String(photo.storagePath || photo.url || "").trim();
  if (!candidate || candidate.includes("..") || /^https?:\/\//i.test(candidate)) return null;

  const normalized = candidate
    .replace(/^\/+/, "")
    .replace(/^api\/files\//, "")
    .replace(/^v1\//, "");

  return normalized && !normalized.includes("..") ? normalized : null;
}
