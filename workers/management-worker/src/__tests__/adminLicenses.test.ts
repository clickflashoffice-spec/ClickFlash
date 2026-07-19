import { generateEd25519KeyPair, verifyEd25519License } from "@clickflash/licensing";
import { jest } from "@jest/globals";

import { handleAdminLicenses } from "../routes/adminLicenses.js";

const testKeys = generateEd25519KeyPair();
const PRIVATE_KEY = testKeys.privateKey;
const PUBLIC_KEY = testKeys.publicKey;

const statement: any = {
  bind: jest.fn(),
  run: jest.fn(),
};
statement.bind.mockReturnValue(statement);

const database = {
  prepare: jest.fn(() => statement),
};

const createRequest = (body: Record<string, unknown>) => new Request(
  "https://api.example/api/admin/licenses",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  },
);

const validBody = {
  resortName: "Verified Resort",
  destinationId: "DEST-001",
  hardwareUuid: "machine-001",
  tier: "PRO",
  expiresAt: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
};

describe("admin license route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    statement.bind.mockReturnValue(statement);
    statement.run.mockResolvedValue({});
  });

  it("requires authentication", async () => {
    const request = createRequest(validBody);
    const response = await handleAdminLicenses(
      request,
      { DB: database, LICENSE_PRIVATE_KEY: PRIVATE_KEY } as any,
      new URL(request.url),
      {},
      null,
    );

    expect(response?.status).toBe(401);
    expect(database.prepare).not.toHaveBeenCalled();
  });

  it("requires an administrator role", async () => {
    const request = createRequest(validBody);
    const response = await handleAdminLicenses(
      request,
      { DB: database, LICENSE_PRIVATE_KEY: PRIVATE_KEY } as any,
      new URL(request.url),
      {},
      { role: "Photographer" },
    );

    expect(response?.status).toBe(403);
  });

  it("generates a persisted hardware-bound Ed25519 license", async () => {
    const request = createRequest(validBody);
    const response = await handleAdminLicenses(
      request,
      {
        DB: database,
        LICENSE_PRIVATE_KEY: PRIVATE_KEY,
        LICENSE_PUBLIC_KEY: PUBLIC_KEY,
      } as any,
      new URL(request.url),
      {},
      { role: "CEO" },
    );
    const data = await response?.json() as any;

    expect(response?.status).toBe(201);
    expect(data.license.algorithm).toBe("Ed25519");
    expect(data.license.key).toMatch(/^CF-LIVE-/);
    expect(database.prepare).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO licenses"));
    expect(verifyEd25519License(data.license.key, PUBLIC_KEY, {
      expectedMachineId: "machine-001",
    }).valid).toBe(true);
  });
});
