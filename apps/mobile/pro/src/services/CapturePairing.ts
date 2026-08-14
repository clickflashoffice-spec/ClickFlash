export type CapturePairingState =
  | 'WAITING'
  | 'PAIRED'
  | 'STANDALONE'
  | 'AMBIGUOUS';

export interface CapturePairingIdentity {
  objectId: string;
  mediaType: 'jpeg' | 'raw';
  normalizedStem: string;
  sequenceNumber: number;
  cameraCreatedAt: number;
  detectedAt: number;
}

export interface CapturePairSelection {
  kind: 'NONE' | 'MATCH' | 'AMBIGUOUS';
  candidate?: CapturePairingIdentity;
  ambiguousObjectIds?: string[];
}

export const PAIR_WAIT_TIMEOUT_MS = 60_000;
export const PAIR_CAPTURE_TIME_TOLERANCE_MS = 2_000;
export const PAIR_DETECTION_TIME_TOLERANCE_MS = 120_000;

const FILE_EXTENSION = /\.[^.]+$/;
const UNSAFE_STEM_CHARACTERS = /[^A-Z0-9_-]/g;

export function normalizeCaptureStem(filename: string): string {
  const leafName = filename.replace(/\\/g, '/').split('/').pop() ?? '';
  return leafName
    .replace(FILE_EXTENSION, '')
    .toUpperCase()
    .replace(UNSAFE_STEM_CHARACTERS, '_')
    .slice(0, 180);
}

export function selectPairCandidate(
  target: CapturePairingIdentity,
  candidates: CapturePairingIdentity[]
): CapturePairSelection {
  const scored = candidates
    .filter((candidate) => candidate.objectId !== target.objectId)
    .filter((candidate) => candidate.mediaType !== target.mediaType)
    .filter((candidate) => candidate.normalizedStem === target.normalizedStem)
    .map((candidate) => ({
      candidate,
      score: pairingScore(target, candidate),
    }))
    .filter(
      (entry): entry is { candidate: CapturePairingIdentity; score: number } =>
        entry.score !== null
    )
    .sort(
      (left, right) =>
        left.score - right.score ||
        left.candidate.objectId.localeCompare(right.candidate.objectId)
    );

  if (scored.length === 0) return { kind: 'NONE' };
  const bestScore = scored[0].score;
  const best = scored.filter((entry) => entry.score === bestScore);
  if (best.length > 1) {
    return {
      kind: 'AMBIGUOUS',
      ambiguousObjectIds: best.map((entry) => entry.candidate.objectId),
    };
  }
  return { kind: 'MATCH', candidate: best[0].candidate };
}

export function createCapturePairId(
  leftObjectId: string,
  rightObjectId: string
): string {
  return `pair:${[leftObjectId, rightObjectId].sort().join(':')}`;
}

function pairingScore(
  target: CapturePairingIdentity,
  candidate: CapturePairingIdentity
): number | null {
  if (
    target.sequenceNumber > 0 &&
    candidate.sequenceNumber > 0 &&
    target.sequenceNumber === candidate.sequenceNumber
  ) {
    return 0;
  }

  if (target.cameraCreatedAt > 0 && candidate.cameraCreatedAt > 0) {
    const captureDelta = Math.abs(
      target.cameraCreatedAt - candidate.cameraCreatedAt
    );
    if (captureDelta > PAIR_CAPTURE_TIME_TOLERANCE_MS) return null;
    return captureDelta === 0 ? 1 : 2;
  }

  const detectionDelta = Math.abs(target.detectedAt - candidate.detectedAt);
  return detectionDelta <= PAIR_DETECTION_TIME_TOLERANCE_MS ? 3 : null;
}
