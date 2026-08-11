import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  spotIntelligenceService,
  type SpotCandidate,
  type SpotDashboard,
  type SpotFeedbackAction,
} from '@/services/SpotIntelligenceService';

function percentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function ScoutScreen() {
  const [dashboard, setDashboard] = useState<SpotDashboard | null>(null);
  const [candidate, setCandidate] = useState<SpotCandidate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setDashboard(await spotIntelligenceService.getDashboard());
  }, []);

  useEffect(() => {
    let active = true;
    void spotIntelligenceService.getDashboard().then(
      (nextDashboard) => {
        if (active) setDashboard(nextDashboard);
      },
      () => {
        if (active) setError('Scout could not read its local profile.');
      }
    );
    return () => {
      active = false;
    };
  }, []);

  const locateCandidate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await spotIntelligenceService.resolveGpsCandidate();
      setCandidate(result.candidate);
      setError(result.unavailableReason);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Spot lookup failed.');
    } finally {
      setBusy(false);
    }
  }, []);

  const confirmCandidate = useCallback(async () => {
    if (!candidate) return;
    setBusy(true);
    setError(null);
    try {
      await spotIntelligenceService.confirmCandidate(candidate);
      setCandidate(null);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Spot confirmation failed.');
    } finally {
      setBusy(false);
    }
  }, [candidate, refresh]);

  const recordFeedback = useCallback(async (action: SpotFeedbackAction) => {
    if (!dashboard) return;
    setBusy(true);
    setError(null);
    try {
      await spotIntelligenceService.recordFeedback(dashboard.recommendation.id, action);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Feedback could not be saved.');
    } finally {
      setBusy(false);
    }
  }, [dashboard, refresh]);

  if (!dashboard) {
    return (
      <ThemedView className="flex-1 items-center justify-center gap-4">
        <ActivityIndicator className="text-tint" size="large" />
        <ThemedText type="code" themeColor="textSecondary">LOADING LOCAL SPOT PROFILE</ThemedText>
      </ThemedView>
    );
  }

  const { activeSpot, aggregate, recommendation } = dashboard;
  const activeAndConfirmed = Boolean(activeSpot?.confirmed);

  return (
    <ThemedView className="flex-1">
      <ScrollView contentContainerClassName="p-5 pb-[120px] gap-4">
        <View className="flex-row items-center justify-between gap-3">
          <View>
            <ThemedText type="code" themeColor="textSecondary">SCOUT / SPOT INTELLIGENCE</ThemedText>
            <ThemedText className="text-[34px] leading-[42px] font-extrabold mt-1">Field Coach</ThemedText>
          </View>
          <View className="border border-success rounded-full px-3 py-2">
            <ThemedText type="code" themeColor="success">LOCAL + PRIVATE</ThemedText>
          </View>
        </View>

        <View className="border border-elevated rounded-[24px] p-5 gap-3 bg-surface">
          <View className="flex-row items-center justify-between gap-3">
            <ThemedText type="code" themeColor="textSecondary">ACTIVE SHOOTING SPOT</ThemedText>
            <View className={`w-3 h-3 rounded-full ${activeAndConfirmed ? 'bg-success' : 'bg-warning'}`} />
          </View>
          <ThemedText className="text-[25px] leading-8 font-extrabold">
            {activeSpot?.displayName ?? 'NO CONFIRMED SPOT'}
          </ThemedText>
          <ThemedText themeColor="textSecondary">
            {activeSpot
              ? `${activeSpot.source} · ${percentage(activeSpot.confidence)} resolver confidence`
              : 'GPS can propose a coarse area, but the photographer must confirm it.'}
          </ThemedText>

          {candidate ? (
            <View className="border border-tint rounded-[18px] p-4 gap-2 mt-2">
              <ThemedText type="code" themeColor="tint">CANDIDATE / CONFIRMATION REQUIRED</ThemedText>
              <ThemedText className="text-xl leading-7 font-extrabold">{candidate.displayName}</ThemedText>
              <ThemedText themeColor="textSecondary">
                {percentage(candidate.confidence)} confidence · accuracy about {Math.round(candidate.accuracyMeters)} m
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Confirm this shooting spot"
                disabled={busy}
                onPress={confirmCandidate}
                className="min-h-[56px] rounded-2xl items-center justify-center mt-2 bg-success">
                <ThemedText type="code" className="text-[#071018] text-[15px]">CONFIRM THIS SPOT</ThemedText>
              </Pressable>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Locate a coarse shooting spot candidate"
              disabled={busy}
              onPress={locateCandidate}
              className="min-h-[56px] rounded-2xl items-center justify-center mt-2 bg-tint">
              <ThemedText type="code" className="text-[#071018] text-[15px]">
                {busy ? 'LOCATING…' : 'LOCATE CANDIDATE'}
              </ThemedText>
            </Pressable>
          )}
          {error ? <ThemedText themeColor="danger" className="mt-1">{error}</ThemedText> : null}
        </View>

        <View className="border border-elevated rounded-[24px] p-5 gap-3 bg-surface">
          <View className="flex-row items-center justify-between gap-3">
            <ThemedText type="code" themeColor="textSecondary">WHAT WORKS HERE</ThemedText>
            <ThemedText type="code" themeColor={recommendation.profileReady ? 'success' : 'warning'}>
              {recommendation.profileReady ? 'PROFILE READY' : 'COLD START'}
            </ThemedText>
          </View>
          <ThemedText className="text-[25px] leading-8 font-extrabold">{recommendation.title}</ThemedText>
          <ThemedText className="text-[19px] leading-7 font-bold">{recommendation.guidance}</ThemedText>
          <View className="rounded-2xl p-4 gap-2 bg-background">
            <ThemedText type="small" themeColor="textSecondary">WHY</ThemedText>
            <ThemedText>{recommendation.reason}</ThemedText>
          </View>
          <View className="flex-row gap-2 flex-wrap">
            <Metric label="SAMPLES" value={String(recommendation.supportingSampleCount)} />
            <Metric label="CONFIDENCE" value={percentage(recommendation.confidence)} />
            <Metric label="EXPECTED" value={recommendation.expectedImprovement} compact />
          </View>

          {activeAndConfirmed && recommendation.profileReady && !activeSpot?.muted ? (
            <View className="flex-row gap-2 flex-wrap mt-2">
              <FeedbackButton label="ACCEPT" colorClass="border-success" onPress={() => recordFeedback('ACCEPT')} />
              <FeedbackButton label="DISMISS" colorClass="border-elevated" onPress={() => recordFeedback('DISMISS')} />
              <FeedbackButton label="WRONG SPOT" colorClass="border-danger" onPress={() => recordFeedback('WRONG_SPOT')} />
            </View>
          ) : null}
        </View>

        <View className="border border-elevated rounded-[24px] p-5 gap-3 bg-surface">
          <ThemedText type="code" themeColor="textSecondary">LOCAL QUALITY BASELINE</ThemedText>
          <View className="flex-row gap-2 flex-wrap">
            <Metric label="POSE" value={aggregate.sampleCount ? percentage(aggregate.averagePoseQuality) : '—'} />
            <Metric label="BLUR" value={aggregate.sampleCount ? percentage(aggregate.blurRate) : '—'} />
            <Metric label="BLINK" value={aggregate.sampleCount ? percentage(aggregate.blinkRate) : '—'} />
          </View>
        </View>

        <View className="border rounded-[18px] p-4 gap-2 border-elevated">
          <ThemedText type="code" themeColor="tint">PRIVACY BOUNDARY</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Scout stores a device-salted area ID, time bucket, and aggregate quality flags. It does not store customer identity, face embeddings, room numbers, or precise location history. Camera settings remain recommendations only.
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

interface MetricProps {
  label: string;
  value: string;
  compact?: boolean;
}

const Metric = memo(({ label, value, compact = false }: MetricProps) => (
  <View className={`min-w-[92px] flex-1 gap-1 ${compact ? 'grow-[2]' : ''}`}>
    <ThemedText type="code" themeColor="textSecondary">{label}</ThemedText>
    <ThemedText className="font-mono text-base leading-[22px] font-bold" numberOfLines={compact ? 2 : 1}>{value}</ThemedText>
  </View>
));
Metric.displayName = 'Metric';

interface FeedbackButtonProps {
  label: string;
  colorClass: string;
  onPress: () => void;
}

const FeedbackButton = memo(({ label, colorClass, onPress }: FeedbackButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    onPress={onPress}
    className={`min-h-[44px] grow border rounded-xl px-3 items-center justify-center ${colorClass}`}>
    <ThemedText type="code">{label}</ThemedText>
  </Pressable>
));
FeedbackButton.displayName = 'FeedbackButton';

export default memo(ScoutScreen);
