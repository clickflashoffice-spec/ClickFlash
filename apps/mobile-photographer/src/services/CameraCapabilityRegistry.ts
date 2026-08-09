export const CAMERA_CAPABILITY_REGISTRY_SCHEMA =
  'clickflash.camera-capability-registry' as const;
export const CAMERA_CAPABILITY_REGISTRY_VERSION = 1 as const;

export const CAMERA_CAPABILITIES = [
  'OBJECT_DISCOVERY',
  'OBJECT_IMPORT',
  'JPEG_IMPORT',
  'RAW_IMPORT',
  'REMOTE_SHUTTER',
  'LIVE_VIEW',
  'AUTOFOCUS',
  'FOCUS_DRIVE',
  'EXPOSURE_READ',
  'EXPOSURE_WRITE',
  'VIDEO_CONTROL',
] as const;

export type CameraCapability = (typeof CAMERA_CAPABILITIES)[number];
export type CameraModelId = 'NIKON_D7000' | 'UNKNOWN';
export type CameraIdentityRecognition = 'RECOGNIZED' | 'UNKNOWN';
export type CapabilityEvidenceKind = 'OBSERVED' | 'CERTIFIED';
export type CapabilityEvidenceResult = 'SUPPORTED' | 'UNSUPPORTED';
export type CapabilityEvidenceSource =
  | 'RUNTIME_PROBE'
  | 'FIELD_TEST'
  | 'COMPATIBILITY_LAB'
  | 'SIGNED_RELEASE_EVIDENCE';
export type CapabilityStatus =
  | 'UNVERIFIED'
  | 'OBSERVED_SUPPORTED'
  | 'OBSERVED_UNSUPPORTED'
  | 'CERTIFIED_SUPPORTED'
  | 'CERTIFIED_UNSUPPORTED';

export interface CameraIdentityInput {
  vendorId?: number | null;
  productId?: number | null;
  manufacturerName?: string | null;
  productName?: string | null;
}

export interface CameraIdentity {
  readonly recognition: CameraIdentityRecognition;
  readonly modelId: CameraModelId;
  readonly vendorId: number | null;
  readonly productId: number | null;
  readonly manufacturerName: string | null;
  readonly productName: string | null;
}

export interface CameraCapabilityEvidence {
  readonly evidenceId: string;
  readonly capability: CameraCapability;
  readonly kind: CapabilityEvidenceKind;
  readonly result: CapabilityEvidenceResult;
  readonly recordedAt: number;
  readonly source: CapabilityEvidenceSource;
  readonly artifactId: string | null;
}

export interface CameraCapabilityRegistryDocument {
  readonly schema: typeof CAMERA_CAPABILITY_REGISTRY_SCHEMA;
  readonly version: typeof CAMERA_CAPABILITY_REGISTRY_VERSION;
  readonly identity: CameraIdentity;
  readonly evidence: readonly CameraCapabilityEvidence[];
}

export interface CameraCapabilitySummaryItem {
  readonly capability: CameraCapability;
  readonly status: CapabilityStatus;
  readonly isSupported: boolean;
  readonly isCertified: boolean;
  readonly observedEvidenceCount: number;
  readonly certifiedEvidenceCount: number;
}

export interface CameraCapabilitySummary {
  readonly schemaVersion: typeof CAMERA_CAPABILITY_REGISTRY_VERSION;
  readonly identity: Readonly<{
    recognition: CameraIdentityRecognition;
    modelId: CameraModelId;
    displayName: string;
  }>;
  readonly capabilities: readonly CameraCapabilitySummaryItem[];
  readonly allowedRemoteCommands: readonly CameraCapability[];
}

interface CameraIdentityRule {
  readonly modelId: Exclude<CameraModelId, 'UNKNOWN'>;
  readonly displayName: string;
  readonly trustedVendorIds: readonly number[];
  readonly trustedManufacturerTokens: readonly string[];
  readonly productToken: string;
}

const CAMERA_IDENTITY_RULES: readonly CameraIdentityRule[] = [
  {
    modelId: 'NIKON_D7000',
    displayName: 'Nikon D7000',
    trustedVendorIds: [0x04b0],
    trustedManufacturerTokens: ['nikon'],
    productToken: 'd7000',
  },
];

const REMOTE_COMMANDS = new Set<CameraCapability>([
  'REMOTE_SHUTTER',
  'LIVE_VIEW',
  'AUTOFOCUS',
  'FOCUS_DRIVE',
  'EXPOSURE_READ',
  'EXPOSURE_WRITE',
  'VIDEO_CONTROL',
]);

const EVIDENCE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function resolveCameraIdentity(input: CameraIdentityInput): CameraIdentity {
  const vendorId = normalizeUsbId(input.vendorId);
  const productId = normalizeUsbId(input.productId);
  const manufacturerName = normalizeText(input.manufacturerName);
  const productName = normalizeText(input.productName);
  const manufacturerToken = normalizeToken(manufacturerName);
  const productToken = normalizeToken(productName);

  const rule = CAMERA_IDENTITY_RULES.find((candidate) => {
    const trustedManufacturer =
      (vendorId !== null && candidate.trustedVendorIds.includes(vendorId)) ||
      candidate.trustedManufacturerTokens.some((token) =>
        manufacturerToken.includes(token)
      );
    return trustedManufacturer && productToken.includes(candidate.productToken);
  });

  return Object.freeze({
    recognition: rule ? 'RECOGNIZED' : 'UNKNOWN',
    modelId: rule?.modelId ?? 'UNKNOWN',
    vendorId,
    productId,
    manufacturerName,
    productName,
  });
}

export function createCameraCapabilityRegistry(
  identity: CameraIdentityInput,
  evidence: readonly CameraCapabilityEvidence[] = []
): CameraCapabilityRegistryDocument {
  return freezeDocument({
    schema: CAMERA_CAPABILITY_REGISTRY_SCHEMA,
    version: CAMERA_CAPABILITY_REGISTRY_VERSION,
    identity: resolveCameraIdentity(identity),
    evidence: validateEvidenceCollection(evidence),
  });
}

export function recordCameraCapabilityEvidence(
  registry: CameraCapabilityRegistryDocument,
  evidence: CameraCapabilityEvidence
): CameraCapabilityRegistryDocument {
  validateDocumentHeader(registry);
  return freezeDocument({
    ...registry,
    evidence: validateEvidenceCollection([...registry.evidence, evidence]),
  });
}

export function summarizeCameraCapabilities(
  registry: CameraCapabilityRegistryDocument
): CameraCapabilitySummary {
  validateDocumentHeader(registry);
  const evidence = validateEvidenceCollection(registry.evidence);
  const capabilities = CAMERA_CAPABILITIES.map((capability) => {
    const relevant = evidence.filter((item) => item.capability === capability);
    const certified = relevant.filter((item) => item.kind === 'CERTIFIED');
    const observed = relevant.filter((item) => item.kind === 'OBSERVED');
    const decisive = newestEvidence(certified.length > 0 ? certified : observed);
    const status: CapabilityStatus = decisive
      ? `${decisive.kind}_${decisive.result}`
      : 'UNVERIFIED';
    return Object.freeze({
      capability,
      status,
      isSupported: decisive?.result === 'SUPPORTED',
      isCertified: decisive?.kind === 'CERTIFIED',
      observedEvidenceCount: observed.length,
      certifiedEvidenceCount: certified.length,
    });
  });
  const allowedRemoteCommands = capabilities
    .filter(
      (item) =>
        item.isSupported && item.isCertified && REMOTE_COMMANDS.has(item.capability)
    )
    .map((item) => item.capability);
  const rule = CAMERA_IDENTITY_RULES.find(
    (candidate) => candidate.modelId === registry.identity.modelId
  );

  return Object.freeze({
    schemaVersion: CAMERA_CAPABILITY_REGISTRY_VERSION,
    identity: Object.freeze({
      recognition: registry.identity.recognition,
      modelId: registry.identity.modelId,
      displayName: rule?.displayName ?? 'Unknown camera',
    }),
    capabilities: Object.freeze(capabilities),
    allowedRemoteCommands: Object.freeze(allowedRemoteCommands),
  });
}

export function serializeCameraCapabilityRegistry(
  registry: CameraCapabilityRegistryDocument
): string {
  validateDocumentHeader(registry);
  const evidence = sortEvidence(validateEvidenceCollection(registry.evidence));
  return JSON.stringify({
    schema: CAMERA_CAPABILITY_REGISTRY_SCHEMA,
    version: CAMERA_CAPABILITY_REGISTRY_VERSION,
    identity: {
      recognition: registry.identity.recognition,
      modelId: registry.identity.modelId,
      vendorId: registry.identity.vendorId,
      productId: registry.identity.productId,
      manufacturerName: registry.identity.manufacturerName,
      productName: registry.identity.productName,
    },
    evidence: evidence.map((item) => ({
      evidenceId: item.evidenceId,
      capability: item.capability,
      kind: item.kind,
      result: item.result,
      recordedAt: item.recordedAt,
      source: item.source,
      artifactId: item.artifactId,
    })),
  });
}

export function deserializeCameraCapabilityRegistry(
  serialized: string
): CameraCapabilityRegistryDocument {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    throw new Error('Camera capability registry is not valid JSON.');
  }
  if (!isRecord(parsed)) throw new Error('Camera capability registry must be an object.');
  validateDocumentHeader(parsed);
  if (!isRecord(parsed.identity) || !Array.isArray(parsed.evidence)) {
    throw new Error('Camera capability registry identity or evidence is invalid.');
  }
  const resolvedIdentity = resolveCameraIdentity(parsed.identity as CameraIdentityInput);
  if (
    parsed.identity.modelId !== resolvedIdentity.modelId ||
    parsed.identity.recognition !== resolvedIdentity.recognition
  ) {
    throw new Error('Camera capability registry identity is inconsistent.');
  }
  return createCameraCapabilityRegistry(
    parsed.identity as CameraIdentityInput,
    parsed.evidence as CameraCapabilityEvidence[]
  );
}

function validateDocumentHeader(value: unknown): asserts value is CameraCapabilityRegistryDocument {
  if (!isRecord(value) || value.schema !== CAMERA_CAPABILITY_REGISTRY_SCHEMA) {
    throw new Error('Camera capability registry schema is unsupported.');
  }
  if (value.version !== CAMERA_CAPABILITY_REGISTRY_VERSION) {
    throw new Error('Camera capability registry version is unsupported.');
  }
}

function validateEvidenceCollection(
  evidence: readonly CameraCapabilityEvidence[]
): readonly CameraCapabilityEvidence[] {
  const ids = new Set<string>();
  return Object.freeze(evidence.map((item) => {
    if (!isRecord(item)) throw new Error('Camera capability evidence must be an object.');
    if (!EVIDENCE_ID_PATTERN.test(String(item.evidenceId ?? ''))) {
      throw new Error('Camera capability evidenceId is invalid.');
    }
    if (ids.has(item.evidenceId as string)) {
      throw new Error(`Duplicate camera capability evidenceId: ${item.evidenceId}`);
    }
    ids.add(item.evidenceId as string);
    if (!CAMERA_CAPABILITIES.includes(item.capability as CameraCapability)) {
      throw new Error('Camera capability evidence capability is invalid.');
    }
    if (item.kind !== 'OBSERVED' && item.kind !== 'CERTIFIED') {
      throw new Error('Camera capability evidence kind is invalid.');
    }
    if (item.result !== 'SUPPORTED' && item.result !== 'UNSUPPORTED') {
      throw new Error('Camera capability evidence result is invalid.');
    }
    if (!Number.isSafeInteger(item.recordedAt) || (item.recordedAt as number) < 0) {
      throw new Error('Camera capability evidence recordedAt is invalid.');
    }
    if (!isEvidenceSource(item.source)) {
      throw new Error('Camera capability evidence source is invalid.');
    }
    if (
      (item.kind === 'OBSERVED' && !isObservedSource(item.source)) ||
      (item.kind === 'CERTIFIED' && !isCertifiedSource(item.source))
    ) {
      throw new Error('Camera capability evidence source does not match its kind.');
    }
    if (item.kind === 'CERTIFIED' && !isSafeIdentifier(item.artifactId)) {
      throw new Error('Certified camera capability evidence requires an artifactId.');
    }
    if (item.artifactId !== null && !isSafeIdentifier(item.artifactId)) {
      throw new Error('Camera capability evidence artifactId is invalid.');
    }
    return Object.freeze({
      evidenceId: item.evidenceId as string,
      capability: item.capability as CameraCapability,
      kind: item.kind as CapabilityEvidenceKind,
      result: item.result as CapabilityEvidenceResult,
      recordedAt: item.recordedAt as number,
      source: item.source as CapabilityEvidenceSource,
      artifactId: item.artifactId as string | null,
    });
  }));
}

function newestEvidence(
  evidence: readonly CameraCapabilityEvidence[]
): CameraCapabilityEvidence | undefined {
  return [...evidence].sort((left, right) =>
    right.recordedAt - left.recordedAt || left.evidenceId.localeCompare(right.evidenceId)
  )[0];
}

function sortEvidence(
  evidence: readonly CameraCapabilityEvidence[]
): CameraCapabilityEvidence[] {
  return [...evidence].sort((left, right) =>
    CAMERA_CAPABILITIES.indexOf(left.capability) - CAMERA_CAPABILITIES.indexOf(right.capability) ||
    left.kind.localeCompare(right.kind) ||
    left.recordedAt - right.recordedAt ||
    left.evidenceId.localeCompare(right.evidenceId)
  );
}

function freezeDocument(
  registry: CameraCapabilityRegistryDocument
): CameraCapabilityRegistryDocument {
  return Object.freeze({
    ...registry,
    identity: Object.freeze({ ...registry.identity }),
    evidence: Object.freeze(registry.evidence.map((item) => Object.freeze({ ...item }))),
  });
}

function normalizeUsbId(value: unknown): number | null {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 0xffff
    ? Number(value)
    : null;
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return normalized || null;
}

function normalizeToken(value: string | null): string {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
}

function isEvidenceSource(value: unknown): value is CapabilityEvidenceSource {
  return value === 'RUNTIME_PROBE' || value === 'FIELD_TEST' ||
    value === 'COMPATIBILITY_LAB' || value === 'SIGNED_RELEASE_EVIDENCE';
}

function isObservedSource(
  value: CapabilityEvidenceSource
): value is 'RUNTIME_PROBE' | 'FIELD_TEST' {
  return value === 'RUNTIME_PROBE' || value === 'FIELD_TEST';
}

function isCertifiedSource(
  value: CapabilityEvidenceSource
): value is 'COMPATIBILITY_LAB' | 'SIGNED_RELEASE_EVIDENCE' {
  return value === 'COMPATIBILITY_LAB' || value === 'SIGNED_RELEASE_EVIDENCE';
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && EVIDENCE_ID_PATTERN.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
