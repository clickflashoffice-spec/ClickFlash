import { z } from 'zod';

export const generateLicenseRequestSchema = z.object({
  plan: z.enum(['trial', 'starter', 'pro', 'enterprise']),
  maxMasters: z.number().int().min(1).max(100),
  expiresDays: z.number().int().min(1).max(3650),
  count: z.number().int().min(1).max(100),
  machineId: z.string().trim().min(1).max(256),
}).strict();

export const validateLicenseRequestSchema = z.object({
  key: z.string().trim().min(1).max(16_384),
  expectedMachineId: z.string().trim().min(1).max(256).optional(),
}).strict();

export type GenerateLicenseRequest = z.infer<typeof generateLicenseRequestSchema>;
export type ValidateLicenseRequest = z.infer<typeof validateLicenseRequestSchema>;

export interface SigningKeySelection {
  selected: boolean;
  fileName?: string;
  keyId?: string;
  error?: string;
}
