import {
  PhotographerCommandCenterV1Schema,
  type PhotographerCommandCenterV1,
} from '@clickflash/types';

import {
  MOBILE_COMMAND_CENTER_RESPONSE_PROTOCOL,
  MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM,
  MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL,
  canonicalMobileCommandCenterEncryptionKeyInfo,
  canonicalMobileCommandCenterResponse,
  canonicalMobileCommandCenterResponseAad,
  type MobileCommandCenterRequestIdentity,
} from './MasterCaptureProtocol.ts';

const BASE64_PATTERN =
  /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
const MAX_ENVELOPE_BYTES = 2 * 1024 * 1024;
const ENVELOPE_KEYS = [
  'algorithm',
  'ciphertext',
  'iv',
  'protocol',
  'tag',
].join(',');

export interface MobileAeadEnvelope {
  protocol: typeof MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL;
  algorithm: typeof MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM;
  iv: string;
  ciphertext: string;
  tag: string;
}

interface VerifiedResponseInput {
  responseText: string;
  responseProtocol: string | null;
  encryptionProtocol: string | null;
  keyEpoch: string | null;
  declaredSha256: string | null;
  computedSha256: string;
  signature: string | null;
  identity: MobileCommandCenterRequestIdentity;
  verifySignature: (message: string, signature: string) => boolean;
  decryptEnvelope: (
    envelope: MobileAeadEnvelope,
    keyInfo: string,
    aad: string
  ) => Promise<string> | string;
}

function parseStrictEnvelope(responseText: string): MobileAeadEnvelope {
  if (!responseText || responseText.length > MAX_ENVELOPE_BYTES) {
    throw new Error('Master command-center encrypted response authentication failed.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(responseText) as unknown;
  } catch {
    throw new Error('Master command-center encrypted response authentication failed.');
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    Array.isArray(parsed) ||
    Object.keys(parsed).sort().join(',') !== ENVELOPE_KEYS
  ) {
    throw new Error('Master command-center encrypted response authentication failed.');
  }
  const envelope = parsed as Partial<MobileAeadEnvelope>;
  if (
    envelope.protocol !== MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL ||
    envelope.algorithm !== MOBILE_PAYLOAD_ENCRYPTION_ALGORITHM ||
    typeof envelope.iv !== 'string' ||
    typeof envelope.ciphertext !== 'string' ||
    typeof envelope.tag !== 'string' ||
    !BASE64_PATTERN.test(envelope.iv) ||
    !BASE64_PATTERN.test(envelope.ciphertext) ||
    !BASE64_PATTERN.test(envelope.tag) ||
    envelope.iv.length !== 16 ||
    envelope.tag.length !== 24 ||
    envelope.ciphertext.length < 4
  ) {
    throw new Error('Master command-center encrypted response authentication failed.');
  }
  return envelope as MobileAeadEnvelope;
}

export async function parseVerifiedCommandCenterResponse(
  input: VerifiedResponseInput
): Promise<PhotographerCommandCenterV1> {
  const computedSha256 = input.computedSha256.toLowerCase();
  if (
    input.responseProtocol !== MOBILE_COMMAND_CENTER_RESPONSE_PROTOCOL ||
    input.encryptionProtocol !== MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL ||
    input.identity.encryptionProtocol !== MOBILE_PAYLOAD_ENCRYPTION_PROTOCOL ||
    input.keyEpoch !== input.identity.keyEpoch ||
    !/^[a-f0-9]{64}$/.test(computedSha256) ||
    input.declaredSha256?.toLowerCase() !== computedSha256 ||
    typeof input.signature !== 'string' ||
    !input.verifySignature(
      canonicalMobileCommandCenterResponse(input.identity, computedSha256),
      input.signature
    )
  ) {
    throw new Error('Master command-center encrypted response authentication failed.');
  }

  const envelope = parseStrictEnvelope(input.responseText);
  let plaintext: string;
  try {
    plaintext = await input.decryptEnvelope(
      envelope,
      canonicalMobileCommandCenterEncryptionKeyInfo(input.identity),
      canonicalMobileCommandCenterResponseAad(input.identity)
    );
  } catch {
    throw new Error('Master command-center encrypted response authentication failed.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext) as unknown;
  } catch {
    throw new Error('Master returned invalid encrypted command-center JSON.');
  }
  const validated = PhotographerCommandCenterV1Schema.safeParse(parsed);
  if (!validated.success || validated.data.source !== 'MASTER') {
    throw new Error('Master returned an invalid command-center snapshot.');
  }
  return validated.data;
}

export default { parseVerifiedCommandCenterResponse };
