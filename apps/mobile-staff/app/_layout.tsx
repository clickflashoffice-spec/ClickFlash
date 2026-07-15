import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { initDb } from '../db/database';

export default function RootLayout() {
  useEffect(() => {
    initDb();
  }, []);

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="scanner" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
