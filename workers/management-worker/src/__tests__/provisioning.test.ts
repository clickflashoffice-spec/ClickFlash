import { hasValidProvisioningSecret } from "../provisioning.js";
import { handleAuth } from "../routes/auth.js";
import { handleOnboarding } from "../routes/onboarding.js";

const corsHeaders = { "Access-Control-Allow-Origin": "https://admin.clickflash.com" };

describe("provisioning boundaries", () => {
  it("requires a configured secret and compares header/body credentials", () => {
    const headerRequest = new Request("https://api.example/register", {
      headers: { "X-Provisioning-Secret": "correct-secret" },
    });
    const plainRequest = new Request("https://api.example/register");

    expect(hasValidProvisioningSecret(headerRequest, undefined)).toBe(false);
    expect(hasValidProvisioningSecret(headerRequest, "correct-secret")).toBe(true);
    expect(hasValidProvisioningSecret(headerRequest, "wrong-secret")).toBe(false);
    expect(hasValidProvisioningSecret(plainRequest, "correct-secret", "correct-secret")).toBe(true);
  });

  it("fails closed when desk registration has no configured secret", async () => {
    const request = new Request("https://api.example/api/auth/register-desk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deskId: "desk-01",
        deskName: "Desk 01",
        email: "desk@example.com",
        password: "strong-password",
        machine_id: "machine-01",
      }),
    });

    const response = await handleAuth(
      request,
      new URL(request.url),
      { JWT_SECRET: "jwt-secret" },
      {},
      corsHeaders,
      null,
      null,
      null,
      null,
      null,
      null,
    );

    expect(response?.status).toBe(503);
  });

  it("rejects onboarding registration with the wrong secret", async () => {
    const request = new Request("https://api.example/api/v1/onboarding/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        desk_id: "desk-01",
        name: "Desk 01",
        provisioningSecret: "wrong-secret",
      }),
    });

    const response = await handleOnboarding(
      request,
      {
        PROVISIONING_SECRET: "correct-secret",
        LICENSE_PRIVATE_KEY: "configured",
      },
      new URL(request.url),
      {},
      corsHeaders,
    );

    expect(response?.status).toBe(403);
  });

  it("requires the OS machine ID before onboarding can issue a license", async () => {
    const request = new Request("https://api.example/api/v1/onboarding/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        desk_id: "desk-01",
        name: "Desk 01",
        provisioningSecret: "correct-secret",
      }),
    });

    const response = await handleOnboarding(
      request,
      {
        PROVISIONING_SECRET: "correct-secret",
        LICENSE_PRIVATE_KEY: "configured",
      },
      new URL(request.url),
      {},
      corsHeaders,
    );

    expect(response?.status).toBe(400);
    await expect(response?.json()).resolves.toEqual(expect.objectContaining({
      error: expect.objectContaining({ message: expect.stringContaining("machine_id") }),
    }));
  });

  it("requires the machine ID when validating a signed license online", async () => {
    const request = new Request("https://api.example/api/v1/license/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "CF-LIVE-payload.signature", desk_id: "desk-01" }),
    });

    const response = await handleOnboarding(
      request,
      { LICENSE_PUBLIC_KEY: "configured" },
      new URL(request.url),
      {},
      corsHeaders,
    );

    expect(response?.status).toBe(400);
  });

  it("does not expose the removed unsigned onboarding webhook", async () => {
    const request = new Request("https://api.example/api/v1/onboarding/webhook", {
      method: "POST",
      body: JSON.stringify({ type: "customer.subscription.updated", data: {} }),
    });

    const response = await handleOnboarding(
      request,
      {},
      new URL(request.url),
      {},
      corsHeaders,
    );

    expect(response).toBeNull();
  });
});
