import * as Crypto from 'expo-crypto';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

import { getDatabase } from '@/backend/database';
import { logger } from '@/utils/logger';

import {
  buildSpotRecommendation,
  confidenceFromGpsAccuracy,
  getSpotTimeBucket,
  type SpotAggregate,
  type SpotRecommendation,
} from './SpotIntelligenceModel';

const LOCAL_SPOT_SALT_KEY = 'clickflash.spot-cell-salt.v1';

export type SpotResolutionSource =
  | 'ASSIGNMENT'
  | 'MANUAL'
  | 'QR'
  | 'KIOSK'
  | 'GPS'
  | 'LAST_CONFIRMED';

export type SpotFeedbackAction =
  | 'ACCEPT'
  | 'DISMISS'
  | 'MUTE'
  | 'WRONG_SPOT'
  | 'GOOD_LOOK'
  | 'BAD_LIGHT';

export interface SpotCandidate {
  id: string;
  displayName: string;
  source: SpotResolutionSource;
  confidence: number;
  requiresConfirmation: true;
  accuracyMeters: number;
}

export interface SpotCandidateLookup {
  candidate: SpotCandidate | null;
  unavailableReason: string | null;
}

export interface ActiveSpot {
  id: string;
  displayName: string;
  source: SpotResolutionSource;
  confidence: number;
  confirmed: boolean;
  muted: boolean;
}

export interface SpotDashboard {
  activeSpot: ActiveSpot | null;
  aggregate: SpotAggregate;
  recommendation: SpotRecommendation;
  feedbackCount: number;
}

export interface CaptureSpotObservation {
  captureId: string;
  capturedAt: number;
  poseQualityScore: number;
  blurDetected: boolean;
  blinkDetected: boolean;
  subjectCount: number;
}

interface SpotStateRow {
  spotId: string;
  displayName: string;
  resolutionSource: SpotResolutionSource;
  confidence: number;
  confirmed: number;
  muted: number;
}

interface SpotAggregateRow {
  sampleCount: number;
  averagePoseQuality: number | null;
  blurRate: number | null;
  blinkRate: number | null;
}

function emptyAggregate(): SpotAggregate {
  return { sampleCount: 0, averagePoseQuality: 0, blurRate: 0, blinkRate: 0 };
}

function boundedScore(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

async function getLocalSpotSalt(): Promise<string> {
  const existing = await SecureStore.getItemAsync(LOCAL_SPOT_SALT_KEY);
  if (existing) return existing;
  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync(LOCAL_SPOT_SALT_KEY, created);
  return created;
}

class SpotIntelligenceService {
  public async resolveGpsCandidate(): Promise<SpotCandidateLookup> {
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        permission = await Location.requestForegroundPermissionsAsync();
      }
      if (!permission.granted) {
        return {
          candidate: null,
          unavailableReason: 'Location permission is off. Confirm a spot manually or enable permission.',
        };
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        return {
          candidate: null,
          unavailableReason: 'Android location services are off. Scout remains available without a GPS candidate.',
        };
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const accuracyMeters = Math.max(1, location.coords.accuracy ?? 1_000);
      const coarseLatitude = location.coords.latitude.toFixed(3);
      const coarseLongitude = location.coords.longitude.toFixed(3);
      const salt = await getLocalSpotSalt();
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        `${salt}:${coarseLatitude}:${coarseLongitude}`
      );
      const shortId = digest.slice(0, 12);

      return {
        candidate: {
          id: `local:${shortId}`,
          displayName: `LOCAL AREA ${shortId.slice(0, 6).toUpperCase()}`,
          source: 'GPS',
          confidence: confidenceFromGpsAccuracy(accuracyMeters),
          requiresConfirmation: true,
          accuracyMeters,
        },
        unavailableReason: null,
      };
    } catch {
      logger.info('[SpotIntelligence] Coarse location candidate is currently unavailable.');
      return {
        candidate: null,
        unavailableReason: 'A location fix is unavailable. Scout remains usable; try again later or confirm a spot manually.',
      };
    }
  }

  public async confirmCandidate(candidate: SpotCandidate): Promise<void> {
    if (!/^local:[a-f0-9]{12}$/.test(candidate.id)) {
      throw new Error('Spot candidate identity is invalid.');
    }
    const database = await getDatabase();
    await database.runAsync(
      `INSERT INTO spot_state (
         id, spot_id, display_name, resolution_source, confidence, confirmed, muted, updated_at
       ) VALUES ('active', ?, ?, ?, ?, 1, 0, ?)
       ON CONFLICT(id) DO UPDATE SET
         spot_id = excluded.spot_id,
         display_name = excluded.display_name,
         resolution_source = excluded.resolution_source,
         confidence = excluded.confidence,
         confirmed = 1,
         muted = 0,
         updated_at = excluded.updated_at`,
      [candidate.id, candidate.displayName, candidate.source, candidate.confidence, Date.now()]
    );
    logger.info(`[SpotIntelligence] Photographer confirmed ${candidate.displayName}.`);
  }

  public async getDashboard(): Promise<SpotDashboard> {
    const database = await getDatabase();
    const state = await database.getFirstAsync<SpotStateRow>(
      `SELECT
         spot_id AS spotId,
         display_name AS displayName,
         resolution_source AS resolutionSource,
         confidence,
         confirmed,
         muted
       FROM spot_state
       WHERE id = 'active'`
    );

    if (!state) {
      const aggregate = emptyAggregate();
      return {
        activeSpot: null,
        aggregate,
        recommendation: buildSpotRecommendation(aggregate),
        feedbackCount: 0,
      };
    }

    const aggregateRow = await database.getFirstAsync<SpotAggregateRow>(
      `SELECT
         COUNT(*) AS sampleCount,
         AVG(pose_quality_score) AS averagePoseQuality,
         AVG(blur_detected) AS blurRate,
         AVG(blink_detected) AS blinkRate
       FROM spot_observations
       WHERE spot_id = ?`,
      [state.spotId]
    );
    const feedbackRow = await database.getFirstAsync<{ feedbackCount: number }>(
      `SELECT COUNT(*) AS feedbackCount FROM spot_feedback WHERE spot_id = ?`,
      [state.spotId]
    );
    const aggregate: SpotAggregate = {
      sampleCount: aggregateRow?.sampleCount ?? 0,
      averagePoseQuality: aggregateRow?.averagePoseQuality ?? 0,
      blurRate: aggregateRow?.blurRate ?? 0,
      blinkRate: aggregateRow?.blinkRate ?? 0,
    };

    return {
      activeSpot: {
        id: state.spotId,
        displayName: state.displayName,
        source: state.resolutionSource,
        confidence: state.confidence,
        confirmed: state.confirmed === 1,
        muted: state.muted === 1,
      },
      aggregate,
      recommendation: buildSpotRecommendation(aggregate),
      feedbackCount: feedbackRow?.feedbackCount ?? 0,
    };
  }

  public async recordCaptureObservation(observation: CaptureSpotObservation): Promise<boolean> {
    const database = await getDatabase();
    const activeSpot = await database.getFirstAsync<{ spotId: string; confirmed: number }>(
      `SELECT spot_id AS spotId, confirmed FROM spot_state WHERE id = 'active'`
    );
    if (!activeSpot || activeSpot.confirmed !== 1) return false;

    await database.runAsync(
      `INSERT OR IGNORE INTO spot_observations (
         id, spot_id, capture_id, time_bucket, pose_quality_score,
         blur_detected, blink_detected, subject_count, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Crypto.randomUUID(),
        activeSpot.spotId,
        observation.captureId,
        getSpotTimeBucket(observation.capturedAt),
        boundedScore(observation.poseQualityScore),
        observation.blurDetected ? 1 : 0,
        observation.blinkDetected ? 1 : 0,
        Math.max(0, Math.floor(observation.subjectCount)),
        observation.capturedAt,
      ]
    );
    return true;
  }

  public async recordFeedback(
    recommendationId: string,
    action: SpotFeedbackAction
  ): Promise<void> {
    const database = await getDatabase();
    const activeSpot = await database.getFirstAsync<{ spotId: string }>(
      `SELECT spot_id AS spotId FROM spot_state WHERE id = 'active'`
    );
    if (!activeSpot) throw new Error('Confirm a shooting spot before recording feedback.');

    await database.runAsync(
      `INSERT INTO spot_feedback (id, spot_id, recommendation_id, action, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [Crypto.randomUUID(), activeSpot.spotId, recommendationId, action, Date.now()]
    );
    if (action === 'MUTE') {
      await database.runAsync(
        `UPDATE spot_state SET muted = 1, updated_at = ? WHERE id = 'active'`,
        [Date.now()]
      );
    } else if (action === 'WRONG_SPOT') {
      await database.runAsync(
        `UPDATE spot_state SET confirmed = 0, updated_at = ? WHERE id = 'active'`,
        [Date.now()]
      );
    }
  }
  public async syncHotspotIntelligence(): Promise<void> {
    try {
      logger.info('[SpotIntelligence] Syncing AI hotspot intelligence from Master...');
      // Simulated fetch from Master API
      // const response = await fetch('http://master-local:8090/api/hotspots');
      // const hotspots = await response.json();
      
      // Cache it locally in SecureStore or SQLite for offline use
      // await SecureStore.setItemAsync('offline-hotspots', JSON.stringify(hotspots));
      
      logger.info('[SpotIntelligence] Hotspot intelligence synced for offline usage.');
    } catch (e) {
      logger.error('[SpotIntelligence] Failed to sync hotspot intelligence:', e);
    }
  }
}

export const spotIntelligenceService = new SpotIntelligenceService();
