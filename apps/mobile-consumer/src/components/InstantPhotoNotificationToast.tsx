import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Animated } from 'react-native';

export interface InstantPhotoNotification {
  id: string;
  photoUrl: string;
  locationName: string;
  photographerName: string;
  timestamp: string;
}

interface InstantPhotoNotificationToastProps {
  notification: InstantPhotoNotification | null;
  onPress: (notification: InstantPhotoNotification) => void;
  onDismiss: () => void;
}

export function InstantPhotoNotificationToast({
  notification,
  onPress,
  onDismiss,
}: InstantPhotoNotificationToastProps) {
  const [slideAnim] = useState(new Animated.Value(-120));

  useEffect(() => {
    if (notification) {
      Animated.spring(slideAnim, {
        toValue: 50,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();

      const timer = setTimeout(() => {
        dismiss();
      }, 7000);

      return () => clearTimeout(timer);
    }
  }, [notification]);

  const dismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onDismiss();
    });
  };

  if (!notification) return null;

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => onPress(notification)}
        style={styles.card}
      >
        <Image source={{ uri: notification.photoUrl }} style={styles.thumbnail} />
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.badgeText}>✨ NEW PHOTO READY</Text>
            <Text style={styles.timeText}>Just now</Text>
          </View>
          <Text style={styles.titleText}>Taken at {notification.locationName}</Text>
          <Text style={styles.subtitleText}>By {notification.photographerName} • Tap to view</Text>
        </View>
        <TouchableOpacity onPress={dismiss} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(24, 24, 27, 0.95)',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#06b6d4',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 10,
    color: '#71717a',
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  subtitleText: {
    fontSize: 12,
    color: '#a1a1aa',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  closeText: {
    color: '#71717a',
    fontSize: 14,
    fontWeight: '700',
  },
});
