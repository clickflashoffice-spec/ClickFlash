import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

export interface PhotographerSpot {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'busy' | 'break';
  currentPhotographer: string;
  waitTimeMins: number;
  bestTime: string;
  samplePhotoUrl: string;
  mapX: number;
  mapY: number;
}

interface HotspotTelemetryMessage {
  type: 'HOTSPOT_TELEMETRY';
  spot: Pick<
    PhotographerSpot,
    'id' | 'status' | 'currentPhotographer' | 'waitTimeMins'
  >;
}

const RESORT_SPOTS: PhotographerSpot[] = [
  {
    id: 'spot-1',
    name: 'Sunset Pier & Overwater Swings',
    location: 'West Beach Walkway',
    status: 'active',
    currentPhotographer: 'Marco S.',
    waitTimeMins: 0,
    bestTime: '5:30 PM - 7:00 PM (Golden Hour)',
    samplePhotoUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop',
    mapX: 18,
    mapY: 62,
  },
  {
    id: 'spot-2',
    name: 'Infinity Pool & Waterfall',
    location: 'Main Pavilion Upper Deck',
    status: 'active',
    currentPhotographer: 'Elena R.',
    waitTimeMins: 5,
    bestTime: '11:00 AM - 3:00 PM (Vibrant Blue)',
    samplePhotoUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=500&auto=format&fit=crop',
    mapX: 51,
    mapY: 38,
  },
  {
    id: 'spot-3',
    name: 'Tropical Botanical Gardens',
    location: 'Zen Pathway #4',
    status: 'busy',
    currentPhotographer: 'Lucas M.',
    waitTimeMins: 12,
    bestTime: '8:30 AM - 10:30 AM (Soft Morning Light)',
    samplePhotoUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=500&auto=format&fit=crop',
    mapX: 74,
    mapY: 24,
  },
  {
    id: 'spot-4',
    name: 'Private Beach Cabana Lounge',
    location: 'South Beach Zone B',
    status: 'active',
    currentPhotographer: 'Sarah T.',
    waitTimeMins: 0,
    bestTime: '4:00 PM - 6:00 PM',
    samplePhotoUrl: 'https://images.unsplash.com/photo-1510414842594-a61c69b5ae57?w=500&auto=format&fit=crop',
    mapX: 82,
    mapY: 70,
  },
];

interface ResortHotspotsMapModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectSpot?: (spot: PhotographerSpot) => void;
  telemetryUrl?: string;
  initialSpots?: PhotographerSpot[];
}

function isTelemetryMessage(value: unknown): value is HotspotTelemetryMessage {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<HotspotTelemetryMessage>;
  return (
    candidate.type === 'HOTSPOT_TELEMETRY' &&
    !!candidate.spot &&
    typeof candidate.spot.id === 'string' &&
    ['active', 'busy', 'break'].includes(candidate.spot.status ?? '') &&
    typeof candidate.spot.currentPhotographer === 'string' &&
    typeof candidate.spot.waitTimeMins === 'number'
  );
}

export function ResortHotspotsMapModal({
  visible,
  onClose,
  onSelectSpot,
  telemetryUrl,
  initialSpots = RESORT_SPOTS,
}: ResortHotspotsMapModalProps) {
  const [spots, setSpots] = useState(initialSpots);
  const [selectedSpotId, setSelectedSpotId] = useState(initialSpots[0]?.id ?? '');
  const [requestedMeet, setRequestedMeet] = useState<string | null>(null);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => setSpots(initialSpots), [initialSpots]);
  useEffect(() => {
    if (!visible || !telemetryUrl) return undefined;
    const socket = new WebSocket(telemetryUrl);
    socket.onmessage = (event) => {
      try {
        const message: unknown = JSON.parse(String(event.data));
        if (!isTelemetryMessage(message)) return;
        setSpots((current) =>
          current.map((spot) =>
            spot.id === message.spot.id ? { ...spot, ...message.spot } : spot,
          ),
        );
      } catch {
        // Static map data remains available when telemetry is malformed or offline.
      }
    };
    return () => socket.close();
  }, [telemetryUrl, visible]);

  const selectedSpot =
    spots.find((spot) => spot.id === selectedSpotId) ?? spots[0];
  const liveCount = spots.filter((spot) => spot.status !== 'break').length;
  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onUpdate((event) => {
          scale.value = Math.max(1, Math.min(3, savedScale.value * event.scale));
        })
        .onEnd(() => {
          savedScale.value = scale.value;
        }),
    [savedScale, scale],
  );
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .onUpdate((event) => {
          translateX.value = Math.max(
            -180,
            Math.min(180, savedTranslateX.value + event.translationX),
          );
          translateY.value = Math.max(
            -120,
            Math.min(120, savedTranslateY.value + event.translationY),
          );
        })
        .onEnd(() => {
          savedTranslateX.value = translateX.value;
          savedTranslateY.value = translateY.value;
        }),
    [savedTranslateX, savedTranslateY, translateX, translateY],
  );
  const mapGesture = useMemo(
    () => Gesture.Simultaneous(pinchGesture, panGesture),
    [panGesture, pinchGesture],
  );
  const mapStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const resetMap = () => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>Resort Photo Spots</Text>
            <Text style={styles.headerSubtitle}>Pinch, pan, and select a live location</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            accessibilityRole="button"
            accessibilityLabel="Close resort photo spot map"
          >
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.goldenHourCard}>
          <Text style={styles.goldenHourIcon}>🌅</Text>
          <View style={styles.goldenHourCopy}>
            <Text style={styles.goldenHourTitle}>Sunset golden hour in 2h 14m</Text>
            <Text style={styles.goldenHourDescription}>Peak light at 6:18 PM</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{liveCount} LIVE</Text>
          </View>
        </View>

        <View style={styles.mapViewport}>
          <GestureDetector gesture={mapGesture}>
            <Animated.View style={[styles.mapSurface, mapStyle]}>
              <Svg width="100%" height="100%" viewBox="0 0 1000 600">
                <Defs>
                  <LinearGradient id="water" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor="#0f766e" />
                    <Stop offset="1" stopColor="#082f49" />
                  </LinearGradient>
                </Defs>
                <Rect width="1000" height="600" fill="url(#water)" />
                <Path
                  d="M70 500 C170 390 230 430 330 310 C420 205 510 260 610 145 C730 10 885 90 960 25 L1000 0 L1000 600 L0 600 Z"
                  fill="#14532d"
                  opacity={0.92}
                />
                <Path
                  d="M90 490 C220 365 310 380 430 245 C560 95 700 120 920 35"
                  stroke="#fde68a"
                  strokeWidth={20}
                  strokeLinecap="round"
                  fill="none"
                  opacity={0.85}
                />
                <Circle cx="510" cy="225" r="82" fill="#38bdf8" opacity={0.72} />
                <SvgText x="510" y="230" textAnchor="middle" fill="#e0f2fe" fontSize="28">
                  Infinity Pool
                </SvgText>
                <SvgText x="735" y="110" textAnchor="middle" fill="#dcfce7" fontSize="26">
                  Botanical Gardens
                </SvgText>
              </Svg>
              {spots.map((spot) => {
                const selected = selectedSpot?.id === spot.id;
                return (
                  <TouchableOpacity
                    key={spot.id}
                    onPress={() => {
                      setSelectedSpotId(spot.id);
                      onSelectSpot?.(spot);
                    }}
                    style={[
                      styles.mapPin,
                      { left: `${spot.mapX}%`, top: `${spot.mapY}%` },
                      selected && styles.mapPinSelected,
                      spot.status === 'busy' && styles.mapPinBusy,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${spot.name}, ${spot.status}, ${spot.waitTimeMins} minute wait`}
                    accessibilityState={{ selected }}
                  >
                    <Text style={styles.mapPinIcon}>📷</Text>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </GestureDetector>
          <TouchableOpacity
            onPress={resetMap}
            style={styles.resetButton}
            accessibilityRole="button"
            accessibilityLabel="Reset map zoom and position"
          >
            <Text style={styles.resetButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {selectedSpot && (
          <ScrollView contentContainerStyle={styles.detailContainer}>
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderCopy}>
                <Text style={styles.spotName}>{selectedSpot.name}</Text>
                <Text style={styles.spotLocation}>{selectedSpot.location}</Text>
              </View>
              <Text style={styles.statusText}>
                {selectedSpot.status === 'active'
                  ? 'AVAILABLE'
                  : `${selectedSpot.waitTimeMins} MIN WAIT`}
              </Text>
            </View>
            <Text style={styles.detailText}>👤 {selectedSpot.currentPhotographer}</Text>
            <Text style={styles.detailText}>✨ {selectedSpot.bestTime}</Text>
            <TouchableOpacity
              style={[
                styles.meetButton,
                requestedMeet === selectedSpot.id && styles.meetButtonRequested,
              ]}
              onPress={() => setRequestedMeet(selectedSpot.id)}
              accessibilityRole="button"
            >
              <Text style={styles.meetButtonText}>
                {requestedMeet === selectedSpot.id
                  ? 'Notification sent'
                  : 'Meet photographer here'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#09090b' },
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#27272a',
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSubtitle: { color: '#a1a1aa', fontSize: 13, marginTop: 2 },
  closeButton: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272a',
    borderRadius: 24,
  },
  closeButtonText: { color: '#fff', fontWeight: '700' },
  goldenHourCard: {
    margin: 16,
    marginBottom: 12,
    padding: 14,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4338ca',
    backgroundColor: '#1e1b4b',
  },
  goldenHourIcon: { fontSize: 24, marginRight: 10 },
  goldenHourCopy: { flex: 1 },
  goldenHourTitle: { color: '#e0e7ff', fontSize: 14, fontWeight: '700' },
  goldenHourDescription: { color: '#a5b4fc', fontSize: 12, marginTop: 2 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10b981' },
  liveText: { color: '#10b981', fontSize: 10, fontWeight: '800', marginLeft: 5 },
  mapViewport: {
    height: 330,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#082f49',
  },
  mapSurface: { flex: 1 },
  mapPin: {
    position: 'absolute',
    width: 48,
    height: 48,
    marginLeft: -24,
    marginTop: -24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderWidth: 3,
    borderColor: '#d1fae5',
  },
  mapPinSelected: { backgroundColor: '#2563eb', borderColor: '#dbeafe' },
  mapPinBusy: { backgroundColor: '#d97706', borderColor: '#fef3c7' },
  mapPinIcon: { fontSize: 20 },
  resetButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    minWidth: 56,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(9, 9, 11, 0.82)',
  },
  resetButtonText: { color: '#fff', fontWeight: '700' },
  detailContainer: { padding: 18, paddingBottom: 36 },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  detailHeaderCopy: { flex: 1, paddingRight: 12 },
  spotName: { color: '#fff', fontSize: 17, fontWeight: '800' },
  spotLocation: { color: '#94a3b8', fontSize: 13, marginTop: 3 },
  statusText: { color: '#34d399', fontSize: 11, fontWeight: '800' },
  detailText: { color: '#cbd5e1', fontSize: 13, marginTop: 10 },
  meetButton: {
    minHeight: 48,
    marginTop: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
  },
  meetButtonRequested: { backgroundColor: '#059669' },
  meetButtonText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
