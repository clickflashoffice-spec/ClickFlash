import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function StaffLoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff Portal</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.replace('/(tabs)/kiosks')}
      >
        <Text style={styles.buttonText}>Authenticate (PIN)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#34C759',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
