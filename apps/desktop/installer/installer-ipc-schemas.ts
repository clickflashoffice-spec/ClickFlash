import { z } from "zod";

const boundedText = (maxLength: number) => z.string()
  .trim()
  .min(1)
  .max(maxLength)
  .regex(/^[^\0\r\n]*$/, "Control characters are not allowed");

const identifierSchema = boundedText(64).regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/);
const tokenSchema = boundedText(4_096);
const versionSchema = boundedText(32).regex(/^[0-9A-Za-z][0-9A-Za-z.+_-]*$/);
const fingerprintSchema = boundedText(256).regex(/^[A-Fa-f0-9]+$/);

export const externalUrlSchema = z.string().min(1).max(2_048);
export const licenseKeySchema = boundedText(16_384);
export const deviceCodeSchema = boundedText(512);
export const deskIdSchema = identifierSchema;
export const cloudflareTokenSchema = tokenSchema;
export const hardwareFingerprintSchema = fingerprintSchema;
export const validatedLicenseSchema = z.object({
  key: licenseKeySchema,
  plan: z.enum(["starter", "pro", "enterprise", "trial"]),
  max_masters: z.number().int().min(1).max(10_000),
  expires_at: z.string().refine((value) => Number.isFinite(Date.parse(value))).nullable(),
  machine_id: boundedText(256),
}).strict();

const studioProfileSchema = z.object({
  studioName: boundedText(128),
  location: boundedText(128),
  timezone: boundedText(64).regex(/^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/),
  currency: boundedText(3).regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
}).strict();

const destinationSchema = z.object({
  proposed_id: identifierSchema,
  confirmed_id: identifierSchema.optional(),
  site_code: identifierSchema,
  name: boundedText(128),
  location: boundedText(128),
  country: boundedText(2).regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  timezone: boundedText(64).regex(/^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/),
  currency: boundedText(3).regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
}).strict();

export const installerConfigSchema = z.object({
  deskId: identifierSchema,
  studioProfile: studioProfileSchema,
  destination: destinationSchema,
  license: validatedLicenseSchema,
  hub: z.object({ tenant_id: identifierSchema.optional() }).strict().nullable(),
  pairings: z.array(z.object({
    kiosk_id: identifierSchema,
    mac: boundedText(32),
    method: z.enum(["mdns", "sweep", "qr"]),
    paired_at: z.number().int().nonnegative(),
  }).strict()).max(64),
  firstSync: z.object({
    registered_at: z.number().int().nonnegative().optional(),
    heartbeat_ok: z.boolean(),
    r2_test_ok: z.boolean(),
  }).strict().nullable(),
  version: versionSchema,
  installedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
}).strict();

export const applicationComponentSchema = z.enum([
  "master",
  "touch",
  "auto-editor",
  "sync-service",
  "management",
]);

const selectedApplicationsSchema = z.array(applicationComponentSchema)
  .min(1)
  .max(5)
  .refine((values) => new Set(values).size === values.length, "Applications must be unique")
  .refine((values) => values.includes("master"), "Master is required");

const desktopComponentsSchema = z.array(z.enum(["master", "touch"]))
  .min(1)
  .max(2)
  .refine((values) => new Set(values).size === values.length, "Applications must be unique");

export const launchAppsSchema = z.object({
  components: desktopComponentsSchema,
}).strict();

export const installPayloadSchema = z.object({
  components: desktopComponentsSchema,
}).strict();

export const writeEnvConfigSchema = z.object({
  targetDir: z.string().min(1).max(32_767).refine((value) => !value.includes("\0")),
  selectedApps: selectedApplicationsSchema,
  deskId: identifierSchema,
  siteCode: identifierSchema,
  tenantId: identifierSchema.nullable(),
  timezone: boundedText(64).regex(/^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/),
  location: boundedText(128),
  currency: boundedText(3).regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
}).strict();

export const registerWithHubSchema = z.object({
  desk_id: identifierSchema,
  site_code: identifierSchema.optional(),
  name: boundedText(128),
  location: boundedText(128),
  country: boundedText(2).regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  timezone: boundedText(64).regex(/^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/),
  currency: boundedText(3).regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  hardware_fingerprint: fingerprintSchema,
  version: versionSchema,
  mode: z.enum(["install", "upgrade", "repair"]),
  access_token: tokenSchema,
}).strict();

export const heartbeatSchema = z.object({
  desk_id: identifierSchema,
  status: z.enum(["Online", "Offline", "Degraded"]),
  version: versionSchema,
  access_token: tokenSchema,
  test_r2: z.boolean().optional(),
}).strict();

export const fleetRegistrationSchema = z.object({
  deskId: identifierSchema,
  name: boundedText(128),
  location: boundedText(128),
  country: boundedText(2).regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  timezone: boundedText(64).regex(/^[A-Za-z0-9_+-]+(?:\/[A-Za-z0-9_+-]+)*$/),
  currency: boundedText(3).regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  cloudApiUrl: z.string().url().max(2_048),
  token: tokenSchema,
}).strict();

export const healthCheckSchema = z.object({
  masterPort: z.number().int().min(1).max(65_535),
  touchPort: z.number().int().min(1).max(65_535),
  cloudApiUrl: z.string().url().max(2_048),
  deskId: identifierSchema,
  token: tokenSchema,
}).strict();

export const pairingExchangeSchema = z.object({
  masterHost: boundedText(253),
  masterPort: z.number().int().min(1).max(65_535),
  masterDeskId: identifierSchema,
  kioskId: identifierSchema,
  hardwareFingerprint: fingerprintSchema,
}).strict();

export const deviceCodeResponseSchema = z.object({
  device_code: boundedText(512),
  user_code: boundedText(128),
  verification_uri: z.string().url().max(2_048),
  verification_uri_complete: z.string().url().max(2_048).optional(),
  expires_in: z.number().int().min(1).max(86_400),
  interval: z.number().int().min(1).max(300).optional(),
});

export const tokenResponseSchema = z.object({
  access_token: tokenSchema.optional(),
  refresh_token: tokenSchema.optional(),
  tenant_id: identifierSchema.optional(),
  token_type: boundedText(32).optional(),
  expires_in: z.number().int().min(1).max(31_536_000).optional(),
  error: boundedText(128).optional(),
  error_description: boundedText(512).optional(),
}).refine((value) => Boolean(value.access_token || value.error), {
  message: "Token response must contain an access token or error",
});

export const deskAvailabilityResponseSchema = z.object({
  available: z.boolean(),
  suggestions: z.array(identifierSchema).max(20).optional(),
});

export const registrationResponseSchema = z.object({
  desk_id: identifierSchema,
  status: boundedText(64).optional(),
  peers: z.array(z.unknown()).max(100).optional(),
});

export const heartbeatResponseSchema = z.object({
  status: boundedText(64).optional(),
  r2_test_ok: z.boolean().optional(),
});

export const cloudflareAccountsResponseSchema = z.object({
  success: z.boolean(),
  result: z.array(z.object({
    id: boundedText(64),
    name: boundedText(256),
  })).max(100).optional(),
});

export const pairingChallengeResponseSchema = z.object({
  nonce: boundedText(512),
  desk_id: identifierSchema.optional(),
  tenant_id: identifierSchema.optional(),
});

export const pairingResponseSchema = z.object({
  hmac_secret: boundedText(4_096),
  tenant_id: identifierSchema.optional(),
  master_desk_id: identifierSchema.optional(),
  master_ip: boundedText(253).optional(),
  master_port: z.number().int().min(1).max(65_535).optional(),
  error: boundedText(512).optional(),
});

export const remoteErrorResponseSchema = z.object({
  error: boundedText(512),
});

export type RegisterWithHubPayload = z.input<typeof registerWithHubSchema>;
export type HeartbeatPayload = z.input<typeof heartbeatSchema>;
export type ValidatedLicense = z.infer<typeof validatedLicenseSchema>;
export type InstallerConfig = z.infer<typeof installerConfigSchema>;
export type ApplicationComponent = z.infer<typeof applicationComponentSchema>;
export type LaunchAppsPayload = z.input<typeof launchAppsSchema>;
export type InstallPayload = z.input<typeof installPayloadSchema>;
export type WriteEnvConfigPayload = z.input<typeof writeEnvConfigSchema>;
export type ValidatedWriteEnvConfigPayload = z.infer<typeof writeEnvConfigSchema>;
