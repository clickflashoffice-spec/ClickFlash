import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen 
        name="kiosks" 
        options={{ 
          title: 'Kiosk Monitor',
          tabBarLabel: 'Kiosks'
        }} 
      />
      <Tabs.Screen 
        name="approvals" 
        options={{ 
          title: 'Print Approvals',
          tabBarLabel: 'Approvals'
        }} 
      />
    </Tabs>
  );
}
