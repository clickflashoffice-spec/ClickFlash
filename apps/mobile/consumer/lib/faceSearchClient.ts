import { AI_CONFIG, isFiniteVector } from '@clickflash/ai-core';

export const FACE_SEARCH_ENDPOINT =
  'https://hub.clickflash.app/api/ai/face-search';
export const ACTIVE_FACE_DESCRIPTOR_ALGORITHM =
  'mobilenet-v2-face-crop-128-v1' as const;

export interface ActiveFaceDescriptor {
  readonly algorithm: typeof ACTIVE_FACE_DESCRIPTOR_ALGORITHM;
  readonly dimensions: typeof AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE;
  readonly vector: readonly number[];
}

export type FaceSearchMatch = Record<string, unknown>;

export type FaceSearchResult =
  | {
      readonly status: 'matched';
      readonly matches: FaceSearchMatch[];
    }
  | {
      readonly status: 'unavailable';
      readonly matches: [];
      readonly message: string;
      readonly expectedDimensions: number;
    };

export type FaceSearchClientErrorCode =
  | 'INVALID_DESCRIPTOR'
  | 'UNAUTHORIZED'
  | 'INVALID_REQUEST'
  | 'INVALID_RESPONSE'
  | 'REQUEST_FAILED';

export class FaceSearchClientError extends Error {
  constructor(
    public readonly code: FaceSearchClientErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'FaceSearchClientError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasUsableMagnitude(vector: readonly number[]): boolean {
  let magnitudeSquared = 0;
  for (const value of vector) {
    magnitudeSquared += value * value;
  }
  return Number.isFinite(magnitudeSquared) && magnitudeSquared > Number.EPSILON;
}

function validateDescriptor(descriptor: ActiveFaceDescriptor): void {
  if (
    descriptor.algorithm !== ACTIVE_FACE_DESCRIPTOR_ALGORITHM ||
    descriptor.dimensions !== AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE ||
    !isFiniteVector(
      descriptor.vector,
      AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE,
    ) ||
    !hasUsableMagnitude(descriptor.vector)
  ) {
    throw new FaceSearchClientError(
      'INVALID_DESCRIPTOR',
      `Face descriptor must use ${ACTIVE_FACE_DESCRIPTOR_ALGORITHM} and contain ${AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE} finite, non-zero values.`,
    );
  }
}

async function readJson(response: Response): Promise<Record<string, unknown> | null> {
  try {
    const value: unknown = await response.json();
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export async function searchGalleryWithDescriptor(
  descriptor: ActiveFaceDescriptor,
  galleryToken: string,
  fetchImplementation: typeof fetch = fetch,
): Promise<FaceSearchResult> {
  validateDescriptor(descriptor);

  const token = galleryToken.trim();
  if (!token) {
    throw new FaceSearchClientError(
      'UNAUTHORIZED',
      'A gallery session is required for face search.',
    );
  }

  const response = await fetchImplementation(FACE_SEARCH_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vector: descriptor.vector }),
  });
  const payload = await readJson(response);

  if (
    response.status === 503 &&
    payload?.code === 'FACE_SEARCH_UNAVAILABLE'
  ) {
    return {
      status: 'unavailable',
      matches: [],
      message:
        typeof payload.error === 'string'
          ? payload.error
          : 'Face search is temporarily unavailable.',
      expectedDimensions:
        typeof payload.expectedDimensions === 'number'
          ? payload.expectedDimensions
          : AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE,
    };
  }

  if (!response.ok) {
    const message =
      typeof payload?.error === 'string'
        ? payload.error
        : `Face search request failed with status ${response.status}.`;
    const code: FaceSearchClientErrorCode =
      response.status === 401 || response.status === 403
        ? 'UNAUTHORIZED'
        : response.status === 400
          ? 'INVALID_REQUEST'
          : 'REQUEST_FAILED';
    throw new FaceSearchClientError(code, message, response.status);
  }

  if (!payload || !Array.isArray(payload.matches) || !payload.matches.every(isRecord)) {
    throw new FaceSearchClientError(
      'INVALID_RESPONSE',
      'Face search returned an invalid response.',
      response.status,
    );
  }

  return {
    status: 'matched',
    matches: payload.matches,
  };
}
