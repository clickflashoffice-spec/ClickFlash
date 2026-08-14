import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function KiosksScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText>Fleet Health</ThemedText>
    </ThemedView>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center' } });
