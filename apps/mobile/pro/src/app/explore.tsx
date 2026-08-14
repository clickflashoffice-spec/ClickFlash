import { Platform, StyleSheet, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

// Lazy import MapView because it's not supported on web out of the box
let MapView: any;
let Circle: any;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Circle = Maps.Circle;
}

export default function HotspotsMapScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  if (Platform.OS === 'web') {
    return (
      <ThemedView style={styles.webFallbackContainer}>
        <ThemedText type="subtitle">AI Hotspots Map</ThemedText>
        <ThemedText style={{ marginTop: 16 }}>
          Interactive maps are currently optimized for native (iOS/Android).
          Please run in the simulator or on a physical device.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      {location ? (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
        >
          {/* Mock Glowing Zone from AI Hotspot predictions */}
          <Circle
            center={{
              latitude: location.coords.latitude + 0.005,
              longitude: location.coords.longitude + 0.005,
            }}
            radius={300}
            fillColor="rgba(255, 0, 0, 0.3)"
            strokeColor="rgba(255, 0, 0, 0.8)"
          />
        </MapView>
      ) : (
        <ThemedView style={styles.webFallbackContainer}>
          <ThemedText>Acquiring Location...</ThemedText>
        </ThemedView>
      )}
      
      <ThemedView style={[styles.overlay, { top: safeAreaInsets.top + 16 }]}>
        <ThemedText type="defaultSemiBold">🔥 AI Hotspot Radar</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">Red zones indicate high conversion probability.</ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  webFallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  overlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  }
});
