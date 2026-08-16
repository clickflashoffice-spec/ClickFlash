import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { startBroadcasting } from '../lib/bleBroadcaster';

export default function RootLayout() {
  useEffect(() => {
    // Starting BLE broadcast with dummy auth data
    // In a production app, this would use the real authenticated user state
    startBroadcasting('dummy-user-id', 'dummy-session-token');
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="selfie" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
