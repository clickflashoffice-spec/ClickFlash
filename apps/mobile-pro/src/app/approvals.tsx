import { StyleSheet, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function ApprovalsScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText>Moderation Queue</ThemedText>
    </ThemedView>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, justifyContent: 'center', alignItems: 'center' } });
