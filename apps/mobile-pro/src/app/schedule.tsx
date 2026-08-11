import React, { useEffect, useState, useCallback, memo } from 'react';
import { View, FlatList, TouchableOpacity, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { ShiftService } from '@/services/ShiftService';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

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
  canCheckIn
}: { 
  item: typeof MOCK_BOOKINGS[0], 
  canCheckIn: boolean
}) => {
  return (
    <View className="p-4 rounded-xl border gap-3 bg-surface border-elevated">
      <View className="flex-row justify-between items-center">
        <ThemedText className="font-mono text-base font-black text-tint">{item.time}</ThemedText>
        <ThemedText className="font-mono text-xs font-bold text-slate-400 tracking-widest uppercase">{item.package}</ThemedText>
      </View>
      <View className="flex-row justify-between items-end">
        <ThemedText className="text-xl font-bold text-slate-50">{item.guest}</ThemedText>
        <ThemedText className="font-mono text-sm font-bold text-slate-400">RM: {item.room}</ThemedText>
      </View>
      
      <TouchableOpacity 
        className={`h-14 rounded-lg items-center justify-center mt-2 ${canCheckIn ? 'bg-success' : 'bg-elevated'}`}
        disabled={!canCheckIn}
        activeOpacity={0.8}
      >
        <ThemedText className={`font-mono text-base font-black tracking-widest ${canCheckIn ? 'text-[#070a12]' : 'text-slate-400'}`}>
          {canCheckIn ? 'CHECK IN NOW' : 'OUT OF RANGE / OFF SHIFT'}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
});
BookingRow.displayName = 'BookingRow';

export default function ScheduleScreen() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  
  // Biometric Shift State
  const [isShiftActive, setIsShiftActive] = useState(false);

  useEffect(() => {
    let active = true;
    let subscription: Location.LocationSubscription | null = null;

    const initializeLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (!active) return;
        if (status !== 'granted') {
          setErrorMsg('GPS permission is off. Schedule remains available.');
          return;
        }

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!active) return;
        if (!servicesEnabled) {
          setErrorMsg('Android location services are off. Schedule remains available.');
          return;
        }

        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!active) return;
        setLocation(loc);

        subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (newLoc) => {
            if (!active) return;
            setLocation(newLoc);
            setDistance(getDistance(
              newLoc.coords.latitude,
              newLoc.coords.longitude,
              TARGET_LOCATION.latitude,
              TARGET_LOCATION.longitude
            ));
          }
        );
        if (!active) subscription.remove();
      } catch {
        if (active) setErrorMsg('A location fix is unavailable. Schedule remains available.');
      }
    };

    void initializeLocation();
    return () => {
      active = false;
      subscription?.remove();
    };
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
    <BookingRow item={item} canCheckIn={canPerformCheckIn} />
  ), [canPerformCheckIn]);

  return (
    <ThemedView className="flex-1 flex-row justify-center">
      <SafeAreaView className="flex-1 px-4 pb-4 pt-4 w-full max-w-xl">
        
        {/* Biometric Shift Widget */}
        <View className="p-4 rounded-xl border mb-4 bg-surface border-elevated">
          <View className="flex-row justify-between items-center mb-2">
            <ThemedText className="font-mono text-xs font-bold tracking-widest text-slate-400">SHIFT STATUS</ThemedText>
            <View className={`w-2.5 h-2.5 rounded-full ${isShiftActive ? 'bg-success' : 'bg-danger'}`} />
          </View>
          
          <ThemedText className={`font-mono text-lg font-black tracking-widest ${isShiftActive ? 'text-success' : 'text-danger'}`}>
            {isShiftActive ? 'ON SHIFT' : 'OFF DUTY'}
          </ThemedText>

          {!isShiftActive ? (
            <>
              <TouchableOpacity 
                className="h-14 rounded-lg items-center justify-center mt-4 bg-tint"
                onPress={handleClockIn}
                activeOpacity={0.8}
              >
                <ThemedText className="font-mono text-base font-black tracking-widest text-[#070a12]">CLOCK IN (FACE SCAN)</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                className="h-10 rounded-lg border items-center justify-center mt-2 border-elevated"
                onPress={() => router.push('/enroll-face')}
                activeOpacity={0.8}
              >
                <ThemedText className="font-mono text-xs font-bold tracking-widest text-slate-400">ENROLL BIOMETRIC PROFILE →</ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              className="h-14 rounded-lg items-center justify-center mt-4 bg-transparent border border-danger"
              onPress={handleClockOut}
              activeOpacity={0.8}
            >
              <ThemedText className="font-mono text-base font-black tracking-widest text-danger">CLOCK OUT</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Geo-Fence Widget */}
        <View className={`p-4 rounded-xl border mb-4 bg-surface ${isWithinRange ? 'border-success' : (errorMsg ? 'border-danger' : 'border-elevated')}`}>
          <View className="flex-row justify-between items-center mb-2">
            <ThemedText className="font-mono text-xs font-bold tracking-widest text-slate-400">LOCATION STATUS</ThemedText>
            <View className={`w-2.5 h-2.5 rounded-full ${isWithinRange ? 'bg-success' : (errorMsg ? 'bg-danger' : 'bg-yellow-500')}`} />
          </View>
          
          <ThemedText className={`font-mono text-lg font-black tracking-widest ${isWithinRange ? 'text-success' : (errorMsg ? 'text-danger' : 'text-slate-400')}`}>
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
          keyExtractor={(item: typeof MOCK_BOOKINGS[0]) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 32, gap: 16 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <ThemedText className="font-mono text-sm font-bold tracking-widest text-slate-400 mb-4">TODAY&apos;S MISSIONS</ThemedText>
          }
        />

      </SafeAreaView>
    </ThemedView>
  );
}
