import { AI_CONFIG } from '@clickflash/ai-core';
import {
  ACTIVE_FACE_DESCRIPTOR_ALGORITHM,
  FACE_SEARCH_ENDPOINT,
  searchGalleryWithDescriptor,
  type ActiveFaceDescriptor,
} from '../faceSearchClient';

function activeDescriptor(): ActiveFaceDescriptor {
  return {
    algorithm: ACTIVE_FACE_DESCRIPTOR_ALGORITHM,
    dimensions: AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE,
    vector: [
      1,
      ...new Array(AI_CONFIG.FACE_VECTOR_DIMENSION_ACTIVE - 1).fill(0),
    ],
  };
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

describe('faceSearchClient', () => {
  it('uses the canonical authenticated endpoint and returns server matches', async () => {
    const matches = [{ id: 'photo-1', score: 0.91 }];
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, { matches }),
    );
    const descriptor = activeDescriptor();

    await expect(
      searchGalleryWithDescriptor(
        descriptor,
        'signed-gallery-token',
        fetchMock as unknown as typeof fetch,
      ),
    ).resolves.toEqual({ status: 'matched', matches });

    expect(fetchMock).toHaveBeenCalledWith(FACE_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer signed-gallery-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ vector: descriptor.vector }),
    });
  });

  it('surfaces FACE_SEARCH_UNAVAILABLE with no fallback matches', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(503, {
        error: 'Face search is unavailable until the event-scoped vector index is configured',
        code: 'FACE_SEARCH_UNAVAILABLE',
        expectedDimensions: 128,
        matches: [{ id: 'must-not-leak' }],
      }),
    );

    await expect(
      searchGalleryWithDescriptor(
        activeDescriptor(),
        'signed-gallery-token',
        fetchMock as unknown as typeof fetch,
      ),
    ).resolves.toEqual({
      status: 'unavailable',
      matches: [],
      message:
        'Face search is unavailable until the event-scoped vector index is configured',
      expectedDimensions: 128,
    });
  });

  it('rejects invalid descriptors before making a request', async () => {
    const fetchMock = jest.fn();
    const invalidDescriptor = {
      ...activeDescriptor(),
      dimensions: AI_CONFIG.FACE_VECTOR_DIMENSION_TARGET,
      vector: new Array(AI_CONFIG.FACE_VECTOR_DIMENSION_TARGET).fill(0),
    } as unknown as ActiveFaceDescriptor;

    await expect(
      searchGalleryWithDescriptor(
        invalidDescriptor,
        'signed-gallery-token',
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_DESCRIPTOR' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not treat authorization failures as temporary unavailability', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(401, { error: 'Unauthorized' }),
    );

    await expect(
      searchGalleryWithDescriptor(
        activeDescriptor(),
        'expired-token',
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      status: 401,
    });
  });

  it('rejects successful responses that omit typed matches', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, { success: true }),
    );

    await expect(
      searchGalleryWithDescriptor(
        activeDescriptor(),
        'signed-gallery-token',
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
