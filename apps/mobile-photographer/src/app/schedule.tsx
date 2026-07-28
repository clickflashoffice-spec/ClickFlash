import React, { useEffect, useState, useCallback, memo } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { ShiftService } from '@/services/ShiftService';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing, MaxContentWidth, BottomTabInset, Typography } from '@/constants/theme';
import { useColorScheme } from 'react-native';
import { logger } from "@/utils/logger";

// Haversine formula to calculate distance between two coordinates in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Mock Target Resort (e.g., Sunset Pier)
const TARGET_LOCATION = { latitude: 20.6296, longitude: -87.0739 };
const GEO_FENCE_RADIUS = 150; // meters

// Mock Booking Data
const MOCK_BOOKINGS = [
  { id: '1', time: '14:00 - 15:00', guest: 'Smith Family', room: 'A402', package: 'VIP Sunset' },
  { id: '2', time: '15:30 - 16:30', guest: 'Johnson Party', room: 'B112', package: 'Standard Beach' },
  { id: '3', time: '17:00 - 18:00', guest: 'Doe Wedding', room: 'VILLA 1', package: 'Platinum Event' },
  { id: '4', time: '18:15 - 19:15', guest: 'Williams', room: 'C205', package: 'Mini Shoot' },
  { id: '5', time: '19:30 - 20:30', guest: 'Brown Couple', room: 'D301', package: 'VIP Sunset' },
];

// React.memo for high performance FlatList rendering
const BookingRow = memo(({ 
  item, 
  canCheckIn, 
  colors 
}: { 
  item: typeof MOCK_BOOKINGS[0], 
  canCheckIn: boolean,
  colors: typeof Colors.dark 
}) => {
  return (
    <View style={[styles.bookingCard, { backgroundColor: colors.surface, borderColor: colors.elevated }]}>
      <View style={styles.bookingHeader}>
        <ThemedText style={[styles.bookingTime, { color: colors.tint }]}>{item.time}</ThemedText>
        <ThemedText style={styles.bookingPackage}>{item.package}</ThemedText>
      </View>
      <View style={styles.bookingBody}>
        <ThemedText style={styles.bookingGuest}>{item.guest}</ThemedText>
        <ThemedText style={styles.bookingRoom}>RM: {item.room}</ThemedText>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.checkInButton, 
          { backgroundColor: canCheckIn ? colors.success : colors.elevated }
        ]}
        disabled={!canCheckIn}
        activeOpacity={0.8}
      >
        <ThemedText style={[
          styles.checkInButtonText, 
          { color: canCheckIn ? '#070a12' : colors.textSecondary }
        ]}>
          {canCheckIn ? 'CHECK IN NOW' : 'OUT OF RANGE / OFF SHIFT'}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
});
BookingRow.displayName = 'BookingRow';

export default function ScheduleScreen() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'light' ? 'light' : 'dark'];
  
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  
  // Biometric Shift State
  const [isShiftActive, setIsShiftActive] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('GPS Permission Denied');
        return;
      }

      // Initial fetch
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);

      // Subscribe to location updates
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
        (newLoc) => {
          setLocation(newLoc);
          const d = getDistance(
            newLoc.coords.latitude, 
            newLoc.coords.longitude, 
            TARGET_LOCATION.latitude, 
            TARGET_LOCATION.longitude
          );
          setDistance(d);
        }
      );

      return () => subscription.remove();
    })();
  }, []);

  const handleClockIn = async () => {
    try {
      Alert.alert(
        "Start Biometric Shift",
        "Choose authentication method:",
        [
          {
            text: "Face Vector Verify",
            onPress: async () => {
              const event = await ShiftService.getInstance().logShift('PHOTO-101', 'CLOCK_IN', 'FACE_VECTOR', 0.95);
              if (event) {
                setIsShiftActive(true);
                Alert.alert("Shift Started", "Face Vector verified and shift logged to ecosystem.");
              } else {
                Alert.alert("Clock In Failed", "Biometric verification unsuccessful.");
              }
            }
          },
          {
            text: "Device Passcode / Face ID",
            onPress: async () => {
              const event = await ShiftService.getInstance().logShift('PHOTO-101', 'CLOCK_IN', 'LOCAL_AUTH', 1.0);
              if (event) {
                setIsShiftActive(true);
                Alert.alert("Shift Started", "Device authentication verified and shift logged.");
              } else {
                Alert.alert("Clock In Failed", "Device authentication unsuccessful.");
              }
            }
          },
          { text: "Cancel", style: "cancel" }
        ]
      );
    } catch (e) {
      logger.warn(e);
      Alert.alert("Error", "Biometric authentication error.");
    }
  };

  const handleClockOut = () => {
    Alert.alert(
      "End Shift",
      "Are you sure you want to clock out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Clock Out", 
          style: "destructive", 
          onPress: async () => {
            await ShiftService.getInstance().logShift('PHOTO-101', 'CLOCK_OUT', 'LOCAL_AUTH', 1.0);
            setIsShiftActive(false);
          } 
        }
      ]
    );
  };

  const isWithinRange = distance !== null && distance <= GEO_FENCE_RADIUS;
  const canPerformCheckIn = isWithinRange && isShiftActive;

  const renderItem = useCallback(({ item }: { item: typeof MOCK_BOOKINGS[0] }) => (
    <BookingRow item={item} canCheckIn={canPerformCheckIn} colors={colors} />
  ), [canPerformCheckIn, colors]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        
        {/* Biometric Shift Widget */}
        <View style={[styles.shiftWidget, { backgroundColor: colors.surface, borderColor: colors.elevated }]}>
          <View style={styles.geoFenceHeader}>
            <ThemedText style={styles.geoFenceTitle}>SHIFT STATUS</ThemedText>
            <View style={[styles.statusDot, { backgroundColor: isShiftActive ? colors.success : colors.danger }]} />
          </View>
          
          <ThemedText style={[styles.geoFenceText, { color: isShiftActive ? colors.success : colors.danger }]}>
            {isShiftActive ? 'ON SHIFT' : 'OFF DUTY'}
          </ThemedText>

          {!isShiftActive ? (
            <>
              <TouchableOpacity 
                style={[styles.clockButton, { backgroundColor: colors.tint, marginTop: Spacing.four }]}
                onPress={handleClockIn}
                activeOpacity={0.8}
              >
                <ThemedText style={styles.clockButtonText}>CLOCK IN (FACE SCAN)</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.enrollLinkButton, { borderColor: colors.elevated, marginTop: Spacing.two }]}
                onPress={() => router.push('/enroll-face')}
                activeOpacity={0.8}
              >
                <ThemedText style={[styles.enrollLinkText, { color: colors.textSecondary }]}>ENROLL BIOMETRIC PROFILE →</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.clockButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger, marginTop: Spacing.four }]}
              onPress={handleClockOut}
              activeOpacity={0.8}
            >
              <ThemedText style={[styles.clockButtonText, { color: colors.danger }]}>CLOCK OUT</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Geo-Fence Widget */}
        <View style={[styles.geoFenceWidget, { 
            backgroundColor: colors.surface, 
            borderColor: isWithinRange ? colors.success : (errorMsg ? colors.danger : colors.elevated) 
          }]}>
          <View style={styles.geoFenceHeader}>
            <ThemedText style={styles.geoFenceTitle}>LOCATION STATUS</ThemedText>
            <View style={[styles.statusDot, { 
                backgroundColor: isWithinRange ? colors.success : (errorMsg ? colors.danger : colors.warning) 
              }]} />
          </View>
          
          <ThemedText style={[styles.geoFenceText, { 
              color: isWithinRange ? colors.success : (errorMsg ? colors.danger : colors.textSecondary) 
            }]}>
            {errorMsg 
              ? errorMsg 
              : distance === null 
                ? 'ACQUIRING SATELLITES...' 
                : isWithinRange 
                  ? `WITHIN RANGE (${Math.round(distance)}m)` 
                  : `OUT OF BOUNDS (${Math.round(distance / 1000)}km)`}
          </ThemedText>
        </View>

        {/* Timeline List */}
        <FlatList
          data={MOCK_BOOKINGS}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <ThemedText style={styles.timelineHeader}>TODAY&apos;S MISSIONS</ThemedText>
          }
        />

      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
    paddingTop: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
  },
  shiftWidget: {
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  clockButton: {
    height: 56, // Fitts' law compliant
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clockButtonText: {
    fontFamily: Typography.fontMono,
    fontSize: 16,
    fontWeight: '900',
    color: '#070a12',
    letterSpacing: 1,
  },
  geoFenceWidget: {
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: Spacing.four,
  },
  geoFenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  geoFenceTitle: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#94a3b8',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  geoFenceText: {
    fontFamily: Typography.fontMono,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
  timelineHeader: {
    fontFamily: Typography.fontMono,
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 2,
    color: '#94a3b8',
    marginBottom: Spacing.four,
  },
  listContent: {
    paddingBottom: Spacing.eight,
    gap: Spacing.four,
  },
  bookingCard: {
    padding: Spacing.four,
    borderRadius: 12,
    borderWidth: 1,
    gap: Spacing.three,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingTime: {
    fontFamily: Typography.fontMono,
    fontSize: 16,
    fontWeight: '900',
  },
  bookingPackage: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bookingBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  bookingGuest: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  bookingRoom: {
    fontFamily: Typography.fontMono,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  checkInButton: {
    height: 56, // >= 48dp Fitts' Law
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  checkInButtonText: {
    fontFamily: Typography.fontMono,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  enrollLinkButton: {
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enrollLinkText: {
    fontFamily: Typography.fontMono,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
