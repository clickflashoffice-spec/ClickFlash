import { View, Text, StyleSheet } from 'react-native';

export default function ApprovalsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Pending Approvals: 0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 20 }
});
