import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  type VerifiedCommandCenterSnapshot,
  photographerCommandCenterClient,
} from '@/services/PhotographerCommandCenterClient';
import {
  UNAVAILABLE_METRIC,
  formatBasisPoints,
  formatMinorUnits,
  freshnessLabel,
  qualityFlagRateBps,
} from '@/services/PhotographerCommandCenterModel';
import type { MobileCommandCenterPeriod } from '@/services/MasterCaptureProtocol';

type ErrorKind = 'ERROR' | 'UNPAIRED';
type LoadMode = 'INITIAL' | 'REFRESH';

interface LoadError {
  kind: ErrorKind;
  message: string;
}

const PERIODS: readonly {
  value: MobileCommandCenterPeriod;
  label: string;
  accessibilityLabel: string;
}[] = [
  { value: 'TODAY', label: 'TODAY', accessibilityLabel: 'Today' },
  { value: '7D', label: '7 DAYS', accessibilityLabel: 'Last 7 days' },
  { value: '30D', label: '30 DAYS', accessibilityLabel: 'Last 30 days' },
];

const Badge = memo(function Badge({
  label,
  color,
}: {
  label: string;
  color: 'warning' | 'success' | 'danger';
}) {
  const borderColors = {
    warning: 'border-warning',
    success: 'border-success',
    danger: 'border-danger',
  };
  const bgColors = {
    warning: 'bg-warning',
    success: 'bg-success',
    danger: 'bg-danger',
  };
  const textColors = {
    warning: 'text-warning',
    success: 'text-success',
    danger: 'text-danger',
  };

  return (
    <View
      accessible
      accessibilityLabel={label}
      className={`items-center rounded-full border flex-row gap-1.5 min-h-[32px] px-3 ${borderColors[color]}`}
    >
      <View className={`rounded h-2 w-2 ${bgColors[color]}`} />
      <ThemedText className={`font-mono text-[10px] font-black tracking-[0.7px] ${textColors[color]}`}>{label}</ThemedText>
    </View>
  );
});
Badge.displayName = 'Badge';

const MetricCard = memo(function MetricCard({
  label,
  value,
  supportingText,
}: {
  label: string;
  value: string;
  supportingText: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}. ${supportingText}`}
      className="rounded-[14px] border grow min-w-[46%] p-4 bg-surface border-elevated"
    >
      <ThemedText className="text-[#94a3b8] font-mono text-[10px] font-black tracking-[1px]">{label}</ThemedText>
      <ThemedText
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        numberOfLines={1}
        className="font-mono text-[26px] font-black leading-[34px] mt-2"
      >
        {value}
      </ThemedText>
      <ThemedText className="text-xs leading-[17px] mt-1 text-secondary">
        {supportingText}
      </ThemedText>
    </View>
  );
});
MetricCard.displayName = 'MetricCard';

const DetailRow = memo(function DetailRow({
  label,
  value,
  detail,
  valueColorClass,
}: {
  label: string;
  value: string;
  detail?: string;
  valueColorClass?: 'secondary' | 'warning' | 'success';
}) {
  const textColors = {
    secondary: 'text-secondary',
    warning: 'text-warning',
    success: 'text-success',
  };

  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value}${detail ? `. ${detail}` : ''}`}
      className="items-center border-b flex-row gap-3 justify-between min-h-[62px] py-2 border-elevated"
    >
      <View className="flex-1">
        <ThemedText className="text-[15px] font-bold leading-5">{label}</ThemedText>
        {detail ? (
          <ThemedText className="text-[11px] leading-4 mt-0.5 text-secondary">
            {detail}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText
        className={`shrink font-mono text-[15px] font-black text-right ${
          valueColorClass ? textColors[valueColorClass] : ''
        }`}
      >
        {value}
      </ThemedText>
    </View>
  );
});
DetailRow.displayName = 'DetailRow';

const EmptyState = memo(function EmptyState({
  error,
  loading,
  onRetry,
}: {
  error: LoadError | null;
  loading: boolean;
  onRetry: () => void;
}) {
  const title = loading
    ? 'VERIFYING MASTER DATA'
    : error?.kind === 'UNPAIRED'
      ? 'PAIRING REQUIRED'
      : 'DATA UNAVAILABLE';
  const message = loading
    ? 'Authenticating this device and loading the self-only snapshot.'
    : error?.message ?? 'The performance snapshot could not be loaded.';

  return (
    <View
      accessibilityLiveRegion="polite"
      className="items-center rounded-[14px] border justify-center min-h-[280px] p-5 bg-surface border-elevated"
    >
      <ThemedText className="font-mono text-base font-black tracking-[1.5px] text-center">{title}</ThemedText>
      <ThemedText className="leading-[22px] mt-2 text-center text-secondary">
        {message}
      </ThemedText>
      {!loading ? (
        <TouchableOpacity
          accessibilityHint="Attempts to load the selected performance period again"
          accessibilityLabel="Retry performance data"
          accessibilityRole="button"
          activeOpacity={0.75}
          onPress={onRetry}
          className="items-center rounded-[10px] justify-center mt-4 min-h-[52px] min-w-[160px] px-4 bg-tint"
        >
          <ThemedText className="text-[#070a12] font-mono text-[13px] font-black tracking-[1.2px]">TRY AGAIN</ThemedText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
});
EmptyState.displayName = 'EmptyState';

function normalizeLoadError(error: unknown): LoadError {
  const fallback = 'Master could not provide a verified performance snapshot.';
  if (!(error instanceof Error)) return { kind: 'ERROR', message: fallback };

  const message = error.message.trim().slice(0, 180);
  if (message.startsWith('Pair this Android device with ClickFlash Master')) {
    return {
      kind: 'UNPAIRED',
      message: 'Ask an administrator to pair this Android device to your photographer profile.',
    };
  }
  return { kind: 'ERROR', message: message || fallback };
}

function formatCount(value: number | null): string {
  return value === null ? UNAVAILABLE_METRIC : new Intl.NumberFormat().format(value);
}

const PerformanceScreen = memo(function PerformanceScreen() {
  const [period, setPeriod] = useState<MobileCommandCenterPeriod>('TODAY');
  const [result, setResult] = useState<VerifiedCommandCenterSnapshot | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const requestSequence = useRef(0);

  const loadSnapshot = useCallback(async (mode: LoadMode) => {
    const sequence = ++requestSequence.current;
    setError(null);
    if (mode === 'INITIAL') {
      setLoading(true);
      setResult(null);
    } else {
      setRefreshing(true);
    }

    try {
      const nextResult = await photographerCommandCenterClient.fetchSnapshot(period);
      if (sequence === requestSequence.current) setResult(nextResult);
    } catch (loadError) {
      if (sequence === requestSequence.current) {
        setResult(null);
        setError(normalizeLoadError(loadError));
      }
    } finally {
      if (sequence === requestSequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [period]);

  useEffect(() => {
    void loadSnapshot('INITIAL');
    return () => {
      requestSequence.current += 1;
    };
  }, [loadSnapshot]);

  const handleRefresh = useCallback(() => {
    void loadSnapshot('REFRESH');
  }, [loadSnapshot]);

  const snapshot = result?.snapshot ?? null;
  const formatted = useMemo(() => {
    if (!snapshot) return null;
    const money = (value: number | null) =>
      formatMinorUnits(
        value,
        snapshot.scope.currency,
        snapshot.scope.currencyExponent
      );
    return {
      gross: money(snapshot.sales.grossMinor),
      settlement: money(snapshot.sales.settledMinor),
      payable: money(snapshot.earnings.payableMinor),
      revenueTarget: money(snapshot.performance.revenueTargetMinor),
      qualityRate: formatBasisPoints(qualityFlagRateBps(snapshot)),
    };
  }, [snapshot]);

  return (
    <ThemedView className="flex-1 flex-row justify-center bg-background">
      <SafeAreaView className="flex-1 w-full max-w-[1024px]">
        <ScrollView
          contentContainerClassName="pb-28 px-4 pt-4"
          refreshControl={
            <RefreshControl
              onRefresh={handleRefresh}
              refreshing={refreshing}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View className="items-start flex-row gap-3 justify-between">
            <View className="flex-1">
              <ThemedText className="text-[#94a3b8] font-mono text-[11px] font-extrabold tracking-[1.5px]">PHOTOGRAPHER COMMAND CENTER</ThemedText>
              <ThemedText accessibilityRole="header" className="text-[30px] font-extrabold tracking-[-0.8px] leading-[36px] mt-1">
                Revenue & Performance
              </ThemedText>
              <ThemedText className="text-[14px] leading-5 mt-1 text-secondary">
                Self-only operational data from ClickFlash Master
              </ThemedText>
            </View>
            <TouchableOpacity
              accessibilityLabel="Refresh performance data"
              accessibilityRole="button"
              activeOpacity={0.75}
              disabled={loading || refreshing}
              onPress={handleRefresh}
              className={`items-center rounded-[10px] border justify-center min-h-[48px] px-3 border-elevated ${
                (loading || refreshing) ? 'opacity-50' : ''
              }`}
            >
              <ThemedText className="font-mono text-[11px] font-black tracking-[1px] text-tint">
                {refreshing ? 'SYNCING' : 'REFRESH'}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <View accessibilityRole="radiogroup" className="flex-row gap-2 mb-4 mt-4">
            {PERIODS.map((option) => {
              const selected = option.value === period;
              return (
                <TouchableOpacity
                  key={option.value}
                  accessibilityLabel={option.accessibilityLabel}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  activeOpacity={0.75}
                  onPress={() => setPeriod(option.value)}
                  className={`items-center rounded-[10px] border flex-1 justify-center min-h-[48px] ${
                    selected ? 'bg-tint border-tint' : 'bg-surface border-elevated'
                  }`}
                >
                  <ThemedText
                    className={`font-mono text-[11px] font-black tracking-[0.8px] ${
                      selected ? 'text-background' : 'text-secondary'
                    }`}
                  >
                    {option.label}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          {!result || !snapshot || !formatted ? (
            <EmptyState
              error={error}
              loading={loading}
              onRetry={handleRefresh}
            />
          ) : (
            <>
              <View className="flex-row flex-wrap gap-2 mb-4">
                <Badge label="OPERATIONAL / PROVISIONAL" color="warning" />
                <Badge label="AEAD + HMAC VERIFIED" color="success" />
                <Badge
                  label={freshnessLabel(snapshot)}
                  color={snapshot.sync.stale ? 'danger' : 'success'}
                />
              </View>

              <View
                accessibilityLiveRegion="polite"
                className="rounded-xl border mb-4 p-4 bg-surface border-warning"
              >
                <ThemedText className="font-mono text-xs font-black tracking-[1px] text-warning"> 
                  PAYLOAD PROTECTED / TLS PENDING
                </ThemedText>
                <ThemedText className="text-sm leading-5 mt-1 text-secondary"> 
                  Revenue payloads are AES-GCM encrypted and authenticated. Managed TLS is
                  still required to hide network metadata and protect every mobile flow.
                </ThemedText>
              </View>

              <View className="flex-row flex-wrap gap-3 mb-4">
                <MetricCard
                  label="OPERATIONAL GROSS"
                  supportingText="Completed and delivered orders; not settlement"
                  value={formatted.gross}
                />
                <MetricCard
                  label="PHOTOS CATALOGUED"
                  supportingText="Selected operational period"
                  value={formatCount(snapshot.activity.photosCatalogued)}
                />
                <MetricCard
                  label="COMPLETED ORDERS"
                  supportingText="Operational order state"
                  value={formatCount(snapshot.sales.completedOrders)}
                />
              </View>

              <View className="rounded-[14px] border mb-4 p-4 bg-surface border-elevated">
                <ThemedText accessibilityRole="header" className="text-[#94a3b8] font-mono text-xs font-black tracking-[1.5px] mb-2">
                  DRIVERS & GUARDRAILS
                </ThemedText>
                <DetailRow
                  label="Distinct photos sold"
                  value={formatCount(snapshot.activity.distinctPhotosSold)}
                />
                <DetailRow
                  label="Photo sell-through"
                  value={formatBasisPoints(snapshot.performance.photoSellThroughBps)}
                />
                <DetailRow
                  detail={`${formatCount(snapshot.activity.qualityFlagged)} flagged`}
                  label="Quality flag rate"
                  value={formatted.qualityRate}
                  valueColorClass={
                    snapshot.activity.qualityFlagged > 0 ? 'warning' : 'success'
                  }
                />
                <DetailRow
                  detail="Monthly configuration; not normalized to the selected range"
                  label="Configured monthly revenue target"
                  value={formatted.revenueTarget}
                />
                <DetailRow
                  detail="Daily configuration; not multiplied across the selected range"
                  label="Configured daily photo target"
                  value={formatCount(snapshot.performance.photoTarget)}
                />
                <ThemedText className="text-xs leading-[18px] mt-3 text-secondary">
                  Target progress is withheld until cadence and working-day policy are defined.
                  Targets are not commission or payout calculations.
                </ThemedText>
              </View>

              <View className="rounded-[14px] border mb-4 p-4 bg-surface border-elevated">
                <ThemedText accessibilityRole="header" className="text-[#94a3b8] font-mono text-xs font-black tracking-[1.5px] mb-2">
                  FINANCIAL & SHIFT READINESS
                </ThemedText>
                <DetailRow
                  detail={`Completeness: ${snapshot.completeness.settlement}`}
                  label="Settled revenue"
                  value={formatted.settlement}
                  valueColorClass="secondary"
                />
                <DetailRow
                  detail={`Completeness: ${snapshot.completeness.earnings}`}
                  label="Payable earnings"
                  value={formatted.payable}
                  valueColorClass="secondary"
                />
                <DetailRow
                  detail={`Completeness: ${snapshot.completeness.shifts}`}
                  label="Verified shift"
                  value={
                    snapshot.shift.verification === 'VERIFIED'
                      ? snapshot.shift.state.replace('_', ' ')
                      : UNAVAILABLE_METRIC
                  }
                  valueColorClass="secondary"
                />
              </View>

              {snapshot.completeness.issues.length > 0 ? (
                <View className="rounded-[14px] border mb-4 p-4 bg-surface border-elevated">
                  <ThemedText accessibilityRole="header" className="text-[#94a3b8] font-mono text-xs font-black tracking-[1.5px] mb-2">
                    DATA COMPLETENESS
                  </ThemedText>
                  {snapshot.completeness.issues.map((issue) => (
                    <View key={issue} className="items-start flex-row gap-2 mt-2">
                      <View className="rounded-[3px] h-[6px] mt-[7px] w-[6px] bg-warning" />
                      <ThemedText className="flex-1 text-[13px] leading-[19px] text-secondary">
                        {issue}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ) : null}

              <View accessible className="gap-1 px-1">
                <ThemedText className="font-mono text-[10px] leading-[15px] text-secondary">
                  Source: {snapshot.source} · generated {new Date(snapshot.generatedAt).toLocaleString()}
                </ThemedText>
                <ThemedText className="font-mono text-[10px] leading-[15px] text-secondary">
                  Integrity verified {new Date(result.verifiedAt).toLocaleString()} · Master {result.masterId}
                </ThemedText>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
});
PerformanceScreen.displayName = 'PerformanceScreen';

export default PerformanceScreen;


