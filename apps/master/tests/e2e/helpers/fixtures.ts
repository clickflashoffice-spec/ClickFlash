/**
 * Test Data Factories
 *
 * Provides deterministic test data for E2E tests.
 * All factory functions return plain objects — they do NOT write to the DB.
 * Use them to fill forms, compare API responses, or seed via API calls.
 */

let counter = 0;

/** Unique suffix per test run to avoid collisions */
function uid(): string {
  return `${Date.now()}-${++counter}`;
}

// ─── Albums ──────────────────────────────────────────────────────────

export interface AlbumFixture {
  name: string;
  sessionType: string;
  photographer: string;
  date: string;
  room: string;
}

export function buildAlbum(overrides: Partial<AlbumFixture> = {}): AlbumFixture {
  const id = uid();
  return {
    name: `Test Album ${id}`,
    sessionType: "Portrait",
    photographer: "E2E Bot",
    date: new Date().toISOString().split("T")[0],
    room: "Studio A",
    ...overrides,
  };
}

// ─── Orders ──────────────────────────────────────────────────────────

export interface OrderFixture {
  customerName: string;
  customerEmail: string;
  customerRoom: string;
  product: string;
  quantity: number;
  notes: string;
}

export function buildOrder(overrides: Partial<OrderFixture> = {}): OrderFixture {
  const id = uid();
  return {
    customerName: `Test Customer ${id}`,
    customerEmail: `customer-${id}@test.local`,
    customerRoom: "101",
    product: "4x6 Print",
    quantity: 1,
    notes: "",
    ...overrides,
  };
}

// ─── Users ───────────────────────────────────────────────────────────

export interface UserFixture {
  name: string;
  email: string;
  role: "admin" | "photographer" | "viewer" | "manager";
  password: string;
}

export function buildUser(overrides: Partial<UserFixture> = {}): UserFixture {
  const id = uid();
  return {
    name: `Test User ${id}`,
    email: `user-${id}@test.local`,
    role: "viewer",
    password: "TestPassword123!",
    ...overrides,
  };
}

// ─── Categories ──────────────────────────────────────────────────────

export interface CategoryFixture {
  name: string;
  color: string;
}

export function buildCategory(overrides: Partial<CategoryFixture> = {}): CategoryFixture {
  const id = uid();
  return {
    name: `Category ${id}`,
    color: "#4F46E5",
    ...overrides,
  };
}

// ─── Session Types ───────────────────────────────────────────────────

export interface SessionTypeFixture {
  name: string;
  duration: number;
  price: number;
  description: string;
}

export function buildSessionType(
  overrides: Partial<SessionTypeFixture> = {},
): SessionTypeFixture {
  const id = uid();
  return {
    name: `Session Type ${id}`,
    duration: 30,
    price: 99,
    description: "E2E test session type",
    ...overrides,
  };
}

// ─── Bookings ────────────────────────────────────────────────────────

export interface BookingFixture {
  customerName: string;
  date: string;
  time: string;
  sessionType: string;
  notes: string;
}

export function buildBooking(overrides: Partial<BookingFixture> = {}): BookingFixture {
  const id = uid();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    customerName: `Booking Customer ${id}`,
    date: tomorrow.toISOString().split("T")[0],
    time: "10:00",
    sessionType: "Portrait",
    notes: "",
    ...overrides,
  };
}

// ─── Products ────────────────────────────────────────────────────────

export interface ProductFixture {
  name: string;
  price: number;
  category: string;
  description: string;
  stock: number;
}

export function buildProduct(overrides: Partial<ProductFixture> = {}): ProductFixture {
  const id = uid();
  return {
    name: `Product ${id}`,
    price: 29.99,
    category: "Prints",
    description: "E2E test product",
    stock: 100,
    ...overrides,
  };
}

// ─── Kiosks ──────────────────────────────────────────────────────────

export interface KioskFixture {
  name: string;
  ipAddress: string;
}

export function buildKiosk(overrides: Partial<KioskFixture> = {}): KioskFixture {
  const id = uid();
  return {
    name: `Kiosk ${id}`,
    ipAddress: `192.168.1.${(counter % 254) + 1}`,
    ...overrides,
  };
}
