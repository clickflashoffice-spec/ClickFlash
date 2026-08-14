import { StyleSheet, Text, TouchableOpacity, Vibration, View } from 'react-native';

interface ScannerFABProps {
  onPress: () => void;
}

export function ScannerFAB({ onPress }: ScannerFABProps) {
  const handlePress = () => {
    Vibration.vibrate(20);
    onPress();
  };

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <TouchableOpacity
        accessibilityLabel="Scan guest wristband"
        accessibilityRole="button"
        activeOpacity={0.8}
        hitSlop={8}
        onPress={handlePress}
        style={styles.fab}
      >
        <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.icon}>
          ⌗
        </Text>
        <Text style={styles.text}>Scan Wristband</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    minHeight: 56,
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    shadowColor: '#3b82f6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  text: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
  },
});
