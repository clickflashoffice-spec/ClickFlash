import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { ConnectionStatusBar } from '@/components/ui/ConnectionStatusBar';
import { registerBackgroundSyncAsync } from '@/backend/syncTask';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    registerBackgroundSyncAsync();
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'light' ? DefaultTheme : DarkTheme}>
      <AnimatedSplashOverlay />
      <View style={{ flex: 1 }}>
        <ConnectionStatusBar />
        <AppTabs />
      </View>
    </ThemeProvider>
  );
}
