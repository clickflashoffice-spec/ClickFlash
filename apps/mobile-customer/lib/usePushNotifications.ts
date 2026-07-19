import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logger } from '@clickflash/logger';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      logger.warn('Failed to get push token for push notification!');
      return;
    }
    // Learn more about projectId: https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
      logger.info('Got Expo Push Token:', { args: [token] });
    } catch (e) {
      logger.error('Error getting Expo Push Token:', { args: [e] });
    }
  } else {
    logger.info('Must use physical device for Push Notifications');
  }

  return token;
}

export async function sendPushTokenToBackend(sessionId: string, pushToken: string) {
  try {
    const response = await fetch('https://hub.clickflash.app/api/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        pushToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save push token: ${response.status}`);
    }

    logger.info('Push token saved to backend');
  } catch (error) {
    logger.error('Error saving push token to backend', { args: [error] });
  }
}
