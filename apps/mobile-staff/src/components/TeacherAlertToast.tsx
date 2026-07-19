import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface Props {
  message: string;
  isVisible: boolean;
  onHide: () => void;
}

export const TeacherAlertToast: React.FC<Props> = ({ message, isVisible, onHide }) => {
  const translateY = React.useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (isVisible) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Animated.spring(translateY, {
        toValue: 20,
        useNativeDriver: true,
        bounciness: 12,
      }).start();

      // Auto hide after 4 seconds
      const timer = setTimeout(() => {
        hideToast();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      hideToast();
    }
  }, [isVisible]);

  const hideToast = () => {
    Animated.timing(translateY, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onHide());
  };

  if (!isVisible && (translateY as any)._value === -100) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="warning" size={24} color="#fff" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>AI Teacher Alert</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    flexDirection: 'row',
    padding: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 100,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  message: {
    color: '#fca5a5',
    fontSize: 14,
  }
});
