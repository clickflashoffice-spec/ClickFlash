import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { syncEngine } from '../lib/syncEngine';

export default function StaffLoginScreen() {
  const handleLogin = () => {
    // In a real app, verify PIN and load these from SecureStore
    syncEngine.setConfig({
      deskId: 'test-desk-123',
      masterLanIp: '192.168.1.50',
      masterLanPort: 8090,
      cloudApiUrl: 'https://management.clickflash.app',
      jwtToken: 'mock-jwt-token',
    });
    
    router.replace('/scanner');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ClickFlash Staff</Text>
      <TouchableOpacity 
        style={styles.button}
        onPress={handleLogin}
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
    backgroundColor: '#111827', // Tailwind gray-900
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#3b82f6', // Tailwind blue-500
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 999,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  }
});

