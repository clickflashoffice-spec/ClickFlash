import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to ClickFlash</Text>
      <Text style={styles.subtitle}>Find your resort memories instantly.</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => router.replace('/selfie')}
      >
        <Text style={styles.buttonText}>Find My Photos (Selfie)</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.button, styles.qrButton]}
        onPress={() => router.push('/qr-scan')}
      >
        <Text style={styles.buttonText}>Scan Kiosk QR Code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827', // Tailwind gray-900
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af', // Tailwind gray-400
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#3b82f6', // Tailwind blue-500
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 999,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  qrButton: {
    backgroundColor: '#f59e0b', // Tailwind amber-500
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});
