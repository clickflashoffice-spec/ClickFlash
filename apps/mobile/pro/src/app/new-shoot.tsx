import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';

export default function NewShootScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const handleRegisterShoot = async () => {
    if (!name) {
      Alert.alert('Error', 'Guest name is required.');
      return;
    }
    
    setIsLinking(true);
    
    try {
        const { RustCore } = require('../../modules/clickflash-rust-core');
        // Use an Expo FileSystem path in a real device, mock for demo
        const dbPath = "/data/data/com.clickflash.mobilepro/databases/offline.db";
        const result = RustCore.saveBooking({ dbPath, name, whatsapp, email });
        console.log("Rust Core Result:", result);
        
        setIsLinking(false);
        Alert.alert('Success', 'Shoot Registered Offline. Sync will occur automatically.');
        router.back();
    } catch (e) {
        setIsLinking(false);
        Alert.alert('Error', 'Failed to save via Rust Core.');
    }
  };

  return (
    <ScrollView className="flex-1 bg-black p-4">
      <Text className="text-white text-3xl font-bold mb-6 mt-12">New Shoot</Text>
      
      <View className="bg-neutral-900 rounded-xl p-4 mb-4">
        <Text className="text-gray-400 mb-2">Guest Name *</Text>
        <TextInput 
          value={name}
          onChangeText={setName}
          className="bg-neutral-800 text-white p-4 rounded-lg text-lg"
          placeholder="e.g. John Doe"
          placeholderTextColor="#666"
        />
      </View>

      <View className="bg-neutral-900 rounded-xl p-4 mb-4">
        <Text className="text-gray-400 mb-2">WhatsApp Number</Text>
        <TextInput 
          value={whatsapp}
          onChangeText={setWhatsapp}
          className="bg-neutral-800 text-white p-4 rounded-lg text-lg"
          placeholder="+1 234 567 8900"
          placeholderTextColor="#666"
          keyboardType="phone-pad"
        />
        <Text className="text-xs text-gray-500 mt-2">Required for AI Magic Link delivery</Text>
      </View>

      <View className="bg-neutral-900 rounded-xl p-4 mb-8">
        <Text className="text-gray-400 mb-2">Email Address</Text>
        <TextInput 
          value={email}
          onChangeText={setEmail}
          className="bg-neutral-800 text-white p-4 rounded-lg text-lg"
          placeholder="john@example.com"
          placeholderTextColor="#666"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity 
        onPress={handleRegisterShoot}
        disabled={isLinking}
        className={`p-5 rounded-xl flex-row justify-center items-center ${isLinking ? 'bg-blue-800' : 'bg-blue-600'}`}
      >
        <Text className="text-white text-xl font-bold">
          {isLinking ? 'Securing Link...' : 'Start Shoot & Link Device'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
